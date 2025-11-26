const validator = require('validator');

/**
 * Input validation and sanitization utilities
 */
class Validator {
  /**
   * Sanitize string input - remove potential XSS
   * @param {string} input - Input string
   * @returns {string} - Sanitized string
   */
  static sanitizeString(input) {
    if (typeof input !== 'string') return '';
    
    return validator.escape(input)
      .trim()
      .replace(/[<>]/g, ''); // Extra protection against tags
  }

  /**
   * Sanitize object - recursively sanitize all string values
   * @param {Object} obj - Input object
   * @returns {Object} - Sanitized object
   */
  static sanitizeObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const sanitized = Array.isArray(obj) ? [] : {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        sanitized[key] = this.sanitizeString(obj[key]);
      } else if (typeof obj[key] === 'object') {
        sanitized[key] = this.sanitizeObject(obj[key]);
      } else {
        sanitized[key] = obj[key];
      }
    }
    
    return sanitized;
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @returns {boolean}
   */
  static isValidEmail(email) {
    return validator.isEmail(email);
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @returns {boolean}
   */
  static isValidURL(url) {
    return validator.isURL(url, {
      protocols: ['http', 'https', 'git'],
      require_protocol: true
    });
  }

  /**
   * Validate app name (more comprehensive than basic regex)
   * @param {string} appName - App name to validate
   * @returns {Object} - { valid: boolean, error: string }
   */
  static validateAppName(appName) {
    if (!appName || typeof appName !== 'string') {
      return { valid: false, error: 'App name is required' };
    }

    // Sanitize first
    const sanitized = appName.trim().toLowerCase();

    if (sanitized.length < 3) {
      return { valid: false, error: 'App name must be at least 3 characters' };
    }

    if (sanitized.length > 63) {
      return { valid: false, error: 'App name must not exceed 63 characters' };
    }

    if (!/^[a-z0-9-]+$/.test(sanitized)) {
      return { 
        valid: false, 
        error: 'App name can only contain lowercase letters, numbers, and hyphens' 
      };
    }

    if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
      return { valid: false, error: 'App name cannot start or end with a hyphen' };
    }

    if (sanitized.includes('--')) {
      return { valid: false, error: 'App name cannot contain consecutive hyphens' };
    }

    return { valid: true, sanitized };
  }

  /**
   * Validate MongoDB ObjectId
   * @param {string} id - ID to validate
   * @returns {boolean}
   */
  static isValidObjectId(id) {
    return validator.isMongoId(id);
  }

  /**
   * Validate port number
   * @param {number|string} port - Port to validate
   * @returns {boolean}
   */
  static isValidPort(port) {
    const portNum = parseInt(port, 10);
    return Number.isInteger(portNum) && portNum >= 1 && portNum <= 65535;
  }

  /**
   * Validate environment variable name
   * @param {string} name - Variable name
   * @returns {boolean}
   */
  static isValidEnvVarName(name) {
    return /^[A-Z_][A-Z0-9_]*$/.test(name);
  }

  /**
   * Validate JSON string
   * @param {string} jsonString - JSON string to validate
   * @returns {Object} - { valid: boolean, parsed: Object|null, error: string }
   */
  static validateJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      return { valid: true, parsed, error: null };
    } catch (error) {
      return { valid: false, parsed: null, error: error.message };
    }
  }

  /**
   * Validate file path (prevent directory traversal)
   * @param {string} filePath - File path to validate
   * @returns {boolean}
   */
  static isValidFilePath(filePath) {
    // Prevent directory traversal attacks
    if (filePath.includes('..')) return false;
    if (filePath.includes('~')) return false;
    if (filePath.startsWith('/')) return false; // Only relative paths
    
    return true;
  }

  /**
   * Validate Git repository URL
   * @param {string} repoUrl - Repository URL
   * @returns {Object} - { valid: boolean, error: string }
   */
  static validateGitRepoUrl(repoUrl) {
    if (!repoUrl || typeof repoUrl !== 'string') {
      return { valid: false, error: 'Repository URL is required' };
    }

    // Support http, https, git, and ssh URLs
    const patterns = [
      /^https?:\/\/.+\.git$/,
      /^git@.+:.+\.git$/,
      /^git:\/\/.+\.git$/,
      /^https?:\/\/github\.com\/.+\/.+$/,
      /^https?:\/\/gitlab\.com\/.+\/.+$/,
      /^https?:\/\/bitbucket\.org\/.+\/.+$/
    ];

    const isValid = patterns.some(pattern => pattern.test(repoUrl));

    if (!isValid) {
      return { 
        valid: false, 
        error: 'Invalid Git repository URL. Must be a valid Git URL or GitHub/GitLab/Bitbucket URL' 
      };
    }

    return { valid: true };
  }

  /**
   * Validate and sanitize proxy configuration
   * @param {Object} proxyConfig - Proxy configuration object
   * @returns {Object} - { valid: boolean, sanitized: Object, error: string }
   */
  static validateProxyConfig(proxyConfig) {
    if (!proxyConfig || typeof proxyConfig !== 'object') {
      return { valid: false, sanitized: null, error: 'Proxy config must be an object' };
    }

    const sanitized = {};

    for (const [path, target] of Object.entries(proxyConfig)) {
      // Validate path starts with /
      if (!path.startsWith('/')) {
        return { 
          valid: false, 
          sanitized: null, 
          error: `Proxy path "${path}" must start with /` 
        };
      }

      // Validate target is a valid URL
      if (!this.isValidURL(target)) {
        return { 
          valid: false, 
          sanitized: null, 
          error: `Proxy target "${target}" is not a valid URL` 
        };
      }

      sanitized[path] = target;
    }

    return { valid: true, sanitized, error: null };
  }

  /**
   * Sanitize HTML to prevent XSS (for markdown/rich text)
   * @param {string} html - HTML content
   * @returns {string} - Sanitized HTML
   */
  static sanitizeHTML(html) {
    // Allow only safe tags and attributes
    const allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'code', 'pre'];
    const allowedAttrs = ['href', 'title'];
    
    // This is a basic implementation - consider using DOMPurify for production
    return validator.escape(html);
  }

  /**
   * Rate limit key generator from request
   * @param {Object} req - Express request object
   * @returns {string} - Unique key for rate limiting
   */
  static getRateLimitKey(req) {
    // Use IP + User-Agent for better uniqueness
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }
}

module.exports = Validator;
