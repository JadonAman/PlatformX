/**
 * subdomainExtractor.js
 * Extracts and validates subdomain from hostname
 */

const PLATFORM_HOST = 'platformx.localhost';

/**
 * Extract subdomain and determine if request is for platform or app
 * @param {string} hostname - Request hostname (e.g., "shop.platformx.localhost")
 * @returns {Object} - { isPlatform: boolean, appName: string|null }
 */
function extractSubdomain(hostname) {
  if (!hostname) {
    return {
      isPlatform: false,
      appName: null,
    };
  }

  const normalizedHost = hostname.toLowerCase();

  // Direct platform access (no subdomain)
  if (normalizedHost === PLATFORM_HOST) {
    return {
      isPlatform: true,
      appName: null,
    };
  }

  // Check if hostname is part of platform domain
  if (!normalizedHost.endsWith(`.${PLATFORM_HOST}`)) {
    return {
      isPlatform: false,
      appName: null,
    };
  }

  // Extract subdomain (everything before the platform domain)
  const subdomain = normalizedHost.slice(0, -(PLATFORM_HOST.length + 1));

  // Validate subdomain format
  const isValid = isValidAppName(subdomain);

  if (!isValid) {
    return {
      isPlatform: false,
      appName: null,
    };
  }

  return {
    isPlatform: false,
    appName: subdomain,
  };
}

/**
 * Validate app name format
 * Rules:
 * - Must start with lowercase letter
 * - Can contain lowercase letters, numbers, and hyphens
 * - Cannot have consecutive hyphens
 * - Cannot start or end with hyphen
 * - Must be 3-63 characters long
 * 
 * @param {string} appName 
 * @returns {boolean}
 */
function isValidAppName(appName) {
  if (!appName || typeof appName !== 'string') {
    return false;
  }

  // Check length
  if (appName.length < 3 || appName.length > 63) {
    return false;
  }

  // Must start with letter
  if (!/^[a-z]/.test(appName)) {
    return false;
  }

  // Cannot start or end with hyphen
  if (appName.startsWith('-') || appName.endsWith('-')) {
    return false;
  }

  // No consecutive hyphens, only lowercase letters, numbers, hyphens
  const validPattern = /^[a-z][a-z0-9-]*$/;
  const noConsecutiveHyphens = !appName.includes('--');

  return validPattern.test(appName) && noConsecutiveHyphens;
}

module.exports = {
  extractSubdomain,
  isValidAppName,
  PLATFORM_HOST
};
