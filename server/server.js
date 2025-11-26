const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

// Initialize Express app
const app = express();

// Global middleware (must come BEFORE platformRouter)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware (development)
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.hostname}${req.path}`);
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
const appRoutes = require('./routes/app');
const uploadRoutes = require('./routes/upload');
const appsAdminRoutes = require('./routes/appsAdmin');

app.use('/api', appRoutes);
app.use('/api/apps', uploadRoutes);
app.use('/api/admin/apps', appsAdminRoutes);

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
    console.error('[Platform Error]:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// MongoDB Connection
mongoose
    .connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    })
    .then(() => console.log('✅ Connected to MongoDB'))
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
app.listen(PORT, () => {
    console.log('');
    console.log('🚀 PlatformX is running!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 Platform: http://platformx.localhost:${PORT}`);
    console.log(`📍 API:      http://platformx.localhost:${PORT}/api`);
    console.log(`📍 Apps:     http://<appname>.platformx.localhost:${PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
});
