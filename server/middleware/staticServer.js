const path = require('path');
const fs = require('fs');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

/**
 * Static file server middleware for frontend apps
 * Serves built frontend files (HTML, CSS, JS, images, etc.)
 */
class StaticServer {
  /**
   * Create static server for a frontend app
   * @param {string} appPath - Path to app directory
   * @param {string} buildDir - Build output directory (e.g., 'dist', 'build')
   * @param {Object} proxyConfig - API proxy configuration
   * @returns {Function} Express middleware
   */
  static createServer(appPath, buildDir = 'dist', proxyConfig = null) {
    const staticPath = path.join(appPath, buildDir);
    
    // Check if build directory exists
    if (!fs.existsSync(staticPath)) {
      throw new Error(`Build directory not found: ${buildDir}`);
    }

    // Create router for this app
    const router = express.Router();

    // Setup API proxies if configured
    if (proxyConfig && typeof proxyConfig === 'object') {
      Object.entries(proxyConfig).forEach(([prefix, target]) => {
        console.log(`[StaticServer] Setting up proxy: ${prefix} -> ${target}`);
        
        router.use(prefix, createProxyMiddleware({
          target,
          changeOrigin: true,
          pathRewrite: (path, req) => {
            // Keep the original path
            return path;
          },
          onProxyReq: (proxyReq, req, res) => {
            // Add custom headers if needed
            proxyReq.setHeader('X-Forwarded-By', 'PlatformX');
          },
          onError: (err, req, res) => {
            console.error('[StaticServer] Proxy error:', err.message);
            res.status(502).json({
              error: 'Backend service unavailable',
              message: err.message
            });
          }
        }));
      });
    }

    // Serve static files
    router.use(express.static(staticPath, {
      index: ['index.html'],
      dotfiles: 'ignore',
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
    }));

    // SPA fallback - serve index.html for all non-file routes
    router.get('*', (req, res) => {
      const indexPath = path.join(staticPath, 'index.html');
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ 
          error: 'Not found',
          message: 'index.html not found in build directory'
        });
      }
    });

    return router;
  }

  /**
   * Check if a directory contains a valid frontend build
   * @param {string} appPath - Path to app directory
   * @param {string} buildDir - Build output directory to check
   * @returns {boolean}
   */
  static hasValidBuild(appPath, buildDir) {
    const buildPath = path.join(appPath, buildDir);
    const indexPath = path.join(buildPath, 'index.html');
    
    return fs.existsSync(buildPath) && fs.existsSync(indexPath);
  }

  /**
   * Auto-detect build directory from common frontend frameworks
   * @param {string} appPath - Path to app directory
   * @returns {string|null} - Detected build directory or null
   */
  static detectBuildDir(appPath) {
    const commonBuildDirs = [
      'dist',        // Vite, Vue CLI
      'build',       // Create React App
      'out',         // Next.js static export
      '.next',       // Next.js
      'public',      // Some static sites
      'www',         // Ionic, Cordova
      '_site'        // Jekyll, 11ty
    ];

    for (const dir of commonBuildDirs) {
      if (this.hasValidBuild(appPath, dir)) {
        return dir;
      }
    }

    return null;
  }
}

module.exports = StaticServer;
