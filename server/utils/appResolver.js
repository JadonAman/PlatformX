const fs = require('fs');
const path = require('path');

function resolveApp(appName) {
  if (!appName) {
    return {
      exists: false,
      appPath: null,
    };
  }

  const appFolderPath = path.join(__dirname, '..', 'apps', appName);
  const exists = fs.existsSync(appFolderPath);

  if (!exists) {
    return {
      exists: false,
      appPath: null,
    };
  }

  return {
    exists: true,
    appPath: appFolderPath,
  };
}

module.exports = {
  resolveApp,
};
