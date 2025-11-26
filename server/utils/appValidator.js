const fs = require('fs');
const path = require('path');

/**
 * Deprecated and problematic packages that should be blocked
 */
const DEPRECATED_PACKAGES = {
  'node-sass': {
    reason: 'Requires Python 2/3 for native compilation. Use "sass" instead.',
    replacement: 'sass',
    severity: 'error'
  },
  'node-gyp': {
    reason: 'Requires Python and C++ compiler. Avoid packages with native dependencies.',
    replacement: null,
    severity: 'warning'
  },
  'fsevents': {
    reason: 'macOS-specific package that may cause issues on Linux servers.',
    replacement: null,
    severity: 'warning'
  },
  'phantomjs': {
    reason: 'Deprecated headless browser. Use Puppeteer or Playwright instead.',
    replacement: 'puppeteer',
    severity: 'error'
  },
  'request': {
    reason: 'Deprecated HTTP client. Use "axios" or "node-fetch" instead.',
    replacement: 'axios',
    severity: 'warning'
  }
};

/**
 * Validate app configuration based on app type
 */
class AppValidator {
  /**
   * Validate frontend app requirements
   * @param {string} appPath - Path to app directory
   * @returns {Object} - { valid: boolean, errors: [], warnings: [], recommendations: [] }
   */
  static validateFrontendApp(appPath) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    const packageJsonPath = path.join(appPath, 'package.json');
    
    // Check package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      result.valid = false;
      result.errors.push('package.json not found. Frontend apps require package.json with dependencies.');
      return result;
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      // Check for build script
      if (!packageJson.scripts || !packageJson.scripts.build) {
        result.warnings.push('No "build" script found in package.json. Frontend apps typically need a build step.');
        result.recommendations.push('Add a build script: "build": "react-scripts build" or similar');
      }

      // Check for deprecated packages
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      for (const [pkg, info] of Object.entries(DEPRECATED_PACKAGES)) {
        if (allDeps[pkg]) {
          if (info.severity === 'error') {
            result.valid = false;
            result.errors.push(`Blocked package "${pkg}": ${info.reason}${info.replacement ? ` Use "${info.replacement}" instead.` : ''}`);
          } else {
            result.warnings.push(`Deprecated package "${pkg}": ${info.reason}${info.replacement ? ` Consider using "${info.replacement}".` : ''}`);
          }
        }
      }

      // Check for common issues
      if (allDeps['node-sass'] && !allDeps['sass']) {
        result.recommendations.push('Migrate from node-sass to sass: npm uninstall node-sass && npm install sass');
      }

      // Check for static file indicators
      const hasIndexHtml = fs.existsSync(path.join(appPath, 'public', 'index.html')) ||
                          fs.existsSync(path.join(appPath, 'index.html'));
      
      if (!hasIndexHtml) {
        result.warnings.push('No index.html found. Make sure your build output includes an index.html file.');
      }

    } catch (err) {
      result.valid = false;
      result.errors.push(`Failed to parse package.json: ${err.message}`);
    }

    return result;
  }

  /**
   * Validate backend app requirements
   * @param {string} appPath - Path to app directory
   * @param {string} entryFile - Entry file name (e.g., server.js)
   * @returns {Object} - { valid: boolean, errors: [], warnings: [], recommendations: [] }
   */
  static validateBackendApp(appPath, entryFile) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Check entry file exists
    const entryFilePath = path.join(appPath, entryFile);
    if (!fs.existsSync(entryFilePath)) {
      result.valid = false;
      result.errors.push(`Entry file "${entryFile}" not found. Backend apps must have an entry file that exports the Express app.`);
      return result;
    }

    // Read and validate entry file
    try {
      const entryContent = fs.readFileSync(entryFilePath, 'utf8');
      
      // Check for forbidden patterns
      if (/\b(app|server|express)\s*\.\s*listen\s*\(/i.test(entryContent)) {
        result.valid = false;
        result.errors.push(`Entry file contains .listen() call. Remove app.listen() and export the app instead: module.exports = app;`);
      }

      if (/http\.createServer|https\.createServer/i.test(entryContent)) {
        result.valid = false;
        result.errors.push('Entry file creates HTTP server. PlatformX handles the server. Export the Express app instead.');
      }

      // Check for module.exports
      if (!/module\.exports\s*=/i.test(entryContent)) {
        result.warnings.push('Entry file should export the Express app: module.exports = app;');
      }

      // Check for common issues
      if (/process\.env\.PORT/i.test(entryContent)) {
        result.recommendations.push('Remove PORT environment variable usage. PlatformX manages the server port.');
      }

    } catch (err) {
      result.valid = false;
      result.errors.push(`Failed to read entry file: ${err.message}`);
    }

    // Check package.json
    const packageJsonPath = path.join(appPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check for Express
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (!allDeps['express']) {
          result.warnings.push('Express not found in dependencies. Make sure Express is installed.');
        }

        // Check for deprecated packages
        for (const [pkg, info] of Object.entries(DEPRECATED_PACKAGES)) {
          if (allDeps[pkg]) {
            if (info.severity === 'error') {
              result.valid = false;
              result.errors.push(`Blocked package "${pkg}": ${info.reason}${info.replacement ? ` Use "${info.replacement}" instead.` : ''}`);
            } else {
              result.warnings.push(`Deprecated package "${pkg}": ${info.reason}${info.replacement ? ` Consider using "${info.replacement}".` : ''}`);
            }
          }
        }

      } catch (err) {
        result.warnings.push('Failed to parse package.json');
      }
    } else {
      result.warnings.push('No package.json found. Backend apps should have package.json with dependencies.');
    }

    return result;
  }

  /**
   * Validate fullstack app requirements
   * @param {string} appPath - Path to app directory
   * @param {string} entryFile - Entry file name (e.g., server.js)
   * @returns {Object} - { valid: boolean, errors: [], warnings: [], recommendations: [] }
   */
  static validateFullstackApp(appPath, entryFile) {
    const result = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    // Validate both frontend and backend aspects
    const frontendValidation = this.validateFrontendApp(appPath);
    const backendValidation = this.validateBackendApp(appPath, entryFile);

    // Merge results
    result.errors = [...backendValidation.errors, ...frontendValidation.errors];
    result.warnings = [...backendValidation.warnings, ...frontendValidation.warnings];
    result.recommendations = [...backendValidation.recommendations, ...frontendValidation.recommendations];
    
    result.valid = backendValidation.valid && frontendValidation.valid;

    // Additional fullstack-specific checks
    const packageJsonPath = path.join(appPath, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        // Check for common fullstack frameworks
        const allDeps = {
          ...packageJson.dependencies,
          ...packageJson.devDependencies
        };

        if (allDeps['next']) {
          result.recommendations.push('Next.js detected. Entry file should export the Next.js app handler.');
        }

        if (allDeps['nuxt']) {
          result.recommendations.push('Nuxt.js detected. Entry file should export the Nuxt.js server middleware.');
        }

      } catch (err) {
        // Already handled in other validations
      }
    }

    return result;
  }

  /**
   * Get app type recommendations based on project structure
   * @param {string} appPath - Path to app directory
   * @returns {Object} - { suggestedType: string, confidence: string, reasoning: string }
   */
  static suggestAppType(appPath) {
    const packageJsonPath = path.join(appPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return {
        suggestedType: 'backend',
        confidence: 'low',
        reasoning: 'No package.json found. Defaulting to backend.'
      };
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const allDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };

      const hasBuildScript = packageJson.scripts && packageJson.scripts.build;
      const hasExpress = allDeps['express'];
      const hasFrontendFramework = !!(
        allDeps['react'] ||
        allDeps['vue'] ||
        allDeps['@angular/core'] ||
        allDeps['svelte']
      );
      const hasNext = allDeps['next'];
      const hasNuxt = allDeps['nuxt'];

      // Fullstack frameworks
      if (hasNext || hasNuxt) {
        return {
          suggestedType: 'fullstack',
          confidence: 'high',
          reasoning: `${hasNext ? 'Next.js' : 'Nuxt.js'} framework detected (fullstack by nature)`
        };
      }

      // Frontend + Backend
      if (hasFrontendFramework && hasExpress) {
        return {
          suggestedType: 'fullstack',
          confidence: 'high',
          reasoning: 'Both frontend framework and Express detected'
        };
      }

      // Frontend only
      if (hasFrontendFramework && hasBuildScript) {
        return {
          suggestedType: 'frontend',
          confidence: 'high',
          reasoning: 'Frontend framework with build script detected'
        };
      }

      // Backend only
      if (hasExpress) {
        return {
          suggestedType: 'backend',
          confidence: 'high',
          reasoning: 'Express detected without frontend framework'
        };
      }

      // Has build script but no clear framework
      if (hasBuildScript) {
        return {
          suggestedType: 'frontend',
          confidence: 'medium',
          reasoning: 'Build script found, assuming frontend app'
        };
      }

      // Default to backend
      return {
        suggestedType: 'backend',
        confidence: 'low',
        reasoning: 'No clear indicators found, defaulting to backend'
      };

    } catch (err) {
      return {
        suggestedType: 'backend',
        confidence: 'low',
        reasoning: 'Failed to analyze package.json, defaulting to backend'
      };
    }
  }

  /**
   * Validate app based on its type
   * @param {string} appPath - Path to app directory
   * @param {string} appType - App type (frontend/backend/fullstack)
   * @param {string} entryFile - Entry file for backend/fullstack apps
   * @returns {Object} - Validation result
   */
  static validate(appPath, appType, entryFile = 'server.js') {
    switch (appType) {
      case 'frontend':
        return this.validateFrontendApp(appPath);
      case 'backend':
        return this.validateBackendApp(appPath, entryFile);
      case 'fullstack':
        return this.validateFullstackApp(appPath, entryFile);
      default:
        return {
          valid: false,
          errors: [`Unknown app type: ${appType}`],
          warnings: [],
          recommendations: []
        };
    }
  }
}

module.exports = AppValidator;
