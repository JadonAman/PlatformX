/**
 * Standardized Error Codes for PlatformX
 * Provides consistent error handling across the application
 */

const ErrorCodes = {
  // Authentication Errors (1xxx)
  AUTH_INVALID_CREDENTIALS: {
    code: 1001,
    message: 'Invalid username or password',
    httpStatus: 401
  },
  AUTH_TOKEN_EXPIRED: {
    code: 1002,
    message: 'Authentication token has expired',
    httpStatus: 401
  },
  AUTH_TOKEN_INVALID: {
    code: 1003,
    message: 'Invalid authentication token',
    httpStatus: 401
  },
  AUTH_UNAUTHORIZED: {
    code: 1004,
    message: 'Unauthorized access',
    httpStatus: 403
  },
  AUTH_RATE_LIMIT: {
    code: 1005,
    message: 'Too many authentication attempts',
    httpStatus: 429
  },

  // Validation Errors (2xxx)
  VALIDATION_FAILED: {
    code: 2001,
    message: 'Input validation failed',
    httpStatus: 400
  },
  VALIDATION_APPNAME_INVALID: {
    code: 2002,
    message: 'Invalid app name format',
    httpStatus: 400
  },
  VALIDATION_APPNAME_RESERVED: {
    code: 2003,
    message: 'App name is reserved',
    httpStatus: 400
  },
  VALIDATION_APPNAME_EXISTS: {
    code: 2004,
    message: 'App name already exists',
    httpStatus: 409
  },
  VALIDATION_FILE_TOO_LARGE: {
    code: 2005,
    message: 'File size exceeds limit',
    httpStatus: 413
  },
  VALIDATION_FILE_INVALID: {
    code: 2006,
    message: 'Invalid file type',
    httpStatus: 400
  },
  VALIDATION_GIT_URL_INVALID: {
    code: 2007,
    message: 'Invalid Git repository URL',
    httpStatus: 400
  },

  // App Errors (3xxx)
  APP_NOT_FOUND: {
    code: 3001,
    message: 'App not found',
    httpStatus: 404
  },
  APP_ALREADY_EXISTS: {
    code: 3002,
    message: 'App already exists',
    httpStatus: 409
  },
  APP_LOAD_FAILED: {
    code: 3003,
    message: 'Failed to load app',
    httpStatus: 500
  },
  APP_FORBIDDEN_PATTERN: {
    code: 3004,
    message: 'App code contains forbidden patterns',
    httpStatus: 400
  },
  APP_BUILD_FAILED: {
    code: 3005,
    message: 'App build failed',
    httpStatus: 500
  },
  APP_NOT_GIT_DEPLOYED: {
    code: 3006,
    message: 'App was not deployed via Git',
    httpStatus: 400
  },

  // Database Errors (4xxx)
  DB_CONNECTION_FAILED: {
    code: 4001,
    message: 'Database connection failed',
    httpStatus: 503
  },
  DB_QUERY_FAILED: {
    code: 4002,
    message: 'Database query failed',
    httpStatus: 500
  },
  DB_NOT_CONFIGURED: {
    code: 4003,
    message: 'Database not configured',
    httpStatus: 500
  },

  // File System Errors (5xxx)
  FS_READ_FAILED: {
    code: 5001,
    message: 'Failed to read file',
    httpStatus: 500
  },
  FS_WRITE_FAILED: {
    code: 5002,
    message: 'Failed to write file',
    httpStatus: 500
  },
  FS_DELETE_FAILED: {
    code: 5003,
    message: 'Failed to delete file',
    httpStatus: 500
  },
  FS_DIRECTORY_NOT_FOUND: {
    code: 5004,
    message: 'Directory not found',
    httpStatus: 404
  },

  // Git Errors (6xxx)
  GIT_CLONE_FAILED: {
    code: 6001,
    message: 'Git clone failed',
    httpStatus: 500
  },
  GIT_PULL_FAILED: {
    code: 6002,
    message: 'Git pull failed',
    httpStatus: 500
  },
  GIT_INVALID_REPO: {
    code: 6003,
    message: 'Invalid Git repository',
    httpStatus: 400
  },

  // Server Errors (7xxx)
  SERVER_INTERNAL_ERROR: {
    code: 7001,
    message: 'Internal server error',
    httpStatus: 500
  },
  SERVER_TIMEOUT: {
    code: 7002,
    message: 'Request timeout',
    httpStatus: 408
  },
  SERVER_UNAVAILABLE: {
    code: 7003,
    message: 'Service temporarily unavailable',
    httpStatus: 503
  },
  SERVER_BAD_GATEWAY: {
    code: 7004,
    message: 'Bad gateway',
    httpStatus: 502
  },

  // Environment Errors (8xxx)
  ENV_VAR_INVALID: {
    code: 8001,
    message: 'Invalid environment variable',
    httpStatus: 400
  },
  ENV_SAVE_FAILED: {
    code: 8002,
    message: 'Failed to save environment variables',
    httpStatus: 500
  },
  ENV_LOAD_FAILED: {
    code: 8003,
    message: 'Failed to load environment variables',
    httpStatus: 500
  }
};

/**
 * Create error response object
 * @param {Object} errorCode - Error code object from ErrorCodes
 * @param {Object} additionalData - Additional error details
 * @returns {Object} - Formatted error response
 */
function createError(errorCode, additionalData = {}) {
  return {
    success: false,
    error: {
      code: errorCode.code,
      message: errorCode.message,
      ...additionalData
    }
  };
}

/**
 * Error class with code support
 */
class AppError extends Error {
  constructor(errorCode, details = {}) {
    super(errorCode.message);
    this.name = 'AppError';
    this.code = errorCode.code;
    this.httpStatus = errorCode.httpStatus;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details
      }
    };
  }
}

module.exports = {
  ErrorCodes,
  createError,
  AppError
};
