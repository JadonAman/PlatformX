const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const dotenv = require('dotenv');

/**
 * Environment Variable Manager for Per-App .env Files
 */
class EnvManager {
  /**
   * Get the .env file path for an app
   * @param {string} appName - App name
   * @returns {string} - Path to .env file
   */
  static getEnvPath(appName) {
    return path.join(__dirname, '../apps', appName, '.env');
  }

  /**
   * Check if an app has a .env file
   * @param {string} appName - App name
   * @returns {boolean}
   */
  static hasEnvFile(appName) {
    return fsSync.existsSync(this.getEnvPath(appName));
  }

  /**
   * Load environment variables for an app
   * @param {string} appName - App name
   * @returns {Object} - Parsed environment variables
   */
  static async loadEnv(appName) {
    try {
      const envPath = this.getEnvPath(appName);
      
      if (!fsSync.existsSync(envPath)) {
        return {};
      }

      const envContent = await fs.readFile(envPath, 'utf-8');
      const parsed = dotenv.parse(envContent);
      
      return parsed;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to load env for ${appName}:`, error.message);
      return {};
    }
  }

  /**
   * Load environment variables synchronously (for lazyLoader)
   * @param {string} appName - App name
   * @returns {Object} - Parsed environment variables
   */
  static loadEnvSync(appName) {
    try {
      const envPath = this.getEnvPath(appName);
      
      if (!fsSync.existsSync(envPath)) {
        return {};
      }

      const envContent = fsSync.readFileSync(envPath, 'utf-8');
      const parsed = dotenv.parse(envContent);
      
      return parsed;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to load env for ${appName}:`, error.message);
      return {};
    }
  }

  /**
   * Save environment variables for an app
   * @param {string} appName - App name
   * @param {Object} envVars - Environment variables object
   * @returns {Promise<boolean>} - Success status
   */
  static async saveEnv(appName, envVars) {
    try {
      const envPath = this.getEnvPath(appName);
      const appDir = path.dirname(envPath);

      // Ensure app directory exists
      if (!fsSync.existsSync(appDir)) {
        await fs.mkdir(appDir, { recursive: true });
      }

      // Convert object to .env format
      const envContent = Object.entries(envVars)
        .map(([key, value]) => {
          // Escape values with quotes if they contain spaces or special chars
          const needsQuotes = /[\s#]/.test(value) || value === '';
          const escapedValue = needsQuotes ? `"${value.replace(/"/g, '\\"')}"` : value;
          return `${key}=${escapedValue}`;
        })
        .join('\n');

      await fs.writeFile(envPath, envContent + '\n', 'utf-8');
      
      return true;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to save env for ${appName}:`, error.message);
      return false;
    }
  }

  /**
   * Update specific environment variables (merge with existing)
   * @param {string} appName - App name
   * @param {Object} updates - Variables to update/add
   * @returns {Promise<Object>} - Updated env object
   */
  static async updateEnv(appName, updates) {
    try {
      const existing = await this.loadEnv(appName);
      const merged = { ...existing, ...updates };
      
      await this.saveEnv(appName, merged);
      
      return merged;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to update env for ${appName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete specific environment variables
   * @param {string} appName - App name
   * @param {Array<string>} keys - Keys to delete
   * @returns {Promise<Object>} - Updated env object
   */
  static async deleteEnvKeys(appName, keys) {
    try {
      const existing = await this.loadEnv(appName);
      
      keys.forEach(key => {
        delete existing[key];
      });
      
      await this.saveEnv(appName, existing);
      
      return existing;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to delete env keys for ${appName}:`, error.message);
      throw error;
    }
  }

  /**
   * Delete .env file for an app
   * @param {string} appName - App name
   * @returns {Promise<boolean>}
   */
  static async deleteEnvFile(appName) {
    try {
      const envPath = this.getEnvPath(appName);
      
      if (fsSync.existsSync(envPath)) {
        await fs.unlink(envPath);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to delete env file for ${appName}:`, error.message);
      return false;
    }
  }

  /**
   * Move .env file from source to app directory
   * @param {string} sourcePath - Source .env file path
   * @param {string} appName - Target app name
   * @returns {Promise<boolean>}
   */
  static async moveEnvFile(sourcePath, appName) {
    try {
      if (!fsSync.existsSync(sourcePath)) {
        return false;
      }

      const targetPath = this.getEnvPath(appName);
      const targetDir = path.dirname(targetPath);

      // Ensure target directory exists
      if (!fsSync.existsSync(targetDir)) {
        await fs.mkdir(targetDir, { recursive: true });
      }

      // Copy file
      await fs.copyFile(sourcePath, targetPath);
      
      // Delete source
      await fs.unlink(sourcePath);
      
      return true;
    } catch (error) {
      console.error(`[ENV_MANAGER] Failed to move env file:`, error.message);
      return false;
    }
  }

  /**
   * Validate environment variable names
   * @param {Object} envVars - Environment variables to validate
   * @returns {Object} - { valid: boolean, errors: Array }
   */
  static validateEnvVars(envVars) {
    const errors = [];
    const validKeyPattern = /^[A-Z_][A-Z0-9_]*$/;

    for (const key of Object.keys(envVars)) {
      if (!validKeyPattern.test(key)) {
        errors.push(`Invalid key: ${key}. Must be uppercase letters, digits, and underscores only.`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

module.exports = EnvManager;
