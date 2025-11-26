const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const util = require('util');

const execPromise = util.promisify(exec);

/**
 * Build system utilities for frontend apps
 */
class BuildSystem {
  /**
   * Detect if app has a build script
   * @param {string} appPath - Path to app directory
   * @returns {Object} - { hasBuildScript: boolean, buildCommand: string|null, framework: string|null }
   */
  static detectBuildConfig(appPath) {
    const packageJsonPath = path.join(appPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      return { hasBuildScript: false, buildCommand: null, framework: null };
    }

    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const scripts = packageJson.scripts || {};
      
      // Detect framework
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      let framework = null;
      
      if (dependencies['react'] || dependencies['react-dom']) {
        framework = 'react';
      } else if (dependencies['vue']) {
        framework = 'vue';
      } else if (dependencies['@angular/core']) {
        framework = 'angular';
      } else if (dependencies['next']) {
        framework = 'nextjs';
      } else if (dependencies['svelte']) {
        framework = 'svelte';
      }

      // Check for build script
      const hasBuildScript = !!scripts.build;
      const buildCommand = scripts.build || null;

      return {
        hasBuildScript,
        buildCommand,
        framework,
        scripts
      };
    } catch (err) {
      console.error('[BuildSystem] Error reading package.json:', err.message);
      return { hasBuildScript: false, buildCommand: null, framework: null };
    }
  }

  /**
   * Build a frontend app
   * @param {string} appPath - Path to app directory
   * @param {string} appName - App name for logging
   * @returns {Promise<Object>} - { success: boolean, buildDir: string|null, error: string|null }
   */
  static async buildApp(appPath, appName) {
    console.log(`[BuildSystem] Building ${appName}...`);
    
    const buildConfig = this.detectBuildConfig(appPath);
    
    if (!buildConfig.hasBuildScript) {
      return {
        success: false,
        buildDir: null,
        error: 'No build script found in package.json'
      };
    }

    try {
      // Install dependencies if node_modules doesn't exist
      const nodeModulesPath = path.join(appPath, 'node_modules');
      if (!fs.existsSync(nodeModulesPath)) {
        console.log(`[BuildSystem] Installing dependencies for ${appName}...`);
        const { stdout, stderr } = await execPromise('npm install', {
          cwd: appPath,
          timeout: 300000 // 5 minutes timeout
        });
        
        if (stderr && !stderr.includes('npm WARN')) {
          console.error(`[BuildSystem] npm install stderr:`, stderr);
        }
      }

      // Run build command
      console.log(`[BuildSystem] Running build command: ${buildConfig.buildCommand}`);
      const { stdout, stderr } = await execPromise('npm run build', {
        cwd: appPath,
        timeout: 600000 // 10 minutes timeout
      });

      console.log(`[BuildSystem] Build output:`, stdout);
      if (stderr) {
        console.warn(`[BuildSystem] Build stderr:`, stderr);
      }

      // Detect build directory
      const StaticServer = require('../middleware/staticServer');
      const buildDir = StaticServer.detectBuildDir(appPath);

      if (!buildDir) {
        return {
          success: false,
          buildDir: null,
          error: 'Build completed but output directory not found'
        };
      }

      console.log(`[BuildSystem] ✅ Build successful, output: ${buildDir}`);
      return {
        success: true,
        buildDir,
        error: null
      };
      
    } catch (err) {
      console.error(`[BuildSystem] Build failed for ${appName}:`, err.message);
      return {
        success: false,
        buildDir: null,
        error: err.message
      };
    }
  }

  /**
   * Detect app type based on folder structure and package.json
   * @param {string} appPath - Path to app directory
   * @returns {string} - 'backend', 'frontend', or 'fullstack'
   */
  static detectAppType(appPath) {
    const hasPackageJson = fs.existsSync(path.join(appPath, 'package.json'));
    
    if (!hasPackageJson) {
      // No package.json - might be static HTML site
      const hasIndexHtml = fs.existsSync(path.join(appPath, 'index.html'));
      return hasIndexHtml ? 'frontend' : 'backend';
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(appPath, 'package.json'), 'utf8'));
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for frontend frameworks
    const hasFrontendFramework = !!(
      dependencies['react'] ||
      dependencies['vue'] ||
      dependencies['@angular/core'] ||
      dependencies['svelte'] ||
      dependencies['next']
    );

    // Check for backend indicators
    const hasBackend = !!(
      dependencies['express'] ||
      fs.existsSync(path.join(appPath, 'server.js')) ||
      fs.existsSync(path.join(appPath, 'app.js')) ||
      fs.existsSync(path.join(appPath, 'index.js'))
    );

    // Check for build output (pre-built frontend)
    const StaticServer = require('../middleware/staticServer');
    const hasBuildOutput = !!StaticServer.detectBuildDir(appPath);

    if (hasFrontendFramework || hasBuildOutput) {
      return hasBackend ? 'fullstack' : 'frontend';
    }

    return 'backend';
  }
}

module.exports = BuildSystem;
