const axios = require('axios');
const Logger = require('./logger');

/**
 * Webhook Manager
 * Sends webhook notifications for deployment events
 */
class WebhookManager {
  constructor() {
    this.webhooks = new Map(); // appName -> webhook URL
    this.enabled = process.env.WEBHOOKS_ENABLED === 'true';
  }

  /**
   * Register webhook for an app
   * @param {string} appName - App name
   * @param {string} webhookUrl - Webhook URL
   */
  registerWebhook(appName, webhookUrl) {
    if (!webhookUrl || typeof webhookUrl !== 'string') {
      throw new Error('Invalid webhook URL');
    }

    // Validate URL format
    try {
      new URL(webhookUrl);
    } catch (error) {
      throw new Error('Invalid webhook URL format');
    }

    this.webhooks.set(appName, webhookUrl);
    Logger.platform.info(`Webhook registered for ${appName}: ${webhookUrl}`);
  }

  /**
   * Unregister webhook for an app
   * @param {string} appName - App name
   */
  unregisterWebhook(appName) {
    this.webhooks.delete(appName);
    Logger.platform.info(`Webhook unregistered for ${appName}`);
  }

  /**
   * Send webhook notification
   * @param {string} appName - App name
   * @param {string} event - Event type
   * @param {Object} data - Event data
   */
  async send(appName, event, data = {}) {
    if (!this.enabled) {
      Logger.platform.debug('Webhooks disabled, skipping notification');
      return;
    }

    const webhookUrl = this.webhooks.get(appName);
    if (!webhookUrl) {
      Logger.platform.debug(`No webhook registered for ${appName}`);
      return;
    }

    const payload = {
      event,
      appName,
      timestamp: new Date().toISOString(),
      data
    };

    try {
      const response = await axios.post(webhookUrl, payload, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'PlatformX-Webhook/1.0',
          'X-PlatformX-Event': event,
          'X-PlatformX-App': appName
        }
      });

      Logger.platform.info(`Webhook sent for ${appName}:${event} - Status: ${response.status}`);
      
      return {
        success: true,
        status: response.status
      };

    } catch (error) {
      Logger.platform.error(`Webhook failed for ${appName}:${event}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Notify app deployed event
   */
  async notifyDeployed(appName, data = {}) {
    return this.send(appName, 'app.deployed', data);
  }

  /**
   * Notify app updated event
   */
  async notifyUpdated(appName, data = {}) {
    return this.send(appName, 'app.updated', data);
  }

  /**
   * Notify app deleted event
   */
  async notifyDeleted(appName, data = {}) {
    return this.send(appName, 'app.deleted', data);
  }

  /**
   * Notify app error event
   */
  async notifyError(appName, error, data = {}) {
    return this.send(appName, 'app.error', {
      error: error.message || error,
      ...data
    });
  }

  /**
   * Notify build completed event
   */
  async notifyBuildCompleted(appName, success, data = {}) {
    return this.send(appName, 'app.build.completed', {
      success,
      ...data
    });
  }

  /**
   * Notify build failed event
   */
  async notifyBuildFailed(appName, error, data = {}) {
    return this.send(appName, 'app.build.failed', {
      error: error.message || error,
      ...data
    });
  }

  /**
   * Get all registered webhooks
   */
  getWebhooks() {
    return Array.from(this.webhooks.entries()).map(([appName, url]) => ({
      appName,
      webhookUrl: url
    }));
  }

  /**
   * Check if webhook is registered for an app
   */
  hasWebhook(appName) {
    return this.webhooks.has(appName);
  }

  /**
   * Test webhook (send test ping)
   */
  async testWebhook(appName) {
    return this.send(appName, 'webhook.test', {
      message: 'This is a test webhook notification'
    });
  }
}

// Export singleton instance
module.exports = new WebhookManager();
