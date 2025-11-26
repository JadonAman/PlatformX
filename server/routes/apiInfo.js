const express = require('express');
const router = express.Router();
const apiDocs = require('../utils/apiDocs');

/**
 * API Documentation Route
 * Serves the complete API documentation
 */

// Get full API documentation
router.get('/docs', (req, res) => {
  res.json(apiDocs);
});

// Get API version
router.get('/version', (req, res) => {
  const packageJson = require('../package.json');
  res.json({
    version: packageJson.version || '1.0.0',
    name: packageJson.name || 'PlatformX',
    node: process.version,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Get API status
router.get('/status', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
      total: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`
    }
  });
});

module.exports = router;
