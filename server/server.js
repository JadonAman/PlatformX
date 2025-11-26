const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const compression = require('compression');
const Logger = require('./utils/logger');
const CleanupService = require('./utils/cleanupService');
const requestTimeout = require('./middleware/requestTimeout');
const requestId = require('./middleware/requestId');
const metricsCollector = require('./middleware/metricsCollector');
const GracefulShutdown = require('./utils/gracefulShutdown');

dotenv.config();

// Global error handlers
process.on('uncaughtException', (error) => {
  Logger.platform.error('Uncaught Exception:', error);
  console.error('Uncaught Exception - Server will continue running, but this should be fixed!');
  // Don't exit - keep server running
});

process.on('unhandledRejection', (reason, promise) => {
  Logger.platform.error('Unhandled Promise Rejection:', reason);
  console.error('Unhandled Rejection at:', promise);
  // Don't exit - keep server running
});

// Initialize Express app
const app = express();

// Security middleware - helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for now to allow app flexibility
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow platformx.localhost and all subdomains
    if (origin.match(/^https?:\/\/([a-z0-9-]+\.)?platformx\.localhost(:\d+)?$/)) {
      return callback(null, true);
    }
    
    // Allow localhost for development
    if (origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS
app.use(cors(corsOptions));

// Compression middleware - gzip responses
app.use(compression());

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware - add unique ID to each request
app.use(requestId);

// Request timeout middleware - prevent hanging requests
app.use(requestTimeout(30000)); // 30 second timeout

// Metrics collection middleware
app.use(metricsCollector.middleware());

// Request logging middleware with request ID
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [${req.id}] ${req.method} ${req.hostname}${req.path}`);
        next();
    });
}

// PlatformX multi-tenant routing system
const { platformRouter } = require('./middleware/platformRouter');
const { lazyLoader } = require('./middleware/lazyLoader');
const { appForwarder } = require('./middleware/appForwarder');
const requestCounter = require('./middleware/requestCounter');

// Apply PlatformX middleware chain
app.use(platformRouter);  // Extract subdomain and identify app
app.use(lazyLoader);      // Load app on-demand
app.use(appForwarder);    // Forward request to app
app.use(requestCounter);  // Track request count in MongoDB

// Platform API routes (for platformx.localhost only)
const authRoutes = require('./routes/auth');
const appRoutes = require('./routes/app');
const uploadRoutes = require('./routes/upload');
const appsAdminRoutes = require('./routes/appsAdmin');
const gitImportRoutes = require('./routes/gitImport');
const apiInfoRoutes = require('./routes/apiInfo');
const backupsRoutes = require('./routes/backups');
const settingsRoutes = require('./routes/settings');
const { authenticateToken } = require('./middleware/auth');

// Health check endpoints (no auth required)
const { healthCheck, liveness, readiness } = require('./middleware/healthCheck');
app.get('/health', healthCheck);
app.get('/health/live', liveness);
app.get('/health/ready', readiness);

// Metrics endpoint (auth required)
app.get('/api/metrics', authenticateToken, (req, res) => {
  const metrics = metricsCollector.getMetrics();
  res.json(metrics);
});

// API info and documentation routes
app.use('/api', apiInfoRoutes);

app.use('/api/auth', authRoutes);
app.use('/api', appRoutes);
app.use('/api/apps', authenticateToken, uploadRoutes);
app.use('/api/apps', authenticateToken, gitImportRoutes);
app.use('/api/admin/apps', authenticateToken, appsAdminRoutes);
app.use('/api/admin/backups', authenticateToken, backupsRoutes);
app.use('/api/admin/settings', authenticateToken, settingsRoutes);

// Platform landing page
app.get('/', (req, res) => {
    res.json({
        platform: 'PlatformX',
        version: '1.0.0',
        description: 'Multi-tenant Node.js hosting platform',
        docs: '/api',
        timestamp: new Date().toISOString()
    });
});

// Global 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: 'The requested resource does not exist',
        hostname: req.hostname,
        path: req.path
    });
});

// Global error handler
app.use((err, req, res, next) => {
    Logger.platform.error('Express error handler:', err);
    console.error('[Platform Error]:', err);
    
    if (res.headersSent) {
        return next(err);
    }
    
    res.status(err.status || 500).json({
        success: false,
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
});

// MongoDB Connection (Mongoose for platform, native client for apps)
const MongoDBManager = require('./utils/mongodbManager');

mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(async () => {
        console.log('✅ Connected to MongoDB (Mongoose)');
        
        // Initialize MongoDB Manager for per-app databases
        try {
            await MongoDBManager.connect(process.env.MONGO_URI);
            console.log('✅ MongoDB Manager initialized for per-app databases');
        } catch (error) {
            console.error('⚠️  MongoDB Manager initialization failed:', error.message);
            console.warn('⚠️  Apps will not have access to per-app databases');
        }
    })
    .catch((err) => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });

// Auto-unload idle apps every 10 minutes
const { unloadIdleApps } = require('./middleware/lazyLoader');
const IDLE_UNLOAD_INTERVAL = 10 * 60 * 1000; // 10 minutes
const IDLE_THRESHOLD = 15 * 60 * 1000; // 15 minutes

setInterval(() => {
    unloadIdleApps(IDLE_THRESHOLD);
}, IDLE_UNLOAD_INTERVAL);

console.log('🧹 Auto-cleanup: Idle apps will be unloaded after 15 minutes of inactivity');

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log('');
    console.log('🚀 PlatformX is running!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Platform: http://platformx.localhost:${PORT}`);
    console.log(`📍 API:      http://platformx.localhost:${PORT}/api`);
    console.log(`📍 Health:   http://platformx.localhost:${PORT}/health`);
    console.log(`📍 Apps:     http://<appname>.platformx.localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔒 Security: Helmet enabled`);
    console.log(`📦 Compression: Enabled`);
    console.log(`⏱️  Timeout: 30 seconds`);
    console.log(`📊 Metrics: Enabled`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    
    // Start cleanup service for old uploads
    CleanupService.start();
    
    // Initialize graceful shutdown
    const gracefulShutdown = new GracefulShutdown(server);
    gracefulShutdown.init();
    Logger.platform.info('Graceful shutdown handlers initialized');
});
