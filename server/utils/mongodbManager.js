const { MongoClient } = require('mongodb');

let globalClient = null;
let clientPromise = null;

/**
 * MongoDB Connection Manager
 * Maintains a single MongoDB client instance for all apps
 */
class MongoDBManager {
  /**
   * Initialize the global MongoDB client
   * @param {string} uri - MongoDB connection URI
   * @returns {Promise<MongoClient>}
   */
  static async connect(uri) {
    if (globalClient) {
      return globalClient;
    }

    if (clientPromise) {
      return await clientPromise;
    }

    clientPromise = new Promise(async (resolve, reject) => {
      try {
        const client = new MongoClient(uri, {
          maxPoolSize: 50,
          minPoolSize: 10,
          maxIdleTimeMS: 30000,
          serverSelectionTimeoutMS: 5000,
          socketTimeoutMS: 45000,
        });

        await client.connect();
        
        // Test connection
        await client.db('admin').command({ ping: 1 });
        
        globalClient = client;
        console.log('[MONGODB_MANAGER] ✅ Connected to MongoDB');
        
        resolve(client);
      } catch (error) {
        console.error('[MONGODB_MANAGER] ❌ Failed to connect:', error.message);
        clientPromise = null;
        reject(error);
      }
    });

    return await clientPromise;
  }

  /**
   * Get the global MongoDB client
   * @returns {MongoClient|null}
   */
  static getClient() {
    return globalClient;
  }

  /**
   * Get a database instance for a specific app
   * @param {string} appName - App name (used as database name)
   * @returns {Db|null} - MongoDB database instance
   */
  static getAppDatabase(appName) {
    if (!globalClient) {
      console.error('[MONGODB_MANAGER] Client not initialized');
      return null;
    }

    // Sanitize database name (MongoDB naming rules)
    const dbName = this.sanitizeDatabaseName(appName);
    
    return globalClient.db(dbName);
  }

  /**
   * Sanitize app name to be a valid MongoDB database name
   * @param {string} appName - App name
   * @returns {string} - Sanitized database name
   */
  static sanitizeDatabaseName(appName) {
    // MongoDB database names: 1-64 chars, no special chars except hyphen/underscore
    // Convert hyphens to underscores, prefix with 'app_'
    return `app_${appName.replace(/-/g, '_')}`;
  }

  /**
   * List all app databases
   * @returns {Promise<Array<string>>}
   */
  static async listAppDatabases() {
    if (!globalClient) {
      return [];
    }

    try {
      const adminDb = globalClient.db('admin');
      const result = await adminDb.command({ listDatabases: 1 });
      
      return result.databases
        .map(db => db.name)
        .filter(name => name.startsWith('app_'));
    } catch (error) {
      console.error('[MONGODB_MANAGER] Failed to list databases:', error.message);
      return [];
    }
  }

  /**
   * Drop an app's database (use with caution!)
   * @param {string} appName - App name
   * @returns {Promise<boolean>}
   */
  static async dropAppDatabase(appName) {
    if (!globalClient) {
      return false;
    }

    try {
      const dbName = this.sanitizeDatabaseName(appName);
      const db = globalClient.db(dbName);
      
      await db.dropDatabase();
      console.log(`[MONGODB_MANAGER] Dropped database: ${dbName}`);
      
      return true;
    } catch (error) {
      console.error(`[MONGODB_MANAGER] Failed to drop database for ${appName}:`, error.message);
      return false;
    }
  }

  /**
   * Get database statistics for an app
   * @param {string} appName - App name
   * @returns {Promise<Object>}
   */
  static async getAppDatabaseStats(appName) {
    if (!globalClient) {
      return null;
    }

    try {
      const dbName = this.sanitizeDatabaseName(appName);
      const db = globalClient.db(dbName);
      
      const stats = await db.stats();
      
      return {
        database: dbName,
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects
      };
    } catch (error) {
      console.error(`[MONGODB_MANAGER] Failed to get stats for ${appName}:`, error.message);
      return null;
    }
  }

  /**
   * Close the MongoDB connection
   */
  static async close() {
    if (globalClient) {
      try {
        await globalClient.close();
        globalClient = null;
        clientPromise = null;
        console.log('[MONGODB_MANAGER] Connection closed');
      } catch (error) {
        console.error('[MONGODB_MANAGER] Error closing connection:', error.message);
      }
    }
  }

  /**
   * Disconnect (alias for close)
   */
  static async disconnect() {
    return this.close();
  }
}

module.exports = MongoDBManager;
