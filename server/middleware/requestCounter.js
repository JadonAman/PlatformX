const App = require('../models/App');

/**
 * Request Counter Middleware
 * Tracks request count for each app in MongoDB
 * 
 * This middleware should be placed AFTER appForwarder in the middleware chain
 * to ensure req.appName is set by platformRouter
 */
async function requestCounter(req, res, next) {
  // Only track if this is an app request (not platform API)
  if (!req.appName) {
    return next();
  }

  // Increment request count asynchronously (don't block response)
  setImmediate(async () => {
    try {
      const app = await App.findBySlug(req.appName);
      if (app) {
        app.requestCount += 1;
        await app.save();
      }
    } catch (error) {
      // Log error but don't affect the request
      console.error(`[REQUEST_COUNTER] Error updating count for ${req.appName}:`, error.message);
    }
  });

  next();
}

module.exports = requestCounter;
