const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const backupManager = require('../utils/backupManager');
const Logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/admin/backups
 * List all available backups
 */
router.get('/', async (req, res) => {
  try {
    const backups = await backupManager.listBackups();

    return res.status(200).json({
      success: true,
      count: backups.length,
      backups
    });
  } catch (error) {
    console.error('[BACKUPS] Error listing backups:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to list backups'
    });
  }
});

/**
 * POST /api/admin/backups/restore
 * Restore an app from backup
 */
router.post('/restore', async (req, res) => {
  try {
    const { backupName, newName, overwrite } = req.body;

    if (!backupName) {
      return res.status(400).json({
        success: false,
        error: 'backupName is required'
      });
    }

    // Parse original app name from backup filename
    const originalAppName = backupName.split('-')[0];
    const targetAppName = newName || originalAppName;

    // Check if app exists and handle overwrite
    const App = require('../models/App');
    const existingApp = await App.findBySlug(targetAppName);
    
    if (existingApp && !overwrite) {
      return res.status(409).json({
        success: false,
        error: `App '${targetAppName}' already exists. Set overwrite=true to replace it.`
      });
    }

    // If overwriting, delete the existing app first
    if (existingApp && overwrite) {
      const appPath = path.join(__dirname, '../apps', targetAppName);
      if (fsSync.existsSync(appPath)) {
        await fs.rm(appPath, { recursive: true, force: true });
        await Logger.platform.info(`Deleted existing app for overwrite: ${targetAppName}`);
      }
      await existingApp.deleteOne();
    }

    // Restore the backup
    const result = await backupManager.restoreBackup(backupName, targetAppName);

    await Logger.platform.info(`Backup restored: ${backupName} -> ${targetAppName}`);

    return res.status(200).json({
      success: true,
      backupName,
      appName: targetAppName,
      overwrite: !!overwrite,
      message: 'Backup restored successfully',
      ...result
    });
  } catch (error) {
    console.error('[BACKUPS] Error restoring backup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to restore backup'
    });
  }
});

/**
 * DELETE /api/admin/backups/:backupName
 * Delete a backup file
 */
router.delete('/:backupName', async (req, res) => {
  try {
    const { backupName } = req.params;

    await backupManager.deleteBackup(backupName);

    await Logger.platform.info(`Backup deleted: ${backupName}`);

    return res.status(200).json({
      success: true,
      backupName,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('[BACKUPS] Error deleting backup:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete backup'
    });
  }
});

module.exports = router;
