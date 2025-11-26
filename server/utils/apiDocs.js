/**
 * API Documentation
 * Complete API reference for PlatformX
 */

const apiDocs = {
  version: '1.0.0',
  title: 'PlatformX API Documentation',
  description: 'Complete API reference for the PlatformX multi-tenant hosting platform',
  
  baseUrl: 'http://platformx.localhost:5000',
  
  authentication: {
    type: 'JWT Bearer Token',
    description: 'Most endpoints require authentication. Include token in Authorization header',
    header: 'Authorization: Bearer <token>',
    loginEndpoint: '/api/auth/login'
  },

  endpoints: {
    // Authentication
    authentication: {
      login: {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Authenticate admin user and receive JWT token',
        auth: false,
        rateLimit: '5 requests per 15 minutes per IP',
        body: {
          username: 'string (required)',
          password: 'string (required)'
        },
        responses: {
          200: {
            success: true,
            message: 'Login successful',
            token: 'jwt-token-string',
            user: { username: 'admin', role: 'admin' }
          },
          401: 'Invalid credentials',
          429: 'Too many login attempts'
        }
      },
      verify: {
        method: 'GET',
        path: '/api/auth/verify',
        description: 'Verify JWT token validity',
        auth: true,
        responses: {
          200: { success: true, user: {} },
          401: 'Invalid or expired token'
        }
      }
    },

    // Health Checks
    health: {
      healthCheck: {
        method: 'GET',
        path: '/health',
        description: 'Comprehensive health check with database and memory status',
        auth: false,
        responses: {
          200: 'System healthy',
          503: 'System unhealthy'
        }
      },
      liveness: {
        method: 'GET',
        path: '/health/live',
        description: 'Liveness probe - server is running',
        auth: false
      },
      readiness: {
        method: 'GET',
        path: '/health/ready',
        description: 'Readiness probe - server ready to accept traffic',
        auth: false
      }
    },

    // Metrics
    metrics: {
      getMetrics: {
        method: 'GET',
        path: '/api/metrics',
        description: 'Get server metrics (requests, response times, errors, memory)',
        auth: true,
        responses: {
          200: {
            requests: {},
            responseTimes: {},
            errors: {},
            memory: {},
            uptime: 'seconds'
          }
        }
      }
    },

    // App Management
    apps: {
      listApps: {
        method: 'GET',
        path: '/api/admin/apps',
        description: 'List all deployed apps',
        auth: true,
        query: {
          status: 'active|disabled|error (optional)'
        },
        responses: {
          200: { success: true, apps: [] }
        }
      },
      getApp: {
        method: 'GET',
        path: '/api/admin/apps/:slug',
        description: 'Get details of a specific app',
        auth: true,
        params: {
          slug: 'App name/slug'
        },
        responses: {
          200: { success: true, app: {} },
          404: 'App not found'
        }
      },
      createApp: {
        method: 'POST',
        path: '/api/admin/apps',
        description: 'Create app manually',
        auth: true,
        body: {
          name: 'string (required)',
          slug: 'string (required)',
          appType: 'backend|frontend|fullstack (optional)',
          description: 'string (optional)'
        }
      },
      updateApp: {
        method: 'PATCH',
        path: '/api/admin/apps/:slug',
        description: 'Update app metadata',
        auth: true,
        body: {
          name: 'string (optional)',
          description: 'string (optional)',
          status: 'active|disabled|error (optional)'
        }
      },
      deleteApp: {
        method: 'DELETE',
        path: '/api/admin/apps/:slug',
        description: 'Delete an app and its files',
        auth: true,
        responses: {
          200: { success: true, message: 'App deleted' },
          404: 'App not found'
        }
      },
      syncApps: {
        method: 'POST',
        path: '/api/admin/apps/sync',
        description: 'Sync filesystem with database',
        auth: true,
        body: {
          autoRename: 'boolean (optional)'
        }
      }
    },

    // App Deployment
    deployment: {
      uploadZip: {
        method: 'POST',
        path: '/api/apps/upload',
        description: 'Deploy app via ZIP upload',
        auth: true,
        contentType: 'multipart/form-data',
        body: {
          file: 'ZIP file (max 50MB)',
          appName: 'string (3-63 chars, lowercase, alphanumeric + hyphens)',
          entryFile: 'string (optional, default: server.js)',
          appType: 'backend|frontend|fullstack (optional, default: backend)',
          buildDir: 'string (optional, for frontend apps)',
          proxyConfig: 'JSON string (optional, for frontend apps)'
        },
        responses: {
          201: { success: true, message: 'App deployed', app: {} },
          400: 'Validation error',
          409: 'App already exists'
        }
      },
      gitImport: {
        method: 'POST',
        path: '/api/apps/git-import',
        description: 'Deploy app from Git repository',
        auth: true,
        body: {
          repoUrl: 'string (required, Git URL)',
          appName: 'string (required)',
          branch: 'string (optional, default: main)',
          entryFile: 'string (optional, default: server.js)',
          appType: 'backend|frontend|fullstack (optional)',
          buildDir: 'string (optional)',
          proxyConfig: 'object (optional)'
        },
        responses: {
          201: { success: true, message: 'App deployed from Git', app: {} },
          400: 'Invalid Git URL or validation error',
          500: 'Git clone failed'
        }
      },
      gitUpdate: {
        method: 'POST',
        path: '/api/apps/git-update/:slug',
        description: 'Update app from Git repository (pull latest code)',
        auth: true,
        params: {
          slug: 'App name'
        },
        body: {
          branch: 'string (optional, defaults to app\'s current branch)'
        },
        responses: {
          200: {
            success: true,
            message: 'App updated',
            details: {
              branch: 'string',
              buildStatus: 'success|failed',
              buildOutput: 'string'
            }
          },
          400: 'App not deployed via Git',
          404: 'App not found',
          500: 'Git pull failed'
        }
      }
    },

    // Environment Variables
    environment: {
      getEnv: {
        method: 'GET',
        path: '/api/admin/apps/:slug/env',
        description: 'Get app environment variables',
        auth: true,
        responses: {
          200: { success: true, envVars: {} }
        }
      },
      updateEnv: {
        method: 'PUT',
        path: '/api/admin/apps/:slug/env',
        description: 'Update app environment variables',
        auth: true,
        body: {
          envVars: 'object (key-value pairs)'
        },
        responses: {
          200: { success: true, message: 'Environment updated' }
        }
      }
    },

    // Logs
    logs: {
      getAppLogs: {
        method: 'GET',
        path: '/api/admin/apps/:slug/logs',
        description: 'Get app logs',
        auth: true,
        query: {
          limit: 'number (default: 50, max: 100)',
          level: 'info|warn|error|debug (optional)',
          startDate: 'ISO date string (optional)',
          endDate: 'ISO date string (optional)'
        },
        responses: {
          200: { success: true, logs: [] }
        }
      }
    }
  },

  // Error Codes
  errorCodes: {
    1001: 'Invalid credentials',
    1002: 'Token expired',
    1003: 'Invalid token',
    1004: 'Unauthorized',
    1005: 'Rate limit exceeded',
    2001: 'Validation failed',
    2002: 'Invalid app name',
    2003: 'Reserved app name',
    2004: 'App already exists',
    2005: 'File too large',
    2006: 'Invalid file type',
    2007: 'Invalid Git URL',
    3001: 'App not found',
    3002: 'App already exists',
    3003: 'App load failed',
    3004: 'Forbidden code pattern',
    3005: 'Build failed',
    3006: 'Not Git deployed',
    4001: 'Database connection failed',
    4002: 'Database query failed',
    5001: 'File read failed',
    5002: 'File write failed',
    5003: 'File delete failed',
    6001: 'Git clone failed',
    6002: 'Git pull failed',
    7001: 'Internal server error',
    7002: 'Request timeout',
    7003: 'Service unavailable'
  },

  // Reserved Names
  reservedNames: [
    'api', 'admin', 'www', 'ftp', 'mail',
    'platformx', 'platform', 'dashboard', 'console',
    'auth', 'login', 'logout', 'register', 'signup'
  ],

  // App Name Rules
  appNameRules: {
    minLength: 3,
    maxLength: 63,
    pattern: '^[a-z0-9-]+$',
    restrictions: [
      'Must be lowercase',
      'Only letters, numbers, and hyphens',
      'Cannot start or end with hyphen',
      'Cannot contain consecutive hyphens',
      'Cannot use reserved names'
    ]
  },

  // Rate Limits
  rateLimits: {
    login: '5 requests per 15 minutes per IP',
    api: 'No limit currently (consider implementing)',
    upload: '50MB file size limit'
  },

  // Settings API
  settings: {
    getAll: {
      method: 'GET',
      path: '/api/admin/settings',
      description: 'Get all platform settings',
      auth: true,
      responses: {
        200: {
          success: true,
          settings: {
            'github.token': {
              value: 'ghp_xxx...',
              category: 'github',
              description: 'GitHub Personal Access Token',
              encrypted: false
            }
          }
        },
        500: 'Failed to fetch settings'
      }
    },
    getSetting: {
      method: 'GET',
      path: '/api/admin/settings/:key',
      description: 'Get a specific setting by key',
      auth: true,
      params: { key: 'Setting key (e.g., github.token)' },
      responses: {
        200: { success: true, key: 'github.token', value: 'ghp_xxx...' },
        404: 'Setting not found',
        500: 'Failed to fetch setting'
      }
    },
    updateMultiple: {
      method: 'PUT',
      path: '/api/admin/settings',
      description: 'Update multiple settings at once',
      auth: true,
      body: {
        settings: {
          'github.token': {
            value: 'ghp_xxxxx',
            category: 'github',
            description: 'GitHub token',
            encrypted: false
          }
        }
      },
      responses: {
        200: { success: true, updated: ['github.token'], errors: [] },
        400: 'Invalid request body',
        500: 'Failed to update settings'
      }
    },
    updateSingle: {
      method: 'PUT',
      path: '/api/admin/settings/:key',
      description: 'Update a single setting',
      auth: true,
      params: { key: 'Setting key' },
      body: {
        value: 'new-value',
        category: 'github',
        description: 'Setting description',
        encrypted: false
      },
      responses: {
        200: { success: true, key: 'github.token', value: 'ghp_xxx' },
        400: 'Value is required',
        500: 'Failed to update setting'
      }
    },
    deleteSetting: {
      method: 'DELETE',
      path: '/api/admin/settings/:key',
      description: 'Delete a specific setting',
      auth: true,
      params: { key: 'Setting key to delete' },
      responses: {
        200: { success: true, message: 'Setting deleted successfully' },
        404: 'Setting not found',
        500: 'Failed to delete setting'
      }
    },
    getByCategory: {
      method: 'GET',
      path: '/api/admin/settings/category/:category',
      description: 'Get all settings in a specific category',
      auth: true,
      params: { category: 'Category name (github, backup, webhook, system)' },
      responses: {
        200: {
          success: true,
          category: 'github',
          settings: { 'github.token': 'ghp_xxx...' }
        },
        500: 'Failed to fetch settings'
      }
    }
  },

  // Examples
  examples: {
    deployBackendApp: {
      description: 'Deploy a Node.js backend app from Git',
      request: {
        method: 'POST',
        url: '/api/apps/git-import',
        headers: {
          'Authorization': 'Bearer <token>',
          'Content-Type': 'application/json'
        },
        body: {
          repoUrl: 'https://github.com/username/my-backend.git',
          appName: 'my-backend',
          branch: 'main',
          entryFile: 'server.js',
          appType: 'backend',
          githubToken: 'ghp_xxx... (optional, for private repos)'
        }
      }
    },
    deployFrontendApp: {
      description: 'Deploy a React frontend app with proxy',
      request: {
        method: 'POST',
        url: '/api/apps/git-import',
        headers: {
          'Authorization': 'Bearer <token>',
          'Content-Type': 'application/json'
        },
        body: {
          repoUrl: 'https://github.com/username/my-frontend.git',
          appName: 'my-frontend',
          appType: 'frontend',
          buildDir: 'dist',
          proxyConfig: {
            '/api': 'http://my-backend.platformx.localhost:5000'
          }
        }
      }
    },
    updateFromGit: {
      description: 'Update app with latest code from Git',
      request: {
        method: 'POST',
        url: '/api/apps/git-update/my-backend',
        headers: {
          'Authorization': 'Bearer <token>',
          'Content-Type': 'application/json'
        },
        body: {
          branch: 'main'
        }
      }
    }
  }
};

module.exports = apiDocs;
