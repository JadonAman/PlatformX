const Logger = require('../utils/logger');
const mongoose = require('mongoose');
const MongoDBManager = require('../utils/mongodbManager');
const CleanupService = require('../utils/cleanupService');
const metricsCollector = require('../middleware/metricsCollector');

/**
 * Graceful Shutdown Handler
 * Handles SIGTERM, SIGINT signals properly
 */
class GracefulShutdown {
  constructor(server) {
    this.server = server;
    this.isShuttingDown = false;
    this.shutdownTimeout = 30000; // 30 seconds max shutdown time
  }

  /**
   * Initialize shutdown handlers
   */
  init() {
    // Handle SIGTERM (Docker, Kubernetes, etc.)
    process.on('SIGTERM', () => {
      Logger.platform.info('SIGTERM signal received: closing HTTP server');
      this.shutdown('SIGTERM');
    });

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      Logger.platform.info('SIGINT signal received: closing HTTP server');
      this.shutdown('SIGINT');
    });

    // Handle process exit
    process.on('exit', (code) => {
      Logger.platform.info(`Process exiting with code: ${code}`);
    });
  }

  /**
   * Perform graceful shutdown
   */
  async shutdown(signal) {
    if (this.isShuttingDown) {
      Logger.platform.warn('Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    Logger.platform.info(`Starting graceful shutdown (signal: ${signal})`);

    // Set a maximum shutdown time
    const forceShutdownTimer = setTimeout(() => {
      Logger.platform.error('Graceful shutdown timeout - forcing exit');
      process.exit(1);
    }, this.shutdownTimeout);

    try {
      // Step 1: Stop accepting new requests
      Logger.platform.info('Step 1: Stopping new connections...');
      await this.closeServer();

      // Step 2: Stop cleanup service
      Logger.platform.info('Step 2: Stopping cleanup service...');
      CleanupService.stop();

      // Step 3: Cleanup metrics collector
      Logger.platform.info('Step 3: Cleaning up metrics collector...');
      metricsCollector.cleanup();

      // Step 4: Close MongoDB Manager connections
      Logger.platform.info('Step 4: Closing MongoDB Manager...');
      await MongoDBManager.disconnect();

      // Step 5: Close Mongoose connection
      Logger.platform.info('Step 5: Closing Mongoose connection...');
      await mongoose.connection.close();

      // Step 6: Final log
      Logger.platform.info('Graceful shutdown completed successfully');

      // Clear the force shutdown timer
      clearTimeout(forceShutdownTimer);

      // Exit process
      process.exit(0);

    } catch (error) {
      Logger.platform.error('Error during graceful shutdown:', error);
      clearTimeout(forceShutdownTimer);
      process.exit(1);
    }
  }

  /**
   * Close HTTP server and wait for existing connections to finish
   */
  closeServer() {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        return resolve();
      }

      this.server.close((err) => {
        if (err) {
          Logger.platform.error('Error closing server:', err);
          return reject(err);
        }
        Logger.platform.info('HTTP server closed');
        resolve();
      });
    });
  }
}

module.exports = GracefulShutdown;
