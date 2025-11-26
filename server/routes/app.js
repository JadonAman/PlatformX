/**
 * Platform API Routes
 * Admin endpoints for managing PlatformX
 */

const express = require('express');
const router = express.Router();
const { listApps, getAppInfo } = require('../utils/appResolver');
const { getCachedApps, unloadApp, unloadIdleApps } = require('../middleware/lazyLoader');

// GET /api - Platform info
router.get('/', (req, res) => {
    res.json({
        platform: 'PlatformX',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
        endpoints: [
            'GET /api',
            'GET /api/apps',
            'GET /api/apps/:appName',
            'GET /api/apps/cached',
            'POST /api/apps/:appName/unload',
            'POST /api/apps/unload-idle',
            'GET /api/health'
        ]
    });
});

// GET /api/apps - List all available apps
router.get('/apps', (req, res) => {
    try {
        const apps = listApps();
        res.json({
            success: true,
            count: apps.length,
            apps: apps
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to list apps',
            details: err.message
        });
    }
});

// GET /api/apps/cached - Get currently loaded apps
router.get('/apps/cached', (req, res) => {
    try {
        const cachedApps = getCachedApps();
        res.json({
            success: true,
            count: cachedApps.length,
            apps: cachedApps
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to get cached apps',
            details: err.message
        });
    }
});

// GET /api/apps/:appName - Get detailed info about an app
router.get('/apps/:appName', (req, res) => {
    try {
        const { appName } = req.params;
        const info = getAppInfo(appName);
        
        if (!info) {
            return res.status(404).json({
                success: false,
                error: 'App not found'
            });
        }
        
        // Check if app is cached
        const cachedApps = getCachedApps();
        const cached = cachedApps.find(app => app.appName === appName);
        
        res.json({
            success: true,
            app: {
                ...info,
                isLoaded: !!cached,
                ...(cached && {
                    loadedAt: cached.loadedAt,
                    lastUsed: cached.lastUsed,
                    requestCount: cached.requestCount,
                    idleTime: cached.idleTime
                })
            }
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to get app info',
            details: err.message
        });
    }
});

// POST /api/apps/:appName/unload - Manually unload an app from cache
router.post('/apps/:appName/unload', (req, res) => {
    try {
        const { appName } = req.params;
        const success = unloadApp(appName);
        
        if (success) {
            res.json({
                success: true,
                message: `App '${appName}' unloaded successfully`
            });
        } else {
            res.status(404).json({
                success: false,
                error: `App '${appName}' is not currently loaded`
            });
        }
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to unload app',
            details: err.message
        });
    }
});

// POST /api/apps/unload-idle - Unload all idle apps
router.post('/apps/unload-idle', (req, res) => {
    try {
        const { idleThreshold } = req.body || {};
        const threshold = idleThreshold || 15 * 60 * 1000; // Default: 15 minutes
        
        const unloadedApps = unloadIdleApps(threshold);
        
        res.json({
            success: true,
            message: `Unloaded ${unloadedApps.length} idle apps`,
            unloaded: unloadedApps.length,
            apps: unloadedApps,
            threshold: threshold
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: 'Failed to unload idle apps',
            details: err.message
        });
    }
});

// GET /api/health - Health check
router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

module.exports = router;