const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AdmZip = require('adm-zip');
const App = require('../models/App');
const Logger = require('../utils/logger');
const EnvManager = require('../utils/envManager');
const BuildSystem = require('../utils/buildSystem');
const AppValidator = require('../utils/appValidator');

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, '../uploads/tmp');

// Ensure upload directory exists
if (!fsSync.existsSync(uploadDir)) {
  fsSync.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: appName-timestamp.zip
    const timestamp = Date.now();
    const appName = req.body.appName || 'unknown';
    cb(null, `${appName}-${timestamp}.zip`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only accept .zip files
    if (path.extname(file.originalname).toLowerCase() !== '.zip') {
      return cb(new Error('Only .zip files are allowed'), false);
    }
    cb(null, true);
  }
});

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
 * Scan file content for forbidden patterns
 */
function scanForForbiddenPatterns(content) {
  const forbiddenPatterns = [
    /\b(app|server|express)\s*\.\s*listen\s*\(/i,  // Any .listen() call
    /http\.createServer/i,
    /https\.createServer/i
  ];

  // Simple approach: remove comments only, check directly for patterns
  // .listen() is unlikely to appear in normal strings
  let cleanCode = content
    .replace(/\/\*[\s\S]*?\*\//g, ' ')  // Remove multi-line comments
    .replace(/\/\/.*$/gm, '');           // Remove single-line comments

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(cleanCode)) {
      return { 
        found: true, 
        error: 'Forbidden: Apps must not call .listen() or create HTTP servers. Export the Express app without calling .listen().' 
      };
    }
  }

  return { found: false };
}

/**
 * Clean up temporary files and extracted directories on error
 */
async function cleanup(zipPath, extractPath) {
  try {
    if (zipPath && fsSync.existsSync(zipPath)) {
      await fs.unlink(zipPath);
    }
    if (extractPath && fsSync.existsSync(extractPath)) {
      await fs.rm(extractPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

/**
 * POST /api/apps/upload
 * Upload and install a ZIP file containing a Node/Express app
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  let zipPath = null;
  let extractPath = null;
  let tempExtractPath = null;

  try {
    const { appName, entryFile = 'server.js' } = req.body;

    console.log(`[UPLOAD] Starting upload for appName: ${appName}, entryFile: ${entryFile}`);

    // Validate appName
    const validation = validateAppName(appName);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
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

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please upload a .zip file.'
      });
    }

    zipPath = req.file.path;
    tempExtractPath = path.join(__dirname, '../uploads/tmp', `${appName}-${Date.now()}`);
    extractPath = path.join(__dirname, '../apps', appName);

    await Logger.log(appName, 'zip-upload', `Starting ZIP upload`, { originalName: req.file.originalname });

    // Extract ZIP file to temp location
    console.log(`[UPLOAD] Extracting ${zipPath} to ${tempExtractPath}...`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(tempExtractPath, true);

    // Check if extraction created a single root directory (common when zipping folders)
    const extractedItems = await fs.readdir(tempExtractPath);
    let actualAppPath = tempExtractPath;
    
    if (extractedItems.length === 1) {
      const potentialDir = path.join(tempExtractPath, extractedItems[0]);
      const stats = await fs.stat(potentialDir);
      
      if (stats.isDirectory()) {
        // Move contents from nested directory up one level
        console.log(`[UPLOAD] Detected nested directory, flattening structure...`);
        const nestedItems = await fs.readdir(potentialDir);
        
        // Move all items from nested dir to parent
        for (const item of nestedItems) {
          const srcPath = path.join(potentialDir, item);
          const destPath = path.join(tempExtractPath, item);
          await fs.rename(srcPath, destPath);
        }
        
        // Remove empty nested directory
        await fs.rmdir(potentialDir);
      }
    }

    // Detect app type first (before validating entry file)
    const appType = req.body.appType && req.body.appType !== 'auto' 
      ? req.body.appType 
      : BuildSystem.detectAppType(tempExtractPath);
    console.log(`[UPLOAD] Detected app type: ${appType}`);

    // Validate app based on type
    console.log(`[UPLOAD] Validating ${appType} app...`);
    const appValidation = AppValidator.validate(tempExtractPath, appType, entryFile);
    
    if (!appValidation.valid) {
      await cleanup(zipPath, tempExtractPath);
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
      console.log(`[UPLOAD] Warnings for ${appName}:`, appValidation.warnings);
      await Logger.log(appName, 'warning', `Warnings: ${appValidation.warnings.join('; ')}`);
    }

    if (appValidation.recommendations.length > 0) {
      console.log(`[UPLOAD] Recommendations for ${appName}:`, appValidation.recommendations);
    }

    // Build frontend apps if needed
    let buildDir = req.body.buildDir || null;
    if (appType === 'frontend' || appType === 'fullstack') {
      const buildConfig = BuildSystem.detectBuildConfig(tempExtractPath);
      
      if (buildConfig.hasBuildScript && !req.body.skipBuild) {
        console.log(`[UPLOAD] Building ${appType} app...`);
        const buildResult = await BuildSystem.buildApp(tempExtractPath, appName);
        
        if (!buildResult.success) {
          await cleanup(zipPath, tempExtractPath);
          await Logger.log(appName, 'error', `Build failed: ${buildResult.error}`);
          return res.status(400).json({
            success: false,
            error: `Build failed: ${buildResult.error}`
          });
        }
        
        buildDir = buildResult.buildDir;
        console.log(`[UPLOAD] Build successful, output: ${buildDir}`);
      } else if (!buildDir) {
        // Try to detect pre-built output
        const StaticServer = require('../middleware/staticServer');
        buildDir = StaticServer.detectBuildDir(tempExtractPath);
      }
    }

    // Check for .env file in extracted content
    const tempEnvPath = path.join(tempExtractPath, '.env');
    const hasEnvFile = fsSync.existsSync(tempEnvPath);
    
    if (hasEnvFile) {
      console.log(`[UPLOAD] Found .env file in ZIP`);
    }

    // If app folder exists, remove it (we're doing an update)
    if (fsSync.existsSync(extractPath)) {
      console.log(`[UPLOAD] Removing existing app directory`);
      await fs.rm(extractPath, { recursive: true, force: true });
    }

    // Move from temp to final location
    await fs.rename(tempExtractPath, extractPath);
    console.log(`[UPLOAD] Moved extracted files to ${extractPath}`);

    // Install dependencies for backend apps
    if (appType === 'backend' || appType === 'fullstack') {
      const packageJsonPath = path.join(extractPath, 'package.json');
      if (fsSync.existsSync(packageJsonPath)) {
        console.log(`[UPLOAD] Installing dependencies for ${appName}...`);
        try {
          const { exec } = require('child_process');
          const util = require('util');
          const execPromise = util.promisify(exec);
          
          const { stdout, stderr } = await execPromise('npm install --production', {
            cwd: extractPath,
            timeout: 300000 // 5 minutes timeout
          });
          
          console.log(`[UPLOAD] Dependencies installed successfully`);
          if (stderr && !stderr.includes('npm WARN')) {
            console.warn(`[UPLOAD] npm install warnings:`, stderr);
          }
          await Logger.log(appName, 'npm-install', 'Dependencies installed successfully');
        } catch (err) {
          console.error(`[UPLOAD] Failed to install dependencies:`, err.message);
          await Logger.log(appName, 'error', `npm install failed: ${err.message}`);
          // Don't fail the deployment, but log the error
        }
      }
    }

    // Handle .env file if it exists
    let envVars = {};
    if (hasEnvFile) {
      const finalEnvPath = path.join(extractPath, '.env');
      envVars = EnvManager.loadEnvSync(appName);
      console.log(`[UPLOAD] Loaded ${Object.keys(envVars).length} environment variables`);
    }

    // Register or update app in MongoDB
    let app = await App.findBySlug(appName);
    
    // Parse proxy config if provided
    let proxyConfig = null;
    if (req.body.proxyConfig) {
      try {
        proxyConfig = JSON.parse(req.body.proxyConfig);
      } catch (err) {
        console.warn('[UPLOAD] Invalid proxy config, ignoring');
      }
    }

    if (app) {
      // Update existing app
      app.lastDeployedAt = new Date();
      app.status = 'active';
      app.lastError = null;
      app.deploymentMethod = 'zip-upload';
      app.entryFile = entryFile;
      app.appType = appType;
      app.buildDir = buildDir;
      if (proxyConfig) app.proxyConfig = new Map(Object.entries(proxyConfig));
      await app.save();
      console.log(`[UPLOAD] Updated existing app metadata`);
    } else {
      // Create new app
      app = new App({
        name: appName,
        slug: appName,
        status: 'active',
        lastDeployedAt: new Date(),
        description: `Deployed via ZIP upload`,
        deploymentMethod: 'zip-upload',
        entryFile
      });
      await app.save();
      console.log(`[UPLOAD] Created new app metadata`);
    }

    // Clean up temporary ZIP file
    await fs.unlink(zipPath);

    await Logger.log(appName, 'zip-upload', `Successfully deployed from ZIP`, { 
      entryFile,
      hasEnvFile,
      envVarsCount: Object.keys(envVars).length
    });

    console.log(`[UPLOAD] App '${appName}' uploaded and registered successfully`);

    return res.status(200).json({
      success: true,
      appName,
      entryFile,
      hasEnvFile,
      envVarsCount: Object.keys(envVars).length,
      message: 'App uploaded and registered successfully',
      accessUrl: `http://${appName}.platformx.localhost:${process.env.PORT || 5000}`
    });

  } catch (error) {
    console.error('[UPLOAD] Error:', error);

    // Clean up on error
    await cleanup(zipPath, tempExtractPath || extractPath);

    const appName = req.body?.appName || 'unknown';
    await Logger.log(appName, 'error', `ZIP upload failed: ${error.message}`);

    // Handle multer errors
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 50MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${error.message}`
      });
    }

    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error during upload'
    });
  }
});

module.exports = router;
