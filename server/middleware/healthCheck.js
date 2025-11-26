const mongoose = require('mongoose');
const MongoDBManager = require('../utils/mongodbManager');
const Logger = require('../utils/logger');

/**
 * Health check endpoint
 * Returns system health status
 */
async function healthCheck(req, res) {
  const startTime = Date.now();
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: require('../package.json').version || '1.0.0',
    checks: {}
  };

  try {
    // Check MongoDB (Mongoose)
    health.checks.mongoose = {
      status: mongoose.connection.readyState === 1 ? 'healthy' : 'unhealthy',
      readyState: mongoose.connection.readyState,
      message: getMongooseStateMessage(mongoose.connection.readyState)
    };

    // Check MongoDB Manager (for app databases)
    try {
      const mongoManager = await MongoDBManager.getClient();
      if (mongoManager) {
        await mongoManager.db('admin').command({ ping: 1 });
        health.checks.mongodbManager = {
          status: 'healthy',
          message: 'Connected'
        };
      } else {
        health.checks.mongodbManager = {
          status: 'unhealthy',
          message: 'Not connected'
        };
      }
    } catch (error) {
      health.checks.mongodbManager = {
        status: 'unhealthy',
        message: error.message
      };
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memThreshold = 500 * 1024 * 1024; // 500MB threshold
    health.checks.memory = {
      status: memUsage.heapUsed < memThreshold ? 'healthy' : 'warning',
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`
    };

    // Check disk space (if possible)
    // Note: This would require additional package like 'diskusage'
    // For now, we'll skip this check

    // Overall status determination
    const allHealthy = Object.values(health.checks).every(
      check => check.status === 'healthy'
    );
    const anyWarning = Object.values(health.checks).some(
      check => check.status === 'warning'
    );

    if (!allHealthy) {
      health.status = 'unhealthy';
    } else if (anyWarning) {
      health.status = 'warning';
    }

    // Add response time
    health.responseTime = `${Date.now() - startTime}ms`;

    // Log health check
    if (health.status !== 'healthy') {
      Logger.platform.warn('Health check failed', health);
    }

    // Return appropriate status code
    const statusCode = health.status === 'healthy' ? 200 : 
                       health.status === 'warning' ? 200 : 503;

    return res.status(statusCode).json(health);

  } catch (error) {
    Logger.platform.error('Health check error:', error);
    
    return res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message,
      responseTime: `${Date.now() - startTime}ms`
    });
  }
}

/**
 * Get human-readable message for Mongoose connection state
 */
function getMongooseStateMessage(state) {
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  return states[state] || 'Unknown';
}

/**
 * Liveness probe - simple check that the server is running
 */
function liveness(req, res) {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
}

/**
 * Readiness probe - checks if the server is ready to accept traffic
 */
async function readiness(req, res) {
  try {
    // Check critical dependencies
    const mongooseReady = mongoose.connection.readyState === 1;

    if (!mongooseReady) {
      return res.status(503).json({
        status: 'not ready',
        reason: 'Database not connected',
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return res.status(503).json({
      status: 'not ready',
      reason: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  healthCheck,
  liveness,
  readiness
};
