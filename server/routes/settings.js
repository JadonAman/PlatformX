const express = require('express');
const Settings = require('../models/Settings');
const Logger = require('../utils/logger');

const router = express.Router();

/**
 * GET /api/admin/settings
 * Get all platform settings
 */
router.get('/', async (req, res) => {
  try {
    const settings = await Settings.getAllSettings(false); // Don't expose encrypted values directly
    
    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('[SETTINGS] Error fetching settings:', error);
    await Logger.log('system', 'error', `Failed to fetch settings: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

/**
 * GET /api/admin/settings/:key
 * Get a specific setting by key
 */
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await Settings.getSetting(key);
    
    if (value === null) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }
    
    res.json({
      success: true,
      key,
      value
    });
  } catch (error) {
    console.error('[SETTINGS] Error fetching setting:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch setting'
    });
  }
});

/**
 * PUT /api/admin/settings
 * Update multiple settings at once
 */
router.put('/', async (req, res) => {
  try {
    const { settings } = req.body;
    
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Settings object is required'
      });
    }
    
    const updates = [];
    const errors = [];
    
    // Process each setting
    for (const [key, config] of Object.entries(settings)) {
      try {
        const { value, category = 'general', description = '', encrypted = false } = config;
        
        await Settings.setSetting(key, value, category, description, encrypted);
        updates.push(key);
      } catch (error) {
        errors.push({ key, error: error.message });
      }
    }
    
    await Logger.log('system', 'settings', `Updated settings: ${updates.join(', ')}`);
    
    res.json({
      success: true,
      updated: updates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('[SETTINGS] Error updating settings:', error);
    await Logger.log('system', 'error', `Failed to update settings: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update settings'
    });
  }
});

/**
 * PUT /api/admin/settings/:key
 * Update a specific setting
 */
router.put('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value, category = 'general', description = '', encrypted = false } = req.body;
    
    if (value === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Value is required'
      });
    }
    
    await Settings.setSetting(key, value, category, description, encrypted);
    await Logger.log('system', 'settings', `Updated setting: ${key}`);
    
    res.json({
      success: true,
      key,
      value
    });
  } catch (error) {
    console.error('[SETTINGS] Error updating setting:', error);
    await Logger.log('system', 'error', `Failed to update setting ${key}: ${error.message}`);
    
    res.status(500).json({
      success: false,
      error: 'Failed to update setting'
    });
  }
});

/**
 * DELETE /api/admin/settings/:key
 * Delete a specific setting
 */
router.delete('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    
    const result = await Settings.deleteSetting(key);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Setting not found'
      });
    }
    
    await Logger.log('system', 'settings', `Deleted setting: ${key}`);
    
    res.json({
      success: true,
      message: 'Setting deleted successfully'
    });
  } catch (error) {
    console.error('[SETTINGS] Error deleting setting:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to delete setting'
    });
  }
});

/**
 * GET /api/admin/settings/category/:category
 * Get all settings in a specific category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    
    const settings = await Settings.getByCategory(category);
    
    res.json({
      success: true,
      category,
      settings
    });
  } catch (error) {
    console.error('[SETTINGS] Error fetching settings by category:', error);
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch settings'
    });
  }
});

module.exports = router;
