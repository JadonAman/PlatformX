const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const Logger = require('./logger');

/**
 * Service to clean up old temporary files
 */
class CleanupService {
  constructor() {
    this.uploadTmpDir = path.join(__dirname, '../uploads/tmp');
    this.cleanupInterval = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    this.intervalId = null;
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.intervalId) {
      Logger.platform.warn('Cleanup service already running');
      return;
    }

    Logger.platform.info(`Starting cleanup service (runs every ${this.cleanupInterval / (60 * 60 * 1000)} hours)`);
    
    // Run immediately on start
    this.cleanup();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      Logger.platform.info('Cleanup service stopped');
    }
  }

  /**
   * Perform cleanup of old temporary files
   */
  async cleanup() {
    try {
      // Ensure directory exists
      if (!fsSync.existsSync(this.uploadTmpDir)) {
        Logger.platform.debug(`Upload tmp directory does not exist: ${this.uploadTmpDir}`);
        return;
      }

      const files = await fs.readdir(this.uploadTmpDir);
      const now = Date.now();
      let deletedCount = 0;
      let totalSize = 0;

      Logger.platform.debug(`[CleanupService] Scanning ${files.length} files in ${this.uploadTmpDir}`);

      for (const file of files) {
        try {
          const filePath = path.join(this.uploadTmpDir, file);
          const stats = await fs.stat(filePath);

          // Check if file is older than maxAge
          const fileAge = now - stats.mtimeMs;
          if (fileAge > this.maxAge) {
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            await fs.unlink(filePath);
            deletedCount++;
            totalSize += stats.size;
            
            Logger.platform.info(`[CleanupService] Deleted old file: ${file} (${fileSizeMB}MB, age: ${Math.floor(fileAge / (60 * 60 * 1000))}h)`);
          }
        } catch (fileError) {
          Logger.platform.error(`[CleanupService] Error processing file ${file}:`, fileError);
        }
      }

      if (deletedCount > 0) {
        const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
        Logger.platform.info(`[CleanupService] Cleanup complete: deleted ${deletedCount} files (${totalSizeMB}MB total)`);
      } else {
        Logger.platform.debug('[CleanupService] Cleanup complete: no old files found');
      }

    } catch (error) {
      Logger.platform.error('[CleanupService] Cleanup failed:', error);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      running: this.intervalId !== null,
      cleanupInterval: this.cleanupInterval,
      maxAge: this.maxAge,
      uploadTmpDir: this.uploadTmpDir
    };
  }
}

// Export singleton instance
module.exports = new CleanupService();
