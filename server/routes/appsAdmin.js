const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const App = require('../models/App');

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

    // Delete app folder if it exists
    const appPath = path.join(__dirname, '../apps', slug);
    if (fsSync.existsSync(appPath)) {
      await fs.rm(appPath, { recursive: true, force: true });
      console.log(`[ADMIN] Deleted app folder: ${appPath}`);
    }

    // Delete from database
    await App.deleteOne({ slug });

    console.log(`[ADMIN] Deleted app: ${slug}`);

    return res.status(200).json({
      success: true,
      slug
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
 * Trigger a redeploy (for future use, currently just updates timestamp)
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

    // Update lastDeployedAt
    app.lastDeployedAt = new Date();
    await app.save();

    console.log(`[ADMIN] Redeployed app: ${slug}`);

    return res.status(200).json({
      success: true,
      slug,
      lastDeployedAt: app.lastDeployedAt,
      message: 'App redeployed successfully'
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
 * POST /api/admin/apps/sync
 * Sync filesystem with database (bi-directional)
 */
router.post('/sync', async (req, res) => {
  try {
    const appsDir = path.join(__dirname, '../apps');
    
    // Get all filesystem folders
    const folders = fsSync.readdirSync(appsDir).filter(folder => {
      const appPath = path.join(appsDir, folder);
      return fsSync.statSync(appPath).isDirectory();
    });

    // Get all database apps
    const dbApps = await App.find({});

    let addedCount = 0;
    let removedCount = 0;
    const added = [];
    const removed = [];

    // PHASE 1: Add missing apps from filesystem to database
    for (const folder of folders) {
      const existingApp = await App.findBySlug(folder);
      
      if (!existingApp) {
        const appPath = path.join(appsDir, folder);
        const serverFile = path.join(appPath, 'server.js');
        const hasServerFile = fsSync.existsSync(serverFile);

        if (!hasServerFile) {
          continue; // Skip folders without server.js
        }

        // Create new app entry
        const newApp = new App({
          name: folder,
          slug: folder,
          status: 'active',
          description: `Auto-synced from filesystem`,
          lastDeployedAt: new Date()
        });

        await newApp.save();
        added.push(folder);
        addedCount++;
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
        total: folders.length,
        addedApps: added,
        removedApps: removed
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

module.exports = router;
