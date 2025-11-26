const path = require('path');
const fs = require('fs');
const fileWatcher = require('./fileWatcher');

const appCache = new Map();

/**
 * Forbidden patterns that indicate standalone server usage
 */
const FORBIDDEN_PATTERNS = [
    /\.listen\s*\(/,                    // app.listen(
    /http\.createServer/,                // http.createServer
    /https\.createServer/,               // https.createServer
];

/**
 * Validate app code for forbidden patterns
 * @param {string} filePath - Path to server.js
 * @returns {Object} - { valid: boolean, error: string|null }
 */
function validateAppCode(filePath) {
    try {
        const code = fs.readFileSync(filePath, 'utf8');
        
        // Remove comments before checking
        // Remove single-line comments
        let cleanCode = code.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        cleanCode = cleanCode.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove strings (to avoid matching text in strings)
        cleanCode = cleanCode.replace(/'[^']*'/g, "''");
        cleanCode = cleanCode.replace(/"[^"]*"/g, '""');
        cleanCode = cleanCode.replace(/`[^`]*`/g, '``');
        
        for (const pattern of FORBIDDEN_PATTERNS) {
            if (pattern.test(cleanCode)) {
                return {
                    valid: false,
                    error: `Forbidden: Standalone Node servers are not allowed. Remove app.listen(), http.createServer, or similar patterns. Apps must export a router or Express app without calling listen().`
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
            const appServerPath = path.join(req.appPath, 'server.js');
            
            // Check if server.js exists
            if (!fs.existsSync(appServerPath)) {
                return res.status(500).json({ 
                    error: 'App configuration error: server.js not found',
                    appName: req.appName 
                });
            }

            // Validate app code for forbidden patterns
            const validation = validateAppCode(appServerPath);
            if (!validation.valid) {
                console.error(`[LazyLoader] Validation failed for ${req.appName}: ${validation.error}`);
                return res.status(403).json({ 
                    error: validation.error,
                    appName: req.appName
                });
            }

            // Load the app module
            const appModule = require(appServerPath);

            // Validate export type
            if (typeof appModule !== 'function') {
                return res.status(500).json({ 
                    error: 'App server.js must export a function that returns an Express router or app',
                    appName: req.appName
                });
            }

            // Execute the function to get the router
            const router = appModule();

            // Validate router
            if (!router || typeof router !== 'function') {
                return res.status(500).json({ 
                    error: 'App function must return a valid Express router or app',
                    appName: req.appName
                });
            }

            // Cache the router with metadata
            cached = {
                router,
                loadedAt: Date.now(),
                lastUsed: Date.now(),
                requestCount: 0
            };

            appCache.set(req.appName, cached);
            console.log(`[LazyLoader] ✅ Loaded app: ${req.appName}`);

            // Start watching for file changes (hot reload in development)
            if (process.env.NODE_ENV === 'development') {
                fileWatcher.watchApp(req.appName, unloadApp);
            }

        } catch (err) {
            console.error(`[LazyLoader] Error loading ${req.appName}:`, err);
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
        } catch (err) {
            // Ignore errors
        }
        appCache.delete(appName);
        
        // Stop watching this app
        fileWatcher.unwatchApp(appName);
        
        console.log(`[LazyLoader] 🗑️ Unloaded app: ${appName}`);
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
