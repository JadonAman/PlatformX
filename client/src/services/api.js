import axios from 'axios';

const API_BASE_URL = 'http://platformx.localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle 401 errors and capture request IDs
api.interceptors.response.use(
  (response) => {
    // Capture request ID from response headers
    const requestId = response.headers['x-request-id'];
    if (requestId && response.data) {
      response.data._requestId = requestId;
    }
    return response;
  },
  (error) => {
    // Capture request ID from error response
    const requestId = error.response?.headers?.['x-request-id'];
    if (requestId && error.response) {
      if (!error.response.data) error.response.data = {};
      error.response.data._requestId = requestId;
    }
    
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Admin Apps API
export const appsAPI = {
  // List all apps
  listApps: (status) => {
    const params = status ? { status } : {};
    return api.get('/api/admin/apps', { params });
  },

  // Get app details
  getApp: (slug) => {
    return api.get(`/api/admin/apps/${slug}`);
  },

  // Create app manually
  createApp: (data) => {
    return api.post('/api/admin/apps', data);
  },

  // Update app
  updateApp: (slug, data) => {
    return api.patch(`/api/admin/apps/${slug}`, data);
  },

  // Delete app
  deleteApp: (slug) => {
    return api.delete(`/api/admin/apps/${slug}`);
  },

  // Redeploy app
  redeployApp: (slug) => {
    return api.post(`/api/admin/apps/${slug}/redeploy`);
  },

  // Rename app
  renameApp: (slug, newName) => {
    return api.post(`/api/admin/apps/${slug}/rename`, { newName });
  },

  // Sync filesystem with database
  syncApps: (autoRename = false) => {
    return api.post('/api/admin/apps/sync', { autoRename });
  },

  // Upload ZIP
  uploadZip: (formData, onUploadProgress) => {
    return api.post('/api/apps/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },

  // Git import
  gitImport: (data) => {
    return api.post('/api/apps/git-import', data);
  },

  // Git update
  gitUpdate: (slug) => {
    return api.post(`/api/apps/git-update/${slug}`);
  },

  // Environment variables
  getEnv: (slug) => {
    return api.get(`/api/admin/apps/${slug}/env`);
  },

  updateEnv: (slug, data) => {
    return api.patch(`/api/admin/apps/${slug}/env`, data);
  },

  deleteEnv: (slug, keys) => {
    return api.delete(`/api/admin/apps/${slug}/env`, { data: { keys } });
  },

  deleteEnvFile: (slug) => {
    return api.delete(`/api/admin/apps/${slug}/env`);
  },

  // Logs
  getLogs: (slug, format = 'json') => {
    return api.get(`/api/admin/apps/${slug}/logs`, { params: { format } });
  },
};

// Platform API (for cached apps, health, metrics, etc.)
export const platformAPI = {
  // Health checks
  getHealth: () => {
    return api.get('/health');
  },

  getHealthLive: () => {
    return api.get('/health/live');
  },

  getHealthReady: () => {
    return api.get('/health/ready');
  },

  // Metrics
  getMetrics: () => {
    return api.get('/api/metrics');
  },

  // API Info
  getApiDocs: () => {
    return api.get('/api/docs');
  },

  getApiVersion: () => {
    return api.get('/api/version');
  },

  getApiStatus: () => {
    return api.get('/api/status');
  },

  // Get cached apps
  getCachedApps: () => {
    return api.get('/api/apps/cached');
  },

  // Unload app
  unloadApp: (appName) => {
    return api.post(`/api/apps/${appName}/unload`);
  },

  // Unload idle apps
  unloadIdleApps: (idleThresholdMinutes = 15) => {
    return api.post('/api/apps/unload-idle', {
      idleThreshold: idleThresholdMinutes * 60 * 1000 // Convert minutes to milliseconds
    });
  },
};

// Backup & Restore API
export const backupAPI = {
  // Create backup
  createBackup: (slug) => {
    return api.post(`/api/admin/apps/${slug}/backup`);
  },

  // List backups
  listBackups: () => {
    return api.get('/api/admin/backups');
  },

  // Restore backup
  restoreBackup: (backupName, options = {}) => {
    return api.post('/api/admin/backups/restore', {
      backupName,
      ...options
    });
  },

  // Delete backup
  deleteBackup: (backupName) => {
    return api.delete(`/api/admin/backups/${backupName}`);
  },
};

// Webhook API
export const webhookAPI = {
  // Register webhook
  registerWebhook: (slug, webhookUrl) => {
    return api.post(`/api/admin/apps/${slug}/webhook`, { webhookUrl });
  },

  // Get webhook
  getWebhook: (slug) => {
    return api.get(`/api/admin/apps/${slug}/webhook`);
  },

  // Delete webhook
  deleteWebhook: (slug) => {
    return api.delete(`/api/admin/apps/${slug}/webhook`);
  },

  // Test webhook
  testWebhook: (slug) => {
    return api.post(`/api/admin/apps/${slug}/webhook/test`);
  },
};

// Settings API
export const settingsAPI = {
  // Get all settings
  getAll: () => {
    return api.get('/api/admin/settings');
  },

  // Get setting by key
  get: (key) => {
    return api.get(`/api/admin/settings/${key}`);
  },

  // Update multiple settings
  updateMultiple: (data) => {
    return api.put('/api/admin/settings', data);
  },

  // Update single setting
  update: (key, data) => {
    return api.put(`/api/admin/settings/${key}`, data);
  },

  // Delete setting
  delete: (key) => {
    return api.delete(`/api/admin/settings/${key}`);
  },

  // Get settings by category
  getByCategory: (category) => {
    return api.get(`/api/admin/settings/category/${category}`);
  },
};

export default api;
