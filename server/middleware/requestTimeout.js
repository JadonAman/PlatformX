const Logger = require('../utils/logger');

/**
 * Request timeout middleware
 * Prevents long-running requests from hanging indefinitely
 */
function requestTimeout(timeout = 30000) {
  return (req, res, next) => {
    // Set timeout for the request
    req.setTimeout(timeout, () => {
      Logger.platform.warn(`Request timeout: ${req.method} ${req.url}`, {
        ip: req.ip,
        timeout
      });

      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          error: 'Request timeout',
          message: 'The request took too long to process'
        });
      }
    });

    // Set timeout for the response
    res.setTimeout(timeout, () => {
      Logger.platform.warn(`Response timeout: ${req.method} ${req.url}`, {
        ip: req.ip,
        timeout
      });

      if (!res.headersSent) {
        res.status(504).json({
          success: false,
          error: 'Gateway timeout',
          message: 'The server took too long to respond'
        });
      }
    });

    next();
  };
}

module.exports = requestTimeout;
