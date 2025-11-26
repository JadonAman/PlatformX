import axios from 'axios';

const API_BASE_URL = 'http://platformx.localhost:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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

  // Sync filesystem with database
  syncApps: () => {
    return api.post('/api/admin/apps/sync');
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
};

// Platform API (for cached apps, health, etc.)
export const platformAPI = {
  // Get platform health
  getHealth: () => {
    return api.get('/api/health');
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

export default api;
