const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const { spawn } = require('child_process');
const App = require('../models/App');
const Settings = require('../models/Settings');
const Logger = require('../utils/logger');
const EnvManager = require('../utils/envManager');
const BuildSystem = require('../utils/buildSystem');
const AppValidator = require('../utils/appValidator');

const router = express.Router();

/**
 * Reserved app names that cannot be used
 */
const RESERVED_NAMES = [
  'api', 'admin', 'www', 'ftp', 'mail', 
  'platformx', 'platform', 'dashboard', 'console',
  'auth', 'login', 'logout', 'register', 'signup'
];

/**
 * Validate appName follows PlatformX naming rules
 */
function validateAppName(appName) {
  if (!appName || typeof appName !== 'string') {
    return { valid: false, error: 'appName is required' };
  }
  
  if (!/^[a-z0-9-]+$/.test(appName)) {
    return { 
      valid: false, 
      error: 'appName must contain only lowercase letters, digits, and hyphens' 
    };
  }
  
  if (appName.length < 3 || appName.length > 63) {
    return {
      valid: false,
      error: 'appName must be between 3 and 63 characters'
    };
  }
  
  if (RESERVED_NAMES.includes(appName.toLowerCase())) {
    return {
      valid: false,
      error: `appName '${appName}' is reserved. Please choose a different name`
    };
  }
  
  return { valid: true };
}

/**
 * Validate entry file exists and has no forbidden patterns
 */
async function validateEntryFile(extractPath, entryFile) {
  const entryPath = path.join(extractPath, entryFile);
  
  if (!fsSync.existsSync(entryPath)) {
    return {
      valid: false,
      error: `Entry file '${entryFile}' not found in repository`
    };
  }

  try {
    const content = await fs.readFile(entryPath, 'utf-8');
    
    // Check for forbidden patterns
    // We want to prevent any .listen() calls and server creation
    const forbiddenPatterns = [
      { pattern: /\b(app|server|express)\s*\.\s*listen\s*\(/i, name: '.listen() call' },
      { pattern: /http\.createServer/i, name: 'http.createServer' },
      { pattern: /https\.createServer/i, name: 'https.createServer' }
    ];

    // Simple approach: remove comments only, check directly for patterns
    // .listen() is unlikely to appear in normal strings
    let cleanCode = content
      .replace(/\/\*[\s\S]*?\*\//g, ' ')  // Remove multi-line comments
      .replace(/\/\/.*$/gm, '');           // Remove single-line comments

    for (const { pattern, name } of forbiddenPatterns) {
      if (pattern.test(cleanCode)) {
        return {
          valid: false,
          error: `Forbidden pattern detected: ${name}. Apps must not create standalone servers or call .listen(). Export the Express app without calling .listen().`
        };
      }
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: `Failed to validate entry file: ${error.message}`
    };
  }
}

/**
 * Clone git repository
 */
function cloneRepository(repoUrl, targetPath, branch = 'main', githubToken = null) {
  return new Promise((resolve, reject) => {
    // Inject GitHub token into HTTPS URLs for private repos
    let authenticatedUrl = repoUrl;
    if (githubToken && repoUrl.startsWith('https://github.com/')) {
      authenticatedUrl = repoUrl.replace('https://github.com/', `https://${githubToken}@github.com/`);
    } else if (githubToken && repoUrl.startsWith('https://gitlab.com/')) {
      authenticatedUrl = repoUrl.replace('https://gitlab.com/', `https://oauth2:${githubToken}@gitlab.com/`);
    }
    
    const args = ['clone', '--depth', '1', '--single-branch'];
    
    if (branch) {
      args.push('--branch', branch);
    }
    
    args.push(authenticatedUrl, targetPath);

    const git = spawn('git', args);
    
    let stderr = '';
    
    git.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    git.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Git clone failed: ${stderr}`));
      }
    });

    git.on('error', (error) => {
      reject(new Error(`Failed to spawn git: ${error.message}`));
    });
  });
}

/**
 * Clean up temporary directory
 */
async function cleanupTemp(tempPath) {
  try {
    if (fsSync.existsSync(tempPath)) {
      await fs.rm(tempPath, { recursive: true, force: true });
    }
  } catch (error) {
    console.error('[GIT_IMPORT] Cleanup error:', error.message);
  }
}

/**
 * POST /api/apps/git-import
 * Import an app from a Git repository
 */
router.post('/git-import', async (req, res) => {
  let tempPath = null;

  try {
    const { repoUrl, branch = 'main', appName, entryFile = 'server.js', githubToken } = req.body;
    
    // Get GitHub token from request or settings
    const token = githubToken || await Settings.getSetting('github.token', null);

    // Validate required fields
    if (!repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'repoUrl is required'
      });
    }

    if (!appName) {
      return res.status(400).json({
        success: false,
        error: 'appName is required'
      });
    }

    // Validate appName
    const nameValidation = validateAppName(appName);
    if (!nameValidation.valid) {
      return res.status(400).json({
        success: false,
        error: nameValidation.error
      });
    }

    // Validate git URL format
    const gitUrlPattern = /^(https?:\/\/|git@).+\.git$|^(https?:\/\/)(github|gitlab|bitbucket)\.com\/.+$/i;
    if (!gitUrlPattern.test(repoUrl)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Git repository URL'
      });
    }

    // Check if app already exists
    const targetPath = path.join(__dirname, '../apps', appName);
    const existingApp = await App.findBySlug(appName);
    
    if (existingApp || fsSync.existsSync(targetPath)) {
      return res.status(409).json({
        success: false,
        error: `App '${appName}' already exists. Please use a different name or delete the existing app first.`
      });
    }

    console.log(`[GIT_IMPORT] Starting import for ${appName} from ${repoUrl}`);
    await Logger.log(appName, 'git-import', `Starting import from ${repoUrl}`, { branch, entryFile });

    // Setup temp directory
    const uploadDir = path.join(__dirname, '../uploads/tmp');
    if (!fsSync.existsSync(uploadDir)) {
      await fs.mkdir(uploadDir, { recursive: true });
    }

    tempPath = path.join(uploadDir, `${appName}-${Date.now()}`);

    // Clone repository
    console.log(`[GIT_IMPORT] Cloning repository to ${tempPath}...`);
    await cloneRepository(repoUrl, tempPath, branch, token);

    // Remove .git directory to save space
    const gitDir = path.join(tempPath, '.git');
    if (fsSync.existsSync(gitDir)) {
      await fs.rm(gitDir, { recursive: true, force: true });
    }

    // Detect app type
    const appType = req.body.appType && req.body.appType !== 'auto'
      ? req.body.appType
      : BuildSystem.detectAppType(tempPath);
    console.log(`[GIT_IMPORT] Detected app type: ${appType}`);

    // Validate app based on type
    console.log(`[GIT_IMPORT] Validating ${appType} app...`);
    const appValidation = AppValidator.validate(tempPath, appType, entryFile);
    
    if (!appValidation.valid) {
      await cleanupTemp(tempPath);
      await Logger.log(appName, 'error', `Validation failed: ${appValidation.errors.join(', ')}`);
      return res.status(400).json({
        success: false,
        error: 'App validation failed',
        details: {
          errors: appValidation.errors,
          warnings: appValidation.warnings,
          recommendations: appValidation.recommendations
        }
      });
    }

    // Log warnings and recommendations
    if (appValidation.warnings.length > 0) {
      console.log(`[GIT_IMPORT] Warnings for ${appName}:`, appValidation.warnings);
      await Logger.log(appName, 'warning', `Warnings: ${appValidation.warnings.join('; ')}`);
    }

    if (appValidation.recommendations.length > 0) {
      console.log(`[GIT_IMPORT] Recommendations for ${appName}:`, appValidation.recommendations);
    }

    // Build frontend apps if needed
    let buildDir = req.body.buildDir || null;
    if (appType === 'frontend' || appType === 'fullstack') {
      const buildConfig = BuildSystem.detectBuildConfig(tempPath);
      
      if (buildConfig.hasBuildScript && !req.body.skipBuild) {
        console.log(`[GIT_IMPORT] Building ${appType} app...`);
        
        // Move to target path first for building
        await fs.rename(tempPath, targetPath);
        
        const buildResult = await BuildSystem.buildApp(targetPath, appName);
        
        if (!buildResult.success) {
          await cleanupTemp(targetPath);
          await Logger.log(appName, 'error', `Build failed: ${buildResult.error}`);
          return res.status(400).json({
            success: false,
            error: `Build failed: ${buildResult.error}`
          });
        }
        
        buildDir = buildResult.buildDir;
        console.log(`[GIT_IMPORT] Build successful, output: ${buildDir}`);
      } else if (!buildDir) {
        // Try to detect pre-built output
        const StaticServer = require('../middleware/staticServer');
        buildDir = StaticServer.detectBuildDir(tempPath);
      }
    }

    // Move .env file if exists
    const tempEnvPath = path.join(tempPath, '.env');
    let hasEnvFile = false;
    if (fsSync.existsSync(tempEnvPath)) {
      hasEnvFile = true;
      console.log(`[GIT_IMPORT] Found .env file, will preserve it`);
    }

    // Move project to apps directory (if not already moved for building)
    if (fsSync.existsSync(tempPath)) {
      await fs.rename(tempPath, targetPath);
      console.log(`[GIT_IMPORT] Moved project to ${targetPath}`);
    }

    // Install dependencies for backend apps
    if (appType === 'backend' || appType === 'fullstack') {
      const packageJsonPath = path.join(targetPath, 'package.json');
      if (fsSync.existsSync(packageJsonPath)) {
        console.log(`[GIT_IMPORT] Installing dependencies for ${appName}...`);
        try {
          const { exec } = require('child_process');
          const util = require('util');
          const execPromise = util.promisify(exec);
          
          const { stdout, stderr } = await execPromise('npm install --production', {
            cwd: targetPath,
            timeout: 300000 // 5 minutes timeout
          });
          
          console.log(`[GIT_IMPORT] Dependencies installed successfully`);
          if (stderr && !stderr.includes('npm WARN')) {
            console.warn(`[GIT_IMPORT] npm install warnings:`, stderr);
          }
          await Logger.log(appName, 'npm-install', 'Dependencies installed successfully');
        } catch (err) {
          console.error(`[GIT_IMPORT] Failed to install dependencies:`, err.message);
          await Logger.log(appName, 'error', `npm install failed: ${err.message}`);
          // Don't fail the deployment, but log the error
        }
      }
    }

    // Handle .env file
    if (hasEnvFile) {
      const targetEnvPath = path.join(targetPath, '.env');
      if (fsSync.existsSync(targetEnvPath)) {
        console.log(`[GIT_IMPORT] .env file preserved at ${targetEnvPath}`);
      }
    }

    // Parse proxy config if provided
    let proxyConfig = null;
    if (req.body.proxyConfig) {
      try {
        proxyConfig = JSON.parse(req.body.proxyConfig);
      } catch (err) {
        console.warn('[GIT_IMPORT] Invalid proxy config, ignoring');
      }
    }

    // Update or create app metadata in MongoDB
    let app = await App.findBySlug(appName);
    
    if (app) {
      app.lastDeployedAt = new Date();
      app.status = 'active';
      app.lastError = null;
      app.deploymentMethod = 'git-import';
      app.repoUrl = repoUrl;
      app.repoBranch = branch;
      app.entryFile = entryFile;
      app.appType = appType;
      app.buildDir = buildDir;
      if (proxyConfig) app.proxyConfig = new Map(Object.entries(proxyConfig));
      await app.save();
      console.log(`[GIT_IMPORT] Updated existing app metadata`);
    } else {
      app = new App({
        name: appName,
        slug: appName,
        status: 'active',
        description: `Imported from ${repoUrl}`,
        lastDeployedAt: new Date(),
        deploymentMethod: 'git-import',
        repoUrl,
        repoBranch: branch,
        entryFile,
        appType,
        buildDir,
        proxyConfig: proxyConfig ? new Map(Object.entries(proxyConfig)) : null
      });
      await app.save();
      console.log(`[GIT_IMPORT] Created new app metadata`);
    }

    await Logger.log(appName, 'git-import', `Successfully imported from ${repoUrl}`, {
      branch,
      entryFile,
      hasEnvFile
    });

    return res.status(200).json({
      success: true,
      appName,
      entryFile,
      repoUrl,
      branch,
      hasEnvFile,
      message: 'App imported successfully from Git repository',
      accessUrl: `http://${appName}.platformx.localhost:${process.env.PORT || 5000}`
    });

  } catch (error) {
    console.error('[GIT_IMPORT] Error:', error);
    
    // Cleanup on error
    if (tempPath) {
      await cleanupTemp(tempPath);
    }

    const appName = req.body?.appName || 'unknown';
    await Logger.log(appName, 'error', `Git import failed: ${error.message}`);

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during Git import'
    });
  }
});

/**
 * POST /api/apps/git-update/:slug
 * Pull latest changes from Git repository for an existing app
 */
router.post('/git-update/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { branch = 'main' } = req.body;

    // Find app
    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Check if app directory exists
    const appPath = path.join(__dirname, '../apps', slug);
    if (!fsSync.existsSync(appPath)) {
      return res.status(404).json({
        success: false,
        error: `App directory not found`
      });
    }

    // Check if app has git repo info
    if (!app.repoUrl) {
      return res.status(400).json({
        success: false,
        error: 'App was not deployed via git. Cannot update from repository.'
      });
    }

    Logger.platform.info(`[GIT_UPDATE] Starting update for app '${slug}' from ${app.repoUrl}`);

    // Perform git pull
    const gitBranch = branch || app.repoBranch || 'main';
    
    return new Promise((resolve) => {
      const git = spawn('git', ['pull', 'origin', gitBranch], {
        cwd: appPath,
        env: process.env
      });

      let stdout = '';
      let stderr = '';

      git.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[GIT_UPDATE] stdout:', data.toString().trim());
      });

      git.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[GIT_UPDATE] stderr:', data.toString().trim());
      });

      git.on('close', async (code) => {
        if (code !== 0) {
          const error = `Git pull failed with code ${code}: ${stderr}`;
          Logger.platform.error(`[GIT_UPDATE] Failed for ${slug}:`, error);
          
          await App.findOneAndUpdate(
            { slug },
            { 
              status: 'error',
              lastError: error,
              updatedAt: new Date()
            }
          );

          return res.status(500).json({
            success: false,
            error: 'Git pull failed',
            details: stderr
          });
        }

        // Git pull successful
        Logger.platform.info(`[GIT_UPDATE] Successfully pulled latest code for ${slug}`);

        // Check if we need to rebuild (for frontend/fullstack apps)
        let buildSuccess = true;
        let buildOutput = '';

        if (app.appType === 'frontend' || app.appType === 'fullstack') {
          try {
            Logger.platform.info(`[GIT_UPDATE] Building ${app.appType} app ${slug}`);
            const buildResult = await BuildSystem.detectAndBuild(appPath);
            
            if (buildResult.success) {
              buildOutput = `Build completed successfully using ${buildResult.buildSystem}`;
              Logger.platform.info(`[GIT_UPDATE] ${buildOutput}`);
            } else {
              buildSuccess = false;
              buildOutput = buildResult.error || 'Build failed';
              Logger.platform.error(`[GIT_UPDATE] Build failed for ${slug}:`, buildOutput);
            }
          } catch (buildError) {
            buildSuccess = false;
            buildOutput = buildError.message;
            Logger.platform.error(`[GIT_UPDATE] Build error for ${slug}:`, buildError);
          }
        }

        // Update app metadata
        await App.findOneAndUpdate(
          { slug },
          { 
            lastDeployedAt: new Date(),
            updatedAt: new Date(),
            status: buildSuccess ? 'active' : 'error',
            lastError: buildSuccess ? null : buildOutput,
            repoBranch: gitBranch
          }
        );

        await Logger.log(slug, 'info', `App updated from Git (${gitBranch})`, {
          repoUrl: app.repoUrl,
          branch: gitBranch,
          buildSuccess,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        });

        // Unload the app to force reload with new code
        const { unloadApp } = require('../middleware/lazyLoader');
        unloadApp(slug);
        Logger.platform.info(`[GIT_UPDATE] Unloaded app ${slug} - will reload on next request`);

        return res.json({
          success: true,
          message: `App '${slug}' updated successfully from Git`,
          details: {
            branch: gitBranch,
            buildStatus: buildSuccess ? 'success' : 'failed',
            buildOutput: buildOutput || stdout.trim()
          }
        });
      });
    });


  } catch (error) {
    console.error('[GIT_UPDATE] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during Git update'
    });
  }
});

module.exports = router;
