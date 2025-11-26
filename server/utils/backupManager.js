const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const AdmZip = require('adm-zip');
const Logger = require('./logger');

/**
 * Backup and Restore Utilities
 * Create backups of apps and restore them
 */
class BackupManager {
  constructor() {
    this.backupDir = path.join(__dirname, '../backups');
    this.ensureBackupDir();
  }

  /**
   * Ensure backup directory exists
   */
  ensureBackupDir() {
    if (!fsSync.existsSync(this.backupDir)) {
      fsSync.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create backup of an app
   * @param {string} appName - App name to backup
   * @param {Object} appMetadata - App metadata from database
   * @returns {Promise<string>} - Path to backup file
   */
  async createBackup(appName, appMetadata) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFileName = `${appName}-${timestamp}.zip`;
      const backupPath = path.join(this.backupDir, backupFileName);
      
      const appPath = path.join(__dirname, '../apps', appName);
      
      // Check if app directory exists
      if (!fsSync.existsSync(appPath)) {
        throw new Error(`App directory not found: ${appPath}`);
      }

      // Create ZIP archive
      const zip = new AdmZip();
      
      // Add app files
      zip.addLocalFolder(appPath, appName);
      
      // Add metadata as JSON
      const metadata = {
        appName: appMetadata.name,
        slug: appMetadata.slug,
        appType: appMetadata.appType,
        entryFile: appMetadata.entryFile,
        buildDir: appMetadata.buildDir,
        proxyConfig: appMetadata.proxyConfig ? Object.fromEntries(appMetadata.proxyConfig) : null,
        description: appMetadata.description,
        deploymentMethod: appMetadata.deploymentMethod,
        repoUrl: appMetadata.repoUrl,
        repoBranch: appMetadata.repoBranch,
        createdAt: appMetadata.createdAt,
        backupDate: new Date().toISOString()
      };
      
      zip.addFile('metadata.json', Buffer.from(JSON.stringify(metadata, null, 2)));
      
      // Write ZIP file
      zip.writeZip(backupPath);
      
      Logger.platform.info(`Backup created for ${appName}: ${backupFileName}`);
      
      return {
        success: true,
        backupPath,
        backupFileName,
        size: fsSync.statSync(backupPath).size
      };

    } catch (error) {
      Logger.platform.error(`Backup failed for ${appName}:`, error);
      throw error;
    }
  }

  /**
   * List all backups
   * @returns {Promise<Array>} - List of backup files
   */
  async listBackups() {
    try {
      const files = await fs.readdir(this.backupDir);
      const backups = [];

      for (const file of files) {
        if (file.endsWith('.zip')) {
          const filePath = path.join(this.backupDir, file);
          const stats = await fs.stat(filePath);
          
          // Parse filename: appname-timestamp.zip
          const match = file.match(/^(.+)-(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}.*?)\.zip$/);
          
          backups.push({
            filename: file,
            appName: match ? match[1] : 'unknown',
            timestamp: match ? match[2].replace(/-/g, ':').replace('T', ' ') : 'unknown',
            size: stats.size,
            sizeFormatted: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
            created: stats.birthtime,
            path: filePath
          });
        }
      }

      // Sort by creation date (newest first)
      backups.sort((a, b) => b.created - a.created);

      return backups;

    } catch (error) {
      Logger.platform.error('Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Restore app from backup
   * @param {string} backupFileName - Backup file name
   * @param {string} targetAppName - Target app name (optional, use original if not specified)
   * @returns {Promise<Object>} - Restore result
   */
  async restoreBackup(backupFileName, targetAppName = null) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      // Check if backup exists
      if (!fsSync.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      // Extract backup
      const zip = new AdmZip(backupPath);
      const zipEntries = zip.getEntries();
      
      // Read metadata
      const metadataEntry = zipEntries.find(e => e.entryName === 'metadata.json');
      if (!metadataEntry) {
        throw new Error('Backup metadata not found');
      }
      
      const metadata = JSON.parse(metadataEntry.getData().toString('utf8'));
      const appName = targetAppName || metadata.slug;
      
      // Extract app files
      const extractPath = path.join(__dirname, '../apps', appName);
      
      // Check if target already exists
      if (fsSync.existsSync(extractPath)) {
        throw new Error(`App directory already exists: ${appName}. Delete it first or choose a different name.`);
      }

      // Extract all entries except metadata.json
      for (const entry of zipEntries) {
        if (entry.entryName !== 'metadata.json') {
          // Remove app name prefix from entry name if present
          let entryPath = entry.entryName;
          if (entryPath.startsWith(metadata.slug + '/')) {
            entryPath = entryPath.substring(metadata.slug.length + 1);
          }
          
          const targetPath = path.join(extractPath, entryPath);
          
          if (entry.isDirectory) {
            fsSync.mkdirSync(targetPath, { recursive: true });
          } else {
            const dir = path.dirname(targetPath);
            if (!fsSync.existsSync(dir)) {
              fsSync.mkdirSync(dir, { recursive: true });
            }
            await fs.writeFile(targetPath, entry.getData());
          }
        }
      }

      Logger.platform.info(`Backup restored: ${backupFileName} -> ${appName}`);
      
      return {
        success: true,
        appName,
        metadata: {
          ...metadata,
          slug: appName // Update slug if renamed
        }
      };

    } catch (error) {
      Logger.platform.error(`Restore failed for ${backupFileName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a backup file
   * @param {string} backupFileName - Backup file to delete
   * @returns {Promise<boolean>}
   */
  async deleteBackup(backupFileName) {
    try {
      const backupPath = path.join(this.backupDir, backupFileName);
      
      if (!fsSync.existsSync(backupPath)) {
        throw new Error(`Backup file not found: ${backupFileName}`);
      }

      await fs.unlink(backupPath);
      Logger.platform.info(`Backup deleted: ${backupFileName}`);
      
      return true;

    } catch (error) {
      Logger.platform.error(`Failed to delete backup ${backupFileName}:`, error);
      throw error;
    }
  }

  /**
   * Clean old backups (older than specified days)
   * @param {number} days - Delete backups older than this many days
   * @returns {Promise<number>} - Number of backups deleted
   */
  async cleanOldBackups(days = 30) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      let deletedCount = 0;

      for (const backup of backups) {
        if (backup.created < cutoffDate) {
          await this.deleteBackup(backup.filename);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        Logger.platform.info(`Cleaned ${deletedCount} old backups (older than ${days} days)`);
      }

      return deletedCount;

    } catch (error) {
      Logger.platform.error('Failed to clean old backups:', error);
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new BackupManager();
