/**
 * Template App - server.js
 * 
 * This is a PlatformX-compatible app entry file.
 * 
 * IMPORTANT RULES:
 * 1. DO NOT call app.listen() - PlatformX handles this
 * 2. DO NOT use http.createServer() - PlatformX handles this
 * 3. Export a function that returns an Express router or Express app
 * 4. Your app will be mounted under: <appname>.platformx.localhost
 */

const express = require('express');
const path = require('path');

// Import your routes
const indexRoutes = require('./routes/index');

/**
 * Create and configure the app router
 * This function is called by PlatformX when your app is loaded
 */
function createApp() {
  const router = express.Router();

  // Middleware for this app only
  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));

  // Serve static files from public folder
  router.use('/static', express.static(path.join(__dirname, 'public')));

  // Mount your routes
  router.use('/', indexRoutes);

  // 404 handler for this app
  router.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path
    });
  });

  // Error handler for this app
  router.use((err, req, res, next) => {
    console.error('App error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  return router;
}

// Export the function (NOT the result of calling it)
module.exports = createApp;
