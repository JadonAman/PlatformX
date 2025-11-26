/**
 * appForwarder middleware
 * Forwards requests to loaded app routers
 */

async function appForwarder(req, res, next) {
    if (!req.appRouter) {
        return next();
    }

    try {
        // Forward request to the app's router
        req.appRouter(req, res, (err) => {
            if (err) {
                console.error(`[AppForwarder] Error in app ${req.appName}:`, err);
                
                // Check if headers were already sent
                if (!res.headersSent) {
                    return res.status(500).json({ 
                        error: 'Application error',
                        appName: req.appName,
                        details: process.env.NODE_ENV === 'development' ? err.message : undefined
                    });
                }
            } else {
                // If the app didn't handle the route, pass to next middleware
                next();
            }
        });
    } catch (err) {
        console.error(`[AppForwarder] Critical error forwarding to ${req.appName}:`, err);
        
        if (!res.headersSent) {
            return res.status(500).json({ 
                error: 'Application router error',
                appName: req.appName
            });
        }
    }
}

module.exports = {
    appForwarder,
};
