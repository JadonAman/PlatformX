const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const LOGS_DIR = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fsSync.existsSync(LOGS_DIR)) {
  fsSync.mkdirSync(LOGS_DIR, { recursive: true });
}

/**
 * Event Log Schema for MongoDB
 */
const eventLogSchema = new mongoose.Schema({
  appName: {
    type: String,
    required: true,
    index: true
  },
  event: {
    type: String,
    required: true,
    enum: ['load', 'unload', 'deploy', 'redeploy', 'env-update', 'git-import', 'zip-upload', 'error', 'delete', 'rename']
  },
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug'],
    default: 'info'
  },
  message: {
    type: String,
    required: true
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

const EventLog = mongoose.model('EventLog', eventLogSchema);

/**
 * Console colors for different log levels
 */
const COLORS = {
  info: '\x1b[36m',    // Cyan
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m',   // Gray
  reset: '\x1b[0m'     // Reset
};

/**
 * Unified logger for PlatformX events
 */
class Logger {
  /**
   * Log an event to both MongoDB and file system
   * @param {string} appName - App name
   * @param {string} event - Event type
   * @param {string} message - Log message
   * @param {Object} metadata - Additional metadata
   * @param {string} level - Log level (info, warn, error, debug)
   */
  static async log(appName, event, message, metadata = {}, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = {
      appName,
      event,
      message,
      metadata,
      timestamp,
      level
    };

    try {
      // Save to MongoDB
      await EventLog.create(logEntry);

      // Append to file
      const logFile = path.join(LOGS_DIR, `${appName}.log`);
      const logLine = `[${timestamp}] [${level.toUpperCase()}] [${event.toUpperCase()}] ${message}${
        Object.keys(metadata).length > 0 ? ` | ${JSON.stringify(metadata)}` : ''
      }\n`;
      
      await fs.appendFile(logFile, logLine).catch(err => {
        console.error(`[LOGGER] Failed to write to file: ${err.message}`);
      });

      // Console output with colors
      const color = COLORS[level] || COLORS.info;
      console.log(
        `${color}[${timestamp}] [${level.toUpperCase()}] [${appName}] [${event}]${COLORS.reset} ${message}`
      );
    } catch (error) {
      console.error(`[LOGGER] Failed to log event: ${error.message}`);
    }
  }

  /**
   * Log info level message
   */
  static info(context, message, metadata = {}) {
    const [appName, event] = typeof context === 'string' ? [context, 'info'] : [context.appName, context.event || 'info'];
    return this.log(appName, event, message, metadata, 'info');
  }

  /**
   * Log warning level message
   */
  static warn(context, message, metadata = {}) {
    const [appName, event] = typeof context === 'string' ? [context, 'warn'] : [context.appName, context.event || 'warn'];
    return this.log(appName, event, message, metadata, 'warn');
  }

  /**
   * Log error level message
   */
  static error(context, message, metadata = {}) {
    const [appName, event] = typeof context === 'string' ? [context, 'error'] : [context.appName, context.event || 'error'];
    return this.log(appName, event, message, metadata, 'error');
  }

  /**
   * Log debug level message (only in development)
   */
  static debug(context, message, metadata = {}) {
    if (process.env.NODE_ENV === 'development') {
      const [appName, event] = typeof context === 'string' ? [context, 'debug'] : [context.appName, context.event || 'debug'];
      return this.log(appName, event, message, metadata, 'debug');
    }
  }

  /**
   * Platform-level logging (not app-specific)
   */
  static platform = {
    info: (message, metadata = {}) => {
      const timestamp = new Date().toISOString();
      console.log(`${COLORS.info}[${timestamp}] [PLATFORM] [INFO]${COLORS.reset} ${message}`);
    },
    warn: (message, metadata = {}) => {
      const timestamp = new Date().toISOString();
      console.warn(`${COLORS.warn}[${timestamp}] [PLATFORM] [WARN]${COLORS.reset} ${message}`);
    },
    error: (message, error = null) => {
      const timestamp = new Date().toISOString();
      console.error(`${COLORS.error}[${timestamp}] [PLATFORM] [ERROR]${COLORS.reset} ${message}`);
      if (error && error.stack) {
        console.error(error.stack);
      }
    },
    debug: (message, metadata = {}) => {
      if (process.env.NODE_ENV === 'development') {
        const timestamp = new Date().toISOString();
        console.log(`${COLORS.debug}[${timestamp}] [PLATFORM] [DEBUG]${COLORS.reset} ${message}`);
      }
    }
  };

  /**
   * Get logs for a specific app
   * @param {string} appName - App name
   * @param {number} limit - Number of logs to retrieve
   * @returns {Promise<Array>}
   */
  static async getLogs(appName, limit = 100) {
    try {
      return await EventLog
        .find({ appName })
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error(`[LOGGER] Failed to retrieve logs: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all logs with optional filtering
   * @param {Object} filters - Filter options
   * @param {number} limit - Number of logs to retrieve
   * @returns {Promise<Array>}
   */
  static async getAllLogs(filters = {}, limit = 100) {
    try {
      const query = {};
      if (filters.appName) query.appName = filters.appName;
      if (filters.event) query.event = filters.event;
      if (filters.startDate) query.timestamp = { $gte: new Date(filters.startDate) };
      if (filters.endDate) {
        query.timestamp = { ...query.timestamp, $lte: new Date(filters.endDate) };
      }

      return await EventLog
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .lean();
    } catch (error) {
      console.error(`[LOGGER] Failed to retrieve logs: ${error.message}`);
      return [];
    }
  }

  /**
   * Clear old logs (older than specified days)
   * @param {number} days - Number of days to keep
   */
  static async clearOldLogs(days = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const result = await EventLog.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`[LOGGER] Cleared ${result.deletedCount} old log entries`);
      return result.deletedCount;
    } catch (error) {
      console.error(`[LOGGER] Failed to clear old logs: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get file log content for an app
   * @param {string} appName - App name
   * @param {number} lines - Number of lines to read (from end)
   */
  static async getFileLog(appName, lines = 100) {
    try {
      const logFile = path.join(LOGS_DIR, `${appName}.log`);
      
      if (!fsSync.existsSync(logFile)) {
        return '';
      }

      const content = await fs.readFile(logFile, 'utf-8');
      const allLines = content.split('\n').filter(line => line.trim());
      
      return allLines.slice(-lines).join('\n');
    } catch (error) {
      console.error(`[LOGGER] Failed to read file log: ${error.message}`);
      return '';
    }
  }
}

module.exports = Logger;
