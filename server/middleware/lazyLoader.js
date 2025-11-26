const path = require('path');
const fs = require('fs');
const fileWatcher = require('./fileWatcher');
const EnvManager = require('../utils/envManager');
const MongoDBManager = require('../utils/mongodbManager');
const Logger = require('../utils/logger');
const StaticServer = require('./staticServer');

const appCache = new Map();

/**
 * Forbidden patterns that indicate standalone server usage
 */
const FORBIDDEN_PATTERNS = [
    /\b(app|server|express)\s*\.\s*listen\s*\(/i,  // Any .listen() call
    /http\.createServer/,                           // http.createServer
    /https\.createServer/,                          // https.createServer
];

/**
 * Validate app code for forbidden patterns
 * @param {string} filePath - Path to server.js
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateAppCode(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        
        // Simple approach: remove comments only, check directly for patterns
        // .listen() is unlikely to appear in normal strings
        let cleanCode = code
            .replace(/\/\*[\s\S]*?\*\//g, ' ')  // Remove multi-line comments
            .replace(/\/\/.*$/gm, '');           // Remove single-line comments
        
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(cleanCode)) {
                return {
                    valid: false,
                    error: `Forbidden: Apps must not call .listen() or create HTTP servers. Export the Express app without calling .listen(). PlatformX will handle the server lifecycle.`
                };
            }
        }
        
        return { valid: true, error: null };
    } catch (err) {
        return {
            valid: false,
            error: `Failed to read app code: ${err.message}`
        };
    }
}

/**
 * Clear require cache for an app (useful for hot reload)
 * @param {string} appServerPath 
 */
function clearAppCache(appServerPath) {
    delete require.cache[require.resolve(appServerPath)];
}

/**
 * Lazy loader middleware
 * Loads app routers on-demand and caches them
 */
async function lazyLoader(req, res, next) {
    if (!req.appName) {
        return next();
    }

    let cached = appCache.get(req.appName);

    if (!cached) {
        try {
            // Get app metadata to find the entry file and app type
            const App = require('../models/App');
            const appMetadata = await App.findBySlug(req.appName);
            
            if (!appMetadata) {
                return res.status(404).json({ 
                    error: 'App not found',
                    appName: req.appName 
                });
            }

            const appType = appMetadata.appType || 'backend';
            const entryFile = appMetadata.entryFile || 'server.js';
            const buildDir = appMetadata.buildDir;
            const proxyConfig = appMetadata.proxyConfig ? Object.fromEntries(appMetadata.proxyConfig) : null;

            console.log(`[LazyLoader] Loading ${appType} app: ${req.appName}`);

            let router;
            let appEnv = {};

            // Handle based on app type
            if (appType === 'frontend') {
                // Frontend-only app - serve static files
                const detectedBuildDir = buildDir || StaticServer.detectBuildDir(req.appPath);
                
                if (!detectedBuildDir) {
                    return res.status(500).json({ 
                        error: 'Frontend build not found. Please build your app (npm run build) and ensure dist/build folder exists.',
                        appName: req.appName 
                    });
                }

                console.log(`[LazyLoader] Serving frontend from: ${detectedBuildDir}`);
                router = StaticServer.createServer(req.appPath, detectedBuildDir, proxyConfig);
                
            } else if (appType === 'backend' || appType === 'fullstack') {
                // Backend or fullstack app - load Express router
                const appServerPath = path.join(req.appPath, entryFile);
                
                // Check if entry file exists
                if (!fs.existsSync(appServerPath)) {
                    return res.status(500).json({ 
                        error: `App configuration error: ${entryFile} not found`,
                        appName: req.appName 
                    });
                }

                // Validate app code for forbidden patterns (only for backend)
                const validation = validateAppCode(appServerPath);
                if (!validation.valid) {
                    console.error(`[LazyLoader] Validation failed for ${req.appName}: ${validation.error}`);
                    await Logger.log(req.appName, 'error', `Validation failed: ${validation.error}`);
                    return res.status(403).json({ 
                        error: validation.error,
                        appName: req.appName
                    });
                }

                // Load per-app environment variables
                appEnv = EnvManager.loadEnvSync(req.appName);
                console.log(`[LazyLoader] Loaded ${Object.keys(appEnv).length} env variables for ${req.appName}`);

                // Load the app module
                const appModule = require(appServerPath);

                // Support both direct export and function export
                if (typeof appModule === 'function') {
                    // Check if it's an Express app (has .use, .get, .post, etc.)
                    if (appModule.use && appModule.get && appModule.post) {
                        // It's an Express app directly exported
                        router = appModule;
                    } else {
                        // It's a factory function - execute it to get the router
                        router = appModule();
                        
                        // Validate router
                        if (!router || typeof router !== 'function') {
                            return res.status(500).json({ 
                                error: 'App function must return a valid Express router or app',
                                appName: req.appName
                            });
                        }
                    }
                } else {
                    return res.status(500).json({ 
                        error: 'App must export an Express app or a function that returns an Express app',
                        appName: req.appName,
                        hint: 'Use: module.exports = app; or module.exports = () => app;'
                    });
                }

                // Fix view engine paths for the app
                if (router.set && router.get) {
                    const viewEngine = router.get('view engine');
                    
                    // If the app uses a view engine (ejs, pug, etc.), ensure views path is correct
                    if (viewEngine) {
                        const currentViews = router.get('views');
                        const viewsPath = path.join(req.appPath, 'views');
                        
                        // Always set to app's views directory to override default cwd behavior
                        router.set('views', viewsPath);
                        console.log(`[LazyLoader] Set views path to: ${viewsPath} (was: ${currentViews})`);
                    }
                }
            } else {
                return res.status(500).json({ 
                    error: `Unsupported app type: ${appType}`,
                    appName: req.appName 
                });
            }

            // Cache the router with metadata
            cached = {
                router,
                loadedAt: Date.now(),
                lastUsed: Date.now(),
                requestCount: 0,
                appEnv,  // Store environment variables
                appType  // Store app type
            };

            appCache.set(req.appName, cached);
            console.log(`[LazyLoader] ✅ Loaded ${appType} app: ${req.appName}`);
            await Logger.log(req.appName, 'load', `${appType} app loaded into memory`, { 
                appType,
                envVarsCount: Object.keys(appEnv).length 
            });

            // Start watching for file changes (hot reload in development)
            if (process.env.NODE_ENV === 'development') {
                fileWatcher.watchApp(req.appName, unloadApp);
            }

        } catch (err) {
            console.error(`[LazyLoader] Error loading ${req.appName}:`, err);
            await Logger.log(req.appName, 'error', `Failed to load: ${err.message}`);
            return res.status(500).json({ 
                error: 'Failed to load app',
                appName: req.appName,
                details: process.env.NODE_ENV === 'development' ? err.message : undefined
            });
        }
    }

    // Update usage statistics
    cached.lastUsed = Date.now();
    cached.requestCount++;
    
    // Attach router to request
    req.appRouter = cached.router;
    
    // Attach per-app environment variables (read-only)
    req.appEnv = { ...cached.appEnv };  // Clone to prevent mutation
    
    // Attach per-app MongoDB database
    const appDb = MongoDBManager.getAppDatabase(req.appName);
    if (appDb) {
        req.db = appDb;
    } else {
        console.warn(`[LazyLoader] MongoDB not available for ${req.appName}`);
    }

    next();
}

/**
 * Get all cached apps info
 * @returns {Array}
 */
function getCachedApps() {
    const apps = [];
    for (const [appName, data] of appCache.entries()) {
        apps.push({
            appName,
            loadedAt: new Date(data.loadedAt).toISOString(),
            lastUsed: new Date(data.lastUsed).toISOString(),
            requestCount: data.requestCount,
            idleTime: Date.now() - data.lastUsed
        });
    }
    return apps;
}

/**
 * Unload an app from cache
 * @param {string} appName 
 * @returns {boolean}
 */
function unloadApp(appName) {
    if (appCache.has(appName)) {
        const appPath = path.join(__dirname, '../apps', appName, 'server.js');
        try {
            clearAppCache(appPath);
            
            // Also clear all related modules in require cache
            const appDir = path.join(__dirname, '../apps', appName);
            Object.keys(require.cache).forEach(key => {
                if (key.startsWith(appDir)) {
                    delete require.cache[key];
                }
            });
        } catch (err) {
            console.error(`[LazyLoader] Error clearing cache for ${appName}:`, err.message);
        }
        appCache.delete(appName);
        
        // Stop watching this app
        fileWatcher.unwatchApp(appName);
        
        console.log(`[LazyLoader] 🗑️ Unloaded app: ${appName}`);
        Logger.log(appName, 'unload', 'App unloaded from memory').catch(err => {
            console.error('[LazyLoader] Failed to log unload event:', err);
        });
        return true;
    }
    return false;
}

/**
 * Unload idle apps (apps not used for X milliseconds)
 * @param {number} idleThreshold - Milliseconds of inactivity before unload
 * @returns {Array} - Array of unloaded app names
 */
function unloadIdleApps(idleThreshold = 15 * 60 * 1000) { // Default: 15 minutes
    const now = Date.now();
    const unloaded = [];
    
    for (const [appName, data] of appCache.entries()) {
        if (now - data.lastUsed > idleThreshold) {
            if (unloadApp(appName)) {
                unloaded.push(appName);
            }
        }
    }
    
    if (unloaded.length > 0) {
        console.log(`[LazyLoader] 🧹 Auto-unloaded ${unloaded.length} idle apps:`, unloaded);
    }
    
    return unloaded;
}

module.exports = {
    lazyLoader,
    getCachedApps,
    unloadApp,
    unloadIdleApps,
    validateAppCode
};
