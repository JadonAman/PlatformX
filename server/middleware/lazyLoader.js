const path = require('path');

const appCache = new Map();

async function lazyLoader(req, res, next) {
    if (!req.appName) {
        return next();
    }

    let cached = appCache.get(req.appName);

    if (!cached) {
        try {
            const appServerPath = path.join(req.appPath, 'server.js');
            const appServer = require(appServerPath);

            if (typeof appServer !== 'function') {
                return res.status(500).json({ error: 'App server.js must export a function returning a router' });
            }

            const router = appServer();

            cached = {
                router,
                lastUsed: Date.now(),
            };

            appCache.set(req.appName, cached);

        } catch (err) {
            return res.status(500).json({ error: 'Error loading app' });
        }
    }

    cached.lastUsed = Date.now();
    req.appRouter = cached.router;

    next();
}

module.exports = {
    lazyLoader,
};
