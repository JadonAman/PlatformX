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
 * 
 * PLATFORMX FEATURES AVAILABLE:
 * - req.appEnv: Per-app environment variables from .env file
 * - req.db: Per-app MongoDB database instance
 * - req.appName: Current app name
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

  // Middleware to demonstrate accessing PlatformX features
  router.use((req, res, next) => {
    // Log app name (available in all routes)
    console.log(`[${req.appName}] ${req.method} ${req.path}`);
    
    // Environment variables are available via req.appEnv
    // Example: const apiKey = req.appEnv.API_KEY;
    
    // MongoDB database is available via req.db
    // Example: const users = await req.db.collection('users').find().toArray();
    
    next();
  });

  // API endpoint to demonstrate environment variables
  router.get('/api/env', (req, res) => {
    res.json({
      appName: req.appName,
      hasEnvVars: Object.keys(req.appEnv || {}).length > 0,
      envKeys: Object.keys(req.appEnv || []),
      // Never expose actual values in production!
      message: 'Environment variables are loaded. Use req.appEnv to access them.'
    });
  });

  // API endpoint to demonstrate MongoDB database
  router.get('/api/db-info', async (req, res) => {
    try {
      if (!req.db) {
        return res.json({
          error: 'Database not available',
          message: 'MongoDB Manager may not be initialized'
        });
      }

      const collections = await req.db.listCollections().toArray();
      const dbStats = await req.db.stats();

      res.json({
        appName: req.appName,
        database: req.db.databaseName,
        collections: collections.map(c => c.name),
        stats: {
          dataSize: dbStats.dataSize,
          storageSize: dbStats.storageSize,
          indexes: dbStats.indexes,
          objects: dbStats.objects
        }
      });
    } catch (error) {
      res.status(500).json({
        error: 'Database error',
        message: error.message
      });
    }
  });

  // Example API endpoint using MongoDB
  router.post('/api/data', async (req, res) => {
    try {
      if (!req.db) {
        return res.status(503).json({
          error: 'Database not available'
        });
      }

      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({
          error: 'Data is required'
        });
      }

      // Insert into collection
      const result = await req.db.collection('example_data').insertOne({
        data,
        createdAt: new Date()
      });

      res.json({
        success: true,
        insertedId: result.insertedId,
        message: 'Data saved successfully'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to save data',
        message: error.message
      });
    }
  });

  // Mount your routes
  router.use('/', indexRoutes);

  // 404 handler for this app
  router.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      path: req.path,
      appName: req.appName
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
