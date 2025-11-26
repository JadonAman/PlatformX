/**
 * appResolver.js
 * Resolves app paths and validates app existence
 */

const fs = require('fs');
const path = require('path');

const APPS_DIR = path.join(__dirname, '..', 'apps');

/**
 * Resolve app and check existence
 * @param {string} appName 
 * @returns {Object} - { exists: boolean, appPath: string|null, hasServerFile: boolean }
 */
function resolveApp(appName) {
  if (!appName) {
    return {
      exists: false,
      appPath: null,
      hasServerFile: false
    };
  }

  const appFolderPath = path.join(APPS_DIR, appName);
  
  // Check if app folder exists
  let exists = false;
  try {
    const stat = fs.statSync(appFolderPath);
    exists = stat.isDirectory();
  } catch (err) {
    exists = false;
  }

  if (!exists) {
    return {
      exists: false,
      appPath: null,
      hasServerFile: false
    };
  }

  // Check if server.js exists
  const serverPath = path.join(appFolderPath, 'server.js');
  let hasServerFile = false;
  try {
    const stat = fs.statSync(serverPath);
    hasServerFile = stat.isFile();
  } catch (err) {
    hasServerFile = false;
  }

  return {
    exists: true,
    appPath: appFolderPath,
    hasServerFile
  };
}

/**
 * List all available apps (excluding template)
 * @returns {Array} - Array of app names
 */
function listApps() {
  try {
    const items = fs.readdirSync(APPS_DIR);
    return items.filter(item => {
      if (item === 'template') return false;
      
      const itemPath = path.join(APPS_DIR, item);
      try {
        const stat = fs.statSync(itemPath);
        return stat.isDirectory();
      } catch (err) {
        return false;
      }
    });
  } catch (err) {
    return [];
  }
}

/**
 * Get detailed info about an app
 * @param {string} appName 
 * @returns {Object|null}
 */
function getAppInfo(appName) {
  const result = resolveApp(appName);
  if (!result.exists) {
    return null;
  }

  const info = {
    appName,
    appPath: result.appPath,
    hasServerFile: result.hasServerFile,
    files: []
  };

  // List files in app directory
  try {
    info.files = fs.readdirSync(result.appPath);
  } catch (err) {
    info.files = [];
  }

  return info;
}

module.exports = {
  resolveApp,
  listApps,
  getAppInfo,
  APPS_DIR
};
