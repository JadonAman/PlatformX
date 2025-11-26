const crypto = require('crypto');

/**
 * Request ID middleware
 * Adds a unique ID to each request for tracking across logs and services
 */
function requestId(req, res, next) {
  // Check if request already has an ID (from load balancer or proxy)
  const existingId = req.get('X-Request-ID') || req.get('X-Correlation-ID');
  
  // Generate new ID if none exists
  const id = existingId || generateRequestId();
  
  // Attach to request object
  req.id = id;
  req.requestId = id;
  
  // Add to response headers for debugging
  res.setHeader('X-Request-ID', id);
  
  next();
}

/**
 * Generate a unique request ID
 * Format: timestamp-random
 */
function generateRequestId() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(6).toString('hex');
  return `${timestamp}-${random}`;
}

module.exports = requestId;
