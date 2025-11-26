const Logger = require('../utils/logger');

/**
 * Metrics Collector
 * Tracks request metrics, response times, and error rates
 */
class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byStatus: {},
        byMethod: {},
        byPath: {}
      },
      responseTimes: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        avg: 0
      },
      errors: {
        byType: {},
        byPath: {},
        last10: []
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      uptime: 0,
      lastReset: new Date()
    };

    // Update memory metrics every 30 seconds
    this.memoryInterval = setInterval(() => {
      this.updateMemoryMetrics();
    }, 30000);

    // Log metrics summary every 5 minutes
    this.summaryInterval = setInterval(() => {
      this.logSummary();
    }, 5 * 60 * 1000);
  }

  /**
   * Middleware to track request metrics
   */
  middleware() {
    return (req, res, next) => {
      const startTime = Date.now();

      // Track request start
      this.metrics.requests.total++;
      
      const method = req.method;
      const path = this.normalizePath(req.path);
      
      this.metrics.requests.byMethod[method] = (this.metrics.requests.byMethod[method] || 0) + 1;
      this.metrics.requests.byPath[path] = (this.metrics.requests.byPath[path] || 0) + 1;

      // Override res.end to capture response
      const originalEnd = res.end;
      res.end = (...args) => {
        // Calculate response time
        const responseTime = Date.now() - startTime;
        this.recordResponseTime(responseTime);

        // Track status code
        const statusCode = res.statusCode;
        this.metrics.requests.byStatus[statusCode] = 
          (this.metrics.requests.byStatus[statusCode] || 0) + 1;

        if (statusCode >= 200 && statusCode < 400) {
          this.metrics.requests.success++;
        } else if (statusCode >= 400) {
          this.metrics.requests.errors++;
          this.recordError(req, statusCode);
        }

        // Attach metrics to request for logging
        req.metrics = {
          responseTime,
          statusCode
        };

        // Call original end
        originalEnd.apply(res, args);
      };

      next();
    };
  }

  /**
   * Record response time
   */
  recordResponseTime(time) {
    this.metrics.responseTimes.total += time;
    this.metrics.responseTimes.count++;
    this.metrics.responseTimes.min = Math.min(this.metrics.responseTimes.min, time);
    this.metrics.responseTimes.max = Math.max(this.metrics.responseTimes.max, time);
    this.metrics.responseTimes.avg = 
      this.metrics.responseTimes.total / this.metrics.responseTimes.count;
  }

  /**
   * Record error
   */
  recordError(req, statusCode) {
    const path = this.normalizePath(req.path);
    const errorType = this.getErrorType(statusCode);

    this.metrics.errors.byType[errorType] = 
      (this.metrics.errors.byType[errorType] || 0) + 1;
    
    this.metrics.errors.byPath[path] = 
      (this.metrics.errors.byPath[path] || 0) + 1;

    // Keep last 10 errors
    this.metrics.errors.last10.unshift({
      timestamp: new Date(),
      path,
      statusCode,
      method: req.method,
      ip: req.ip
    });
    
    if (this.metrics.errors.last10.length > 10) {
      this.metrics.errors.last10.pop();
    }
  }

  /**
   * Update memory metrics
   */
  updateMemoryMetrics() {
    const mem = process.memoryUsage();
    this.metrics.memory = {
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024), // MB
      external: Math.round(mem.external / 1024 / 1024), // MB
      rss: Math.round(mem.rss / 1024 / 1024) // MB
    };
    this.metrics.uptime = Math.round(process.uptime());
  }

  /**
   * Normalize path for grouping (remove IDs, etc.)
   */
  normalizePath(path) {
    return path
      .replace(/\/[0-9a-f]{24}/gi, '/:id') // MongoDB ObjectIds
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\/[a-z0-9-]{8,}/gi, '/:slug'); // Slugs
  }

  /**
   * Get error type from status code
   */
  getErrorType(statusCode) {
    if (statusCode >= 400 && statusCode < 500) return 'client-error';
    if (statusCode >= 500) return 'server-error';
    return 'unknown';
  }

  /**
   * Get current metrics
   */
  getMetrics() {
    this.updateMemoryMetrics();
    return {
      ...this.metrics,
      timestamp: new Date(),
      uptime: Math.round(process.uptime())
    };
  }

  /**
   * Reset metrics
   */
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        errors: 0,
        byStatus: {},
        byMethod: {},
        byPath: {}
      },
      responseTimes: {
        total: 0,
        count: 0,
        min: Infinity,
        max: 0,
        avg: 0
      },
      errors: {
        byType: {},
        byPath: {},
        last10: []
      },
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      },
      uptime: 0,
      lastReset: new Date()
    };
  }

  /**
   * Log metrics summary
   */
  logSummary() {
    const metrics = this.getMetrics();
    
    Logger.platform.info('Metrics Summary', {
      totalRequests: metrics.requests.total,
      successRate: `${((metrics.requests.success / metrics.requests.total) * 100).toFixed(2)}%`,
      errorRate: `${((metrics.requests.errors / metrics.requests.total) * 100).toFixed(2)}%`,
      avgResponseTime: `${Math.round(metrics.responseTimes.avg)}ms`,
      maxResponseTime: `${metrics.responseTimes.max}ms`,
      memoryUsed: `${metrics.memory.heapUsed}MB`,
      uptime: `${Math.floor(metrics.uptime / 60)} minutes`
    });
  }

  /**
   * Cleanup intervals on shutdown
   */
  cleanup() {
    clearInterval(this.memoryInterval);
    clearInterval(this.summaryInterval);
  }
}

// Export singleton instance
const metricsCollector = new MetricsCollector();

module.exports = metricsCollector;
