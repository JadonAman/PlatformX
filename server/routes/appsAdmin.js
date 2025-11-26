const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const App = require('../models/App');
const Logger = require('../utils/logger');
const EnvManager = require('../utils/envManager');
const { unloadApp } = require('../middleware/lazyLoader');
const backupManager = require('../utils/backupManager');
const webhookManager = require('../utils/webhookManager');

const router = express.Router();

/**
 * Validate appName/slug follows PlatformX naming rules
 */
function validateSlug(slug) {
  if (!slug || typeof slug !== 'string') {
    return { valid: false, error: 'slug is required' };
  }
  
  if (!/^[a-z0-9-]+$/.test(slug)) {
    return { 
      valid: false, 
      error: 'slug must contain only lowercase letters, digits, and hyphens' 
    };
  }
  
  return { valid: true };
}

/**
 * GET /api/admin/apps
 * List all apps with optional filtering
 */
router.get('/', async (req, res) => {
  try {
    const { status } = req.query;
    const filters = {};
    
    if (status) {
      filters.status = status;
    }

    const apps = await App.listApps(filters);

    return res.status(200).json({
      success: true,
      count: apps.length,
      apps: apps.map(app => ({
        name: app.name,
        slug: app.slug,
        status: app.status,
        createdAt: app.createdAt,
        lastDeployedAt: app.lastDeployedAt,
        requestCount: app.requestCount,
        description: app.description
      }))
    });
  } catch (error) {
    console.error('[ADMIN] Error listing apps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list apps'
    });
  }
});

/**
 * GET /api/admin/apps/:slug
 * Get full details about a single app
 */
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const app = await App.findBySlug(slug);

    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Check if app folder exists
    const appPath = path.join(__dirname, '../apps', slug);
    const folderExists = fsSync.existsSync(appPath);
    const hasServerFile = folderExists && fsSync.existsSync(path.join(appPath, 'server.js'));

    return res.status(200).json({
      success: true,
      app: {
        name: app.name,
        slug: app.slug,
        status: app.status,
        description: app.description,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        lastDeployedAt: app.lastDeployedAt,
        lastError: app.lastError,
        requestCount: app.requestCount,
        deployment: {
          folderExists,
          hasServerFile,
          path: folderExists ? appPath : null
        }
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching app:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch app details'
    });
  }
});

/**
 * POST /api/admin/apps
 * Create/register a new app entry manually (without ZIP upload)
 */
router.post('/', async (req, res) => {
  try {
    const { name, slug, description } = req.body;

    // Validate required fields
    if (!name || !slug) {
      return res.status(400).json({
        success: false,
        error: 'name and slug are required'
      });
    }

    // Validate slug format
    const validation = validateSlug(slug);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: validation.error
      });
    }

    // Check if slug already exists
    const existing = await App.findBySlug(slug);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `App with slug '${slug}' already exists`
      });
    }

    // Create new app
    const app = new App({
      name,
      slug,
      description: description || '',
      status: 'active'
    });

    await app.save();

    console.log(`[ADMIN] Created app: ${slug}`);

    return res.status(201).json({
      success: true,
      app: {
        name: app.name,
        slug: app.slug,
        status: app.status,
        description: app.description,
        createdAt: app.createdAt
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error creating app:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create app'
    });
  }
});

/**
 * PATCH /api/admin/apps/:slug
 * Update app metadata (name, description, status)
 */
router.patch('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, status } = req.body;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Update allowed fields
    if (name !== undefined) app.name = name;
    if (description !== undefined) app.description = description;
    if (status !== undefined) {
      if (!['active', 'disabled', 'error'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'status must be one of: active, disabled, error'
        });
      }
      app.status = status;
    }

    await app.save();

    console.log(`[ADMIN] Updated app: ${slug}`);

    return res.status(200).json({
      success: true,
      app: {
        name: app.name,
        slug: app.slug,
        status: app.status,
        description: app.description,
        updatedAt: app.updatedAt
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error updating app:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update app'
    });
  }
});

/**
 * DELETE /api/admin/apps/:slug
 * Delete app metadata from DB and remove app folder
 */
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Unload app if it's cached
    const wasLoaded = unloadApp(slug);

    // Delete app folder if it exists
    const appPath = path.join(__dirname, '../apps', slug);
    if (fsSync.existsSync(appPath)) {
      await fs.rm(appPath, { recursive: true, force: true });
      console.log(`[ADMIN] Deleted app folder: ${appPath}`);
    }

    // Delete from database
    await App.deleteOne({ slug });

    await Logger.log(slug, 'delete', 'App deleted', { wasLoaded });

    console.log(`[ADMIN] Deleted app: ${slug}`);

    return res.status(200).json({
      success: true,
      slug,
      wasLoaded
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting app:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete app'
    });
  }
});

/**
 * POST /api/admin/apps/:slug/redeploy
 * Trigger a redeploy (force app reload)
 */
router.post('/:slug/redeploy', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Force unload app (clears cache and require cache)
    const wasLoaded = unloadApp(slug);

    // Update lastDeployedAt
    app.lastDeployedAt = new Date();
    await app.save();

    await Logger.log(slug, 'redeploy', 'App redeployed (forced reload)', { wasLoaded });

    console.log(`[ADMIN] Redeployed app: ${slug}`);

    return res.status(200).json({
      success: true,
      slug,
      lastDeployedAt: app.lastDeployedAt,
      wasLoaded,
      message: 'App redeployed successfully. It will reload on next request.'
    });
  } catch (error) {
    console.error('[ADMIN] Error redeploying app:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to redeploy app'
    });
  }
});

/**
 * POST /api/admin/apps/:slug/rename
 * Rename an app (updates slug, folder name, and database)
 */
router.post('/:slug/rename', async (req, res) => {
  try {
    const { slug } = req.params;
    const { newName } = req.body;

    // Validate new name
    if (!newName) {
      return res.status(400).json({
        success: false,
        error: 'newName is required'
      });
    }

    // Validate name format
    const namePattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (!namePattern.test(newName) || newName.length < 3 || newName.length > 63) {
      return res.status(400).json({
        success: false,
        error: 'App name must be 3-63 characters, lowercase letters, digits, and hyphens only'
      });
    }

    // Check if old app exists
    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Check if new name already exists
    const existingApp = await App.findBySlug(newName);
    if (existingApp) {
      return res.status(409).json({
        success: false,
        error: `App '${newName}' already exists. Please choose a different name.`
      });
    }

    const oldPath = path.join(__dirname, '../apps', slug);
    const newPath = path.join(__dirname, '../apps', newName);

    // Check if folder exists
    if (!fsSync.existsSync(oldPath)) {
      return res.status(404).json({
        success: false,
        error: `App folder '${slug}' not found`
      });
    }

    // Check if target folder already exists
    if (fsSync.existsSync(newPath)) {
      return res.status(409).json({
        success: false,
        error: `Folder '${newName}' already exists`
      });
    }

    // Unload app if it's cached
    unloadApp(slug);

    // Rename folder
    fsSync.renameSync(oldPath, newPath);

    // Update database
    app.name = newName;
    app.slug = newName;
    await app.save();

    await Logger.log(newName, 'rename', `App renamed from ${slug} to ${newName}`);

    console.log(`[ADMIN] Renamed app: ${slug} -> ${newName}`);

    return res.status(200).json({
      success: true,
      oldSlug: slug,
      newSlug: newName,
      message: `App renamed successfully from '${slug}' to '${newName}'`
    });
  } catch (error) {
    console.error('[ADMIN] Error renaming app:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to rename app'
    });
  }
});

/**
 * Sanitize folder name to valid app name
 * Converts spaces to hyphens, removes special chars, lowercase
 */
function sanitizeFolderName(folderName) {
  return folderName
    .toLowerCase()
    .replace(/\s+/g, '-')           // spaces to hyphens
    .replace(/[^a-z0-9-]/g, '')     // remove special chars
    .replace(/-+/g, '-')            // collapse multiple hyphens
    .replace(/^-+|-+$/g, '');       // trim hyphens
}

/**
 * Validate if folder name matches app naming convention
 */
function isValidAppName(name) {
  const pattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
  return pattern.test(name) && name.length >= 3 && name.length <= 63;
}

/**
 * Find entry file in app directory (server.js, index.js, app.js, main.js)
 */
function findEntryFile(appPath) {
  const possibleEntryFiles = ['server.js', 'index.js', 'app.js', 'main.js'];
  
  for (const file of possibleEntryFiles) {
    const filePath = path.join(appPath, file);
    if (fsSync.existsSync(filePath)) {
      return file;
    }
  }
  
  return null;
}

/**
 * POST /api/admin/apps/sync
 * Sync filesystem with database (bi-directional)
 * Optionally rename folders with invalid names
 */
router.post('/sync', async (req, res) => {
  try {
    const { autoRename = false } = req.body; // Optional: auto-rename invalid folders
    const appsDir = path.join(__dirname, '../apps');
    
    // Get all filesystem folders
    const allFolders = fsSync.readdirSync(appsDir).filter(folder => {
      const appPath = path.join(appsDir, folder);
      return fsSync.statSync(appPath).isDirectory();
    });

    // Get all database apps
    const dbApps = await App.find({});

    let addedCount = 0;
    let removedCount = 0;
    let renamedCount = 0;
    let skippedCount = 0;
    const added = [];
    const removed = [];
    const renamed = [];
    const skipped = [];

    // PHASE 1: Process filesystem folders
    for (const folder of allFolders) {
      const appPath = path.join(appsDir, folder);
      const entryFile = findEntryFile(appPath);

      // Skip folders without any entry file
      if (!entryFile) {
        skipped.push({ folder, reason: 'No entry file found (server.js, index.js, app.js, or main.js)' });
        skippedCount++;
        continue;
      }

      // Check if folder name is valid
      if (!isValidAppName(folder)) {
        const sanitized = sanitizeFolderName(folder);
        
        if (!sanitized || sanitized.length < 3) {
          skipped.push({ folder, reason: 'Cannot sanitize to valid name' });
          skippedCount++;
          continue;
        }

        if (autoRename) {
          // Rename the folder
          const newPath = path.join(appsDir, sanitized);
          
          // Check if target already exists
          if (fsSync.existsSync(newPath)) {
            skipped.push({ folder, reason: `Cannot rename: ${sanitized} already exists` });
            skippedCount++;
            continue;
          }

          try {
            fsSync.renameSync(appPath, newPath);
            renamed.push({ from: folder, to: sanitized });
            renamedCount++;
            
            // Use sanitized name for database sync
            const existingApp = await App.findBySlug(sanitized);
            if (!existingApp) {
              const newApp = new App({
                name: sanitized,
                slug: sanitized,
                status: 'active',
                description: `Auto-synced from filesystem (renamed from ${folder})`,
                lastDeployedAt: new Date(),
                entryFile
              });
              await newApp.save();
              added.push(sanitized);
              addedCount++;
            }
          } catch (error) {
            skipped.push({ folder, reason: `Rename failed: ${error.message}` });
            skippedCount++;
          }
        } else {
          skipped.push({ folder, reason: 'Invalid name (use autoRename: true to fix)' });
          skippedCount++;
        }
        continue;
      }

      // Valid folder name - check if in database
      const existingApp = await App.findBySlug(folder);
      
      if (!existingApp) {
        try {
          // Validate entry file for forbidden patterns
          const entryFilePath = path.join(appPath, entryFile);
          const entryContent = fsSync.readFileSync(entryFilePath, 'utf-8');
          
          // Check for forbidden patterns
          const forbiddenPatterns = [
            /\b(app|server|express)\s*\.\s*listen\s*\(/i,
            /http\.createServer/i,
            /https\.createServer/i
          ];

          let cleanCode = entryContent
            .replace(/\/\*[\s\S]*?\*\//g, ' ')  // Remove multi-line comments
            .replace(/\/\/.*$/gm, '');           // Remove single-line comments

          let hasForbiddenPattern = false;
          for (const pattern of forbiddenPatterns) {
            if (pattern.test(cleanCode)) {
              hasForbiddenPattern = true;
              break;
            }
          }

          if (hasForbiddenPattern) {
            skipped.push({ folder, reason: 'Contains forbidden .listen() or createServer() calls' });
            skippedCount++;
            continue;
          }

          // Create new app entry
          const newApp = new App({
            name: folder,
            slug: folder,
            status: 'active',
            description: `Auto-synced from filesystem`,
            lastDeployedAt: new Date(),
            entryFile
          });

          await newApp.save();
          added.push(folder);
          addedCount++;
        } catch (error) {
          skipped.push({ folder, reason: `Database error: ${error.message}` });
          skippedCount++;
        }
      }
    }

    // PHASE 2: Remove database entries for deleted filesystem apps
    for (const dbApp of dbApps) {
      const appPath = path.join(appsDir, dbApp.slug);
      
      if (!fsSync.existsSync(appPath)) {
        await App.deleteOne({ slug: dbApp.slug });
        removed.push(dbApp.slug);
        removedCount++;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Sync completed successfully',
      sync: {
        added: addedCount,
        removed: removedCount,
        renamed: renamedCount,
        skipped: skippedCount,
        total: allFolders.length,
        addedApps: added,
        removedApps: removed,
        renamedApps: renamed,
        skippedApps: skipped
      }
    });

  } catch (error) {
    console.error('[ADMIN] Error syncing apps:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to sync apps with filesystem'
    });
  }
});

/**
 * GET /api/admin/apps/:slug/env
 * Get environment variables for an app
 */
router.get('/:slug/env', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    const envVars = await EnvManager.loadEnv(slug);

    return res.status(200).json({
      success: true,
      slug,
      env: envVars,  // Changed from envVars to env for frontend compatibility
      count: Object.keys(envVars).length
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching env:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch environment variables'
    });
  }
});

/**
 * PATCH /api/admin/apps/:slug/env
 * Update environment variables for an app
 */
router.patch('/:slug/env', async (req, res) => {
  try {
    const { slug } = req.params;
    const { env, envVars, action = 'merge' } = req.body;
    
    // Accept both 'env' and 'envVars' for backwards compatibility
    const variables = env || envVars;

    if (!variables || typeof variables !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'env object is required'
      });
    }

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Validate environment variable names
    const validation = EnvManager.validateEnvVars(variables);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid environment variables',
        details: validation.errors
      });
    }

    let updatedEnv;

    if (action === 'replace') {
      // Replace all env vars
      await EnvManager.saveEnv(slug, variables);
      updatedEnv = variables;
    } else {
      // Merge with existing
      updatedEnv = await EnvManager.updateEnv(slug, variables);
    }

    // Trigger app reload
    const wasLoaded = unloadApp(slug);
    
    await Logger.log(slug, 'env-update', 'Environment variables updated', {
      action,
      count: Object.keys(variables).length,
      wasLoaded
    });

    return res.status(200).json({
      success: true,
      slug,
      env: updatedEnv,  // Changed from envVars to env for frontend compatibility
      count: Object.keys(updatedEnv).length,
      reloaded: wasLoaded,
      message: 'Environment variables updated successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error updating env:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update environment variables'
    });
  }
});

/**
 * DELETE /api/admin/apps/:slug/env
 * Delete specific environment variables or entire .env file
 */
router.delete('/:slug/env', async (req, res) => {
  try {
    const { slug } = req.params;
    const { keys } = req.body;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    let result;

    if (keys && Array.isArray(keys) && keys.length > 0) {
      // Delete specific keys
      result = await EnvManager.deleteEnvKeys(slug, keys);
      await Logger.log(slug, 'env-update', `Deleted ${keys.length} environment variables`, { keys });
    } else {
      // Delete entire .env file
      const deleted = await EnvManager.deleteEnvFile(slug);
      result = {};
      await Logger.log(slug, 'env-update', 'Deleted .env file', { deleted });
    }

    // Trigger app reload
    const wasLoaded = unloadApp(slug);

    return res.status(200).json({
      success: true,
      slug,
      envVars: result,
      reloaded: wasLoaded,
      message: keys ? `Deleted ${keys.length} environment variables` : 'Deleted .env file'
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting env:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete environment variables'
    });
  }
});

/**
 * GET /api/admin/apps/:slug/logs
 * Get logs for a specific app
 */
router.get('/:slug/logs', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 100, format = 'json' } = req.query;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    if (format === 'text') {
      const logs = await Logger.getFileLog(slug, parseInt(limit));
      res.setHeader('Content-Type', 'text/plain');
      return res.send(logs);
    }

    const logs = await Logger.getLogs(slug, parseInt(limit));

    return res.status(200).json({
      success: true,
      slug,
      count: logs.length,
      logs
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching logs:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

/**
 * POST /api/admin/apps/:slug/backup
 * Create a backup of an app
 */
router.post('/:slug/backup', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Create backup
    const result = await backupManager.createBackup(slug, {
      name: app.name,
      slug: app.slug,
      description: app.description,
      status: app.status,
      createdAt: app.createdAt,
      deploymentMethod: app.deploymentMethod
    });

    await Logger.log(slug, 'backup', 'Backup created', { 
      backupFileName: result.backupFileName,
      size: result.size
    });

    return res.status(200).json({
      success: true,
      slug,
      backupPath: result.backupFileName,
      size: result.size,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error creating backup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to create backup'
    });
  }
});

/**
 * POST /api/admin/apps/:slug/webhook
 * Register a webhook for an app
 */
router.post('/:slug/webhook', async (req, res) => {
  try {
    const { slug } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Webhook URL is required'
      });
    }

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Register webhook
    webhookManager.registerWebhook(slug, url);

    // Save to database
    app.webhookUrl = url;
    await app.save();

    await Logger.log(slug, 'webhook', 'Webhook registered', { url });

    return res.status(200).json({
      success: true,
      slug,
      webhook: {
        url,
        events: ['deployed', 'started', 'stopped', 'error', 'updated']
      },
      message: 'Webhook registered successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error registering webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to register webhook'
    });
  }
});

/**
 * GET /api/admin/apps/:slug/webhook
 * Get webhook configuration for an app
 */
router.get('/:slug/webhook', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    if (!app.webhookUrl) {
      return res.status(404).json({
        success: false,
        error: 'No webhook configured for this app'
      });
    }

    return res.status(200).json({
      success: true,
      slug,
      webhook: {
        url: app.webhookUrl,
        events: ['deployed', 'started', 'stopped', 'error', 'updated']
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error fetching webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch webhook configuration'
    });
  }
});

/**
 * DELETE /api/admin/apps/:slug/webhook
 * Delete webhook configuration for an app
 */
router.delete('/:slug/webhook', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    // Unregister webhook
    webhookManager.unregisterWebhook(slug);

    // Remove from database
    app.webhookUrl = undefined;
    await app.save();

    await Logger.log(slug, 'webhook', 'Webhook deleted');

    return res.status(200).json({
      success: true,
      slug,
      message: 'Webhook deleted successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error deleting webhook:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete webhook'
    });
  }
});

/**
 * POST /api/admin/apps/:slug/webhook/test
 * Test webhook by sending a test event
 */
router.post('/:slug/webhook/test', async (req, res) => {
  try {
    const { slug } = req.params;

    const app = await App.findBySlug(slug);
    if (!app) {
      return res.status(404).json({
        success: false,
        error: `App '${slug}' not found`
      });
    }

    if (!app.webhookUrl) {
      return res.status(404).json({
        success: false,
        error: 'No webhook configured for this app'
      });
    }

    // Send test webhook
    await webhookManager.send(slug, 'test', {
      message: 'This is a test webhook event',
      app: {
        name: app.name,
        slug: app.slug,
        status: app.status
      },
      timestamp: new Date().toISOString()
    });

    return res.status(200).json({
      success: true,
      slug,
      message: 'Test webhook sent successfully'
    });
  } catch (error) {
    console.error('[ADMIN] Error testing webhook:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send test webhook'
    });
  }
});

module.exports = router;
