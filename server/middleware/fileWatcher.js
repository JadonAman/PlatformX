const chokidar = require('chokidar');
const path = require('path');

/**
 * File Watcher for App Hot Reload
 * Watches app directories and automatically reloads apps when files change
 */

let watchers = new Map();

/**
 * Start watching an app directory for file changes
 * @param {string} appName - Name of the app to watch
 * @param {Function} unloadCallback - Function to call when files change (to unload the app)
 */
function watchApp(appName, unloadCallback) {
  // Don't create duplicate watchers
  if (watchers.has(appName)) {
    return;
  }

  const appPath = path.join(__dirname, '../apps', appName);

  const watcher = chokidar.watch(appPath, {
    ignored: /(^|[\/\\])(node_modules|\.git)/,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100
    }
  });

  watcher.on('change', (changedPath) => {
    console.log(`[FileWatcher] 🔄 File changed in ${appName}: ${path.relative(appPath, changedPath)}`);
    console.log(`[FileWatcher] 🔃 Auto-reloading ${appName}...`);
    
    // Unload the app (it will be reloaded on next request)
    unloadCallback(appName);
  });

  watcher.on('add', (addedPath) => {
    console.log(`[FileWatcher] ➕ File added in ${appName}: ${path.relative(appPath, addedPath)}`);
    console.log(`[FileWatcher] 🔃 Auto-reloading ${appName}...`);
    unloadCallback(appName);
  });

  watcher.on('unlink', (deletedPath) => {
    console.log(`[FileWatcher] ➖ File deleted in ${appName}: ${path.relative(appPath, deletedPath)}`);
    console.log(`[FileWatcher] 🔃 Auto-reloading ${appName}...`);
    unloadCallback(appName);
  });

  watchers.set(appName, watcher);
  console.log(`[FileWatcher] 👁️  Watching ${appName} for changes...`);
}

/**
 * Stop watching an app directory
 * @param {string} appName - Name of the app to stop watching
 */
function unwatchApp(appName) {
  const watcher = watchers.get(appName);
  if (watcher) {
    watcher.close();
    watchers.delete(appName);
    console.log(`[FileWatcher] 🛑 Stopped watching ${appName}`);
  }
}

/**
 * Stop all watchers
 */
function stopAll() {
  for (const [appName, watcher] of watchers.entries()) {
    watcher.close();
    console.log(`[FileWatcher] 🛑 Stopped watching ${appName}`);
  }
  watchers.clear();
}

/**
 * Get list of watched apps
 */
function getWatchedApps() {
  return Array.from(watchers.keys());
}

module.exports = {
  watchApp,
  unwatchApp,
  stopAll,
  getWatchedApps
};
