const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AdmZip = require('adm-zip');
const App = require('../models/App');

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
  
  return { valid: true };
}

/**
 * Scan file content for forbidden patterns
 */
function scanForForbiddenPatterns(content) {
  const forbiddenPatterns = [
    /app\.listen\s*\(/i,
    /http\.createServer/i,
    /express\(\)\.listen/i,
    /\.listen\s*\(\s*\d+/i  // General .listen(port) pattern
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(content)) {
      return { 
        found: true, 
        error: 'Forbidden: standalone servers are not allowed. Remove app.listen() before deploying to PlatformX.' 
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

  try {
    const { appName } = req.body;

    // Validate appName
    const validation = validateAppName(appName);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
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
    extractPath = path.join(__dirname, '../apps', appName);

    // If app folder exists, remove it (we're doing an update)
    if (fsSync.existsSync(extractPath)) {
      await fs.rm(extractPath, { recursive: true, force: true });
    }

    // Extract ZIP file
    console.log(`[UPLOAD] Extracting ${zipPath} to ${extractPath}...`);
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(extractPath, true);

    // Check if extraction created a single root directory (common when zipping folders)
    const extractedItems = await fs.readdir(extractPath);
    let actualAppPath = extractPath;
    
    if (extractedItems.length === 1) {
      const potentialDir = path.join(extractPath, extractedItems[0]);
      const stats = await fs.stat(potentialDir);
      
      if (stats.isDirectory()) {
        // Move contents from nested directory up one level
        console.log(`[UPLOAD] Detected nested directory, flattening structure...`);
        const nestedItems = await fs.readdir(potentialDir);
        
        // Move all items from nested dir to parent
        for (const item of nestedItems) {
          const srcPath = path.join(potentialDir, item);
          const destPath = path.join(extractPath, item);
          await fs.rename(srcPath, destPath);
        }
        
        // Remove empty nested directory
        await fs.rmdir(potentialDir);
      }
    }

    // Detect entry file (server.js)
    const entryFile = path.join(extractPath, 'server.js');
    if (!fsSync.existsSync(entryFile)) {
      await cleanup(zipPath, extractPath);
      return res.status(400).json({
        success: false,
        error: 'Missing entry file server.js in the root of the ZIP file'
      });
    }

    // Read and scan entry file for forbidden patterns
    const entryContent = await fs.readFile(entryFile, 'utf-8');
    const scanResult = scanForForbiddenPatterns(entryContent);
    
    if (scanResult.found) {
      await cleanup(zipPath, extractPath);
      return res.status(400).json({
        success: false,
        error: scanResult.error
      });
    }

    // Register or update app in MongoDB
    let app = await App.findBySlug(appName);
    
    if (app) {
      // Update existing app
      app.lastDeployedAt = new Date();
      app.status = 'active';
      app.lastError = null;
      await app.save();
    } else {
      // Create new app
      app = new App({
        name: appName,
        slug: appName,
        status: 'active',
        lastDeployedAt: new Date()
      });
      await app.save();
    }

    // Clean up temporary ZIP file
    await fs.unlink(zipPath);

    console.log(`[UPLOAD] App '${appName}' uploaded and registered successfully`);

    return res.status(200).json({
      success: true,
      appName: appName,
      entryFile: 'server.js',
      message: 'App uploaded and registered successfully'
    });

  } catch (error) {
    console.error('[UPLOAD] Error:', error);

    // Clean up on error
    await cleanup(zipPath, extractPath);

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
