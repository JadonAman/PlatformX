
# PlatformX 🚀

**PlatformX** is a self-hosted, multi-tenant Node.js application platform that allows you to deploy and manage multiple applications on a single server using subdomain-based routing.

## 📑 Table of Contents

- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [🚀 Quick Start](#-quick-start)
- [📖 Converting Your App to Work with PlatformX](#-converting-your-app-to-work-with-platformx) ⭐ **Important!**
  - [Migration Guide - 7 Real-world Scenarios](#-migration-guide-converting-your-entry-point)
  - [Quick Conversion Checklist](#-quick-conversion-checklist)
  - [Testing Your Converted App](#-testing-your-converted-app)
- [📖 Usage Guide](#-usage-guide)
  - [Deploying Backend Apps](#deploying-a-backend-app-expressjs)
  - [Deploying Frontend Apps](#deploying-a-frontend-app-reactvue)
  - [Git Deployment](#deploying-from-git)
  - [Environment Variables](#environment-variables)
- [⚙️ Configuration](#️-configuration)
- [🔒 Security](#-security)
- [🚨 Troubleshooting](#-troubleshooting)
- [📊 Monitoring](#-monitoring)
- [🤝 Contributing](#-contributing)
- [📝 License](#-license)

---

## ✨ Features

### Core Platform
- 🌐 **Multi-tenant Architecture** - Deploy multiple apps with subdomain routing (e.g., `app1.platformx.localhost`)
- 🔄 **Lazy Loading** - Apps load on-demand and auto-unload when idle
- 📊 **Admin Dashboard** - Beautiful web UI for managing all your apps
- 🔐 **Secure Authentication** - JWT-based authentication with configurable credentials
- 📝 **Event Logging** - Track deployments, errors, and app lifecycle events

### Deployment Methods
- 📦 **ZIP Upload** - Upload a ZIP file directly through the dashboard
- 🔗 **Git Import** - Clone and deploy from Git repositories (GitHub, GitLab, etc.)
- 🔄 **Auto-sync** - Sync apps from filesystem to database

### App Type Support
- ⚙️ **Backend Apps** - Express.js APIs that export routers
- 🎨 **Frontend Apps** - React, Vue, Angular, Svelte, Next.js, static sites
- 📦 **Fullstack Apps** - Combined frontend and backend in one deployment

### Frontend Features
- 🏗️ **Automatic Builds** - Runs `npm install && npm run build` automatically
- 🔍 **Build Detection** - Auto-detects output folders (dist, build, out, etc.)
- 🔀 **API Proxy** - Configure proxies to backend services (solve CORS issues)
- 📱 **SPA Support** - Client-side routing with fallback to index.html

### Backend Features
- ✅ **Validation** - Prevents apps from calling `.listen()` (platform manages servers)
- 🔧 **Per-app Environment Variables** - Isolated `.env` files for each app
- 🗄️ **Per-app MongoDB Databases** - Each app gets its own database
- 🔄 **Hot Reload** - Apps reload automatically on file changes (development mode)

### Management Features
- 📊 **Request Tracking** - Monitor request counts per app
- 🔄 **Redeploy** - One-click redeployment with validation
- ✏️ **Rename Apps** - Change app slugs with automatic routing updates
- 🗑️ **Delete Apps** - Remove apps with cleanup of files and database
- 📋 **Environment Variables UI** - Manage env vars through dashboard
- 📝 **Logs Viewer** - View app events and errors in real-time

### Migration & Integration
- 🔄 **Migration Guide** - Step-by-step guide to convert existing Express apps to PlatformX format
- 📖 **7 Real-world Scenarios** - Examples covering standard apps, databases, middleware, async init, etc.
- ✅ **Conversion Checklist** - Quick checklist to ensure compatibility
- 🧪 **Testing Script** - Verify your app works before deployment

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    PlatformX Server                      │
│                   (Port 5000)                            │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────────────────────────────────────────┐   │
│  │     platformRouter Middleware                    │   │
│  │  (Extract subdomain, identify app)               │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │     lazyLoader Middleware                        │   │
│  │  (Load app on-demand, cache in memory)          │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │     appForwarder Middleware                      │   │
│  │  (Forward request to loaded app router)         │   │
│  └─────────────────────────────────────────────────┘   │
│                         ↓                                 │
│  ┌─────────────────────────────────────────────────┐   │
│  │     requestCounter Middleware                    │   │
│  │  (Track request count in MongoDB)               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘

Apps Directory Structure:
server/apps/
├── app1/
│   ├── server.js        (Backend: exports Express router)
│   ├── .env             (Per-app environment variables)
│   └── package.json
├── app2/
│   ├── dist/            (Frontend: built static files)
│   │   └── index.html
│   └── package.json
└── app3/
    ├── server.js        (Fullstack: backend)
    ├── dist/            (Fullstack: frontend)
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/JadonAman/PlatformX.git
cd PlatformX
```

2. **Setup Backend**
```bash
cd server
npm install
```

3. **Configure Environment Variables**
```bash
cp .env.example .env
# Edit .env and set your values:
# - MONGO_URI (MongoDB connection string)
# - ADMIN_USERNAME (dashboard login username)
# - ADMIN_PASSWORD (dashboard login password)
# - JWT_SECRET (secret key for JWT tokens)
```

4. **Setup Frontend**
```bash
cd ../client
npm install
```

5. **Configure /etc/hosts** (for local development)
```bash
# Add to /etc/hosts:
127.0.0.1 platformx.localhost
127.0.0.1 app1.platformx.localhost
127.0.0.1 app2.platformx.localhost
# Add more subdomains as needed
```

6. **Start the Platform**
```bash
# Terminal 1 - Backend
cd server
node server.js

# Terminal 2 - Dashboard
cd client
npm run dev
```

7. **Access the Platform**
- Dashboard: http://platformx.localhost:5173
- API: http://platformx.localhost:5000/api
- Apps: http://\<appname\>.platformx.localhost:5000

8. **Login to Dashboard**
- Username: `admin` (or your configured username)
- Password: `changeme123` (or your configured password)
- **⚠️ Change default credentials in `.env` file!**

---

## 📖 Converting Your App to Work with PlatformX

### Understanding PlatformX Requirements

PlatformX manages the HTTP server for you, so your backend apps **must export an Express router** instead of creating their own server. This allows the platform to load multiple apps and handle subdomain routing.

### ❌ What NOT to Do

Your app should **NOT** contain:
- `app.listen()` or `server.listen()` calls
- `http.createServer()` or `https.createServer()`
- Any code that starts a standalone server

### ✅ What TO Do

Your app should:
- Export an Express router or app instance
- Let PlatformX handle the server
- Use `module.exports` to expose your router

---

## 🔄 Migration Guide: Converting Your Entry Point

### Scenario 1: Standard Express Server

**❌ Before (Old way - Won't work):**
```javascript
// server.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/users', (req, res) => {
  res.json({ users: [] });
});

// ❌ This won't work on PlatformX
app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**✅ After (PlatformX compatible):**
```javascript
// server.js
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World' });
});

app.get('/users', (req, res) => {
  res.json({ users: [] });
});

// ✅ Export the app instead of calling listen
module.exports = app;
```

---

### Scenario 2: Express with Middleware & Routes

**❌ Before:**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// ❌ Remove this
app.listen(4000, () => {
  console.log('API running on port 4000');
});
```

**✅ After:**
```javascript
// server.js
const express = require('express');
const cors = require('cors');
const userRoutes = require('./routes/users');
const productRoutes = require('./routes/products');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);

// ✅ Export instead of listen
module.exports = app;
```

---

### Scenario 3: Express with Database Connection

**❌ Before:**
```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Database connection
mongoose.connect('mongodb://localhost:27017/mydb')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('DB Error:', err));

app.get('/api/data', async (req, res) => {
  const data = await MyModel.find();
  res.json(data);
});

// ❌ Remove listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server on port ${PORT}`);
});
```

**✅ After (Option 1 - Use PlatformX Database):**
```javascript
// server.js
const express = require('express');

const app = express();

// ✅ PlatformX provides req.db - a connected MongoDB database
app.get('/api/data', async (req, res) => {
  try {
    // Use the database provided by PlatformX
    const data = await req.db.collection('items').find().toArray();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Export the app
module.exports = app;
```

**✅ After (Option 2 - Custom Database Connection):**
```javascript
// server.js
const express = require('express');
const mongoose = require('mongoose');

const app = express();

// Connect to your own database
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/mydb')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('DB Error:', err));

app.get('/api/data', async (req, res) => {
  const data = await MyModel.find();
  res.json(data);
});

// ✅ Just export, no listen
module.exports = app;
```

---

### Scenario 4: HTTP Server with Socket.IO

**❌ Before:**
```javascript
// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);  // ❌ Won't work
const io = new Server(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('User connected');
});

// ❌ Remove this
server.listen(3000);
```

**✅ After:**
```javascript
// server.js
const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Note: Socket.IO requires http.createServer which PlatformX doesn't support
// For WebSocket needs, consider using a separate service or deploy elsewhere
// PlatformX is optimized for REST APIs and static sites

// ✅ Export the express app
module.exports = app;
```

---

### Scenario 5: Using Environment Variables

**❌ Before:**
```javascript
// server.js
const express = require('express');
require('dotenv').config();  // Load from .env file

const app = express();

app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    dbUrl: process.env.DB_URL
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT);  // ❌ Remove
```

**✅ After:**
```javascript
// server.js
const express = require('express');
require('dotenv').config();  // ✅ Still works! PlatformX supports .env files

const app = express();

app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.API_KEY,
    dbUrl: process.env.DB_URL
  });
});

// ✅ No PORT needed - PlatformX handles that
module.exports = app;
```

---

### Scenario 6: Express Router as Entry Point

**✅ Good! Already compatible:**
```javascript
// server.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

router.post('/data', (req, res) => {
  res.json({ received: req.body });
});

// ✅ Exporting router works perfectly
module.exports = router;
```

---

### Scenario 7: Async Initialization

**❌ Before:**
```javascript
// server.js
const express = require('express');
const app = express();

async function startServer() {
  // Initialize services
  await connectDatabase();
  await loadConfiguration();
  
  app.get('/', (req, res) => {
    res.json({ message: 'Ready' });
  });
  
  app.listen(3000);  // ❌ Remove
}

startServer();
```

**✅ After (Option 1 - Export function):**
```javascript
// server.js
const express = require('express');

// Export an async function that returns the app
module.exports = async function() {
  const app = express();
  
  // Initialize services
  await connectDatabase();
  await loadConfiguration();
  
  app.get('/', (req, res) => {
    res.json({ message: 'Ready' });
  });
  
  // ✅ Return the configured app
  return app;
};
```

**✅ After (Option 2 - Top-level await):**
```javascript
// server.js
const express = require('express');

// Initialize services immediately
(async () => {
  await connectDatabase();
  await loadConfiguration();
})();

const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Ready' });
});

// ✅ Export the app
module.exports = app;
```

---

## 🎯 Quick Conversion Checklist

When converting your app to work with PlatformX:

- [ ] Remove all `app.listen()` or `server.listen()` calls
- [ ] Remove `http.createServer()` or `https.createServer()`
- [ ] Add `module.exports = app` (or `module.exports = router`)
- [ ] Remove hardcoded PORT variables (PlatformX manages this)
- [ ] Test that your app exports a function or router
- [ ] Ensure all routes are relative (e.g., `/api/users` not `http://localhost:3000/api/users`)
- [ ] Move sensitive config to `.env` file or Environment Variables in dashboard
- [ ] Verify no console.log statements reference specific ports

---

## 🚨 Common Mistakes

### ❌ Mistake 1: Forgetting to Export
```javascript
const express = require('express');
const app = express();

app.get('/', (req, res) => res.json({ ok: true }));

// ❌ FORGOT: module.exports = app;
```

### ❌ Mistake 2: Exporting After Listen
```javascript
const app = express();
app.listen(3000);
module.exports = app;  // ❌ Too late! Don't call listen at all
```

### ❌ Mistake 3: Wrong Export Format
```javascript
// ❌ Wrong
module.exports = { app: app };

// ✅ Correct
module.exports = app;
```

---

## 🧪 Testing Your Converted App

Before deploying to PlatformX, test locally:

```javascript
// test-server.js (don't include in deployment)
const app = require('./server.js');

// Test that your entry file exports correctly
if (typeof app === 'function') {
  app.listen(3000, () => {
    console.log('✅ Test server running on http://localhost:3000');
  });
} else if (app && typeof app.use === 'function') {
  const express = require('express');
  const testApp = express();
  testApp.use(app);
  testApp.listen(3000, () => {
    console.log('✅ Test server running on http://localhost:3000');
  });
} else {
  console.error('❌ server.js does not export an Express app or router');
}
```

Run test:
```bash
node test-server.js
```

If successful, your app is ready for PlatformX! 🎉

---

## 📖 Usage Guide

### Deploying a Backend App (Express.js)

1. **Create your Express app**
```javascript
// server.js
const express = require('express');

function createApp() {
  const router = express.Router();
  
  router.get('/', (req, res) => {
    res.json({ message: 'Hello from my app!' });
  });
  
  router.get('/users', (req, res) => {
    res.json({ users: ['Alice', 'Bob'] });
  });
  
  return router;
}

module.exports = createApp;
```

2. **Important: Export the router, DON'T call `.listen()`**
```javascript
// ❌ WRONG - Don't do this:
app.listen(3000);

// ✅ CORRECT - Export the router:
module.exports = createApp;
```

3. **ZIP your app**
```bash
zip -r myapp.zip server.js package.json
```

4. **Upload via Dashboard**
- Go to Dashboard → Upload App
- Choose ZIP Upload
- Select your ZIP file
- App Name: `myapp`
- Entry File: `server.js`
- App Type: Backend
- Click Deploy

5. **Access your app**
- http://myapp.platformx.localhost:5000/

### Deploying a Frontend App (React/Vue)

1. **Create your frontend app**
```bash
# React
npx create-react-app my-frontend
cd my-frontend

# Vue
npm create vue@latest my-frontend
cd my-frontend
```

2. **ZIP your app** (include source, not build)
```bash
zip -r my-frontend.zip src/ public/ package.json
```

3. **Upload via Dashboard**
- Go to Dashboard → Upload App
- Choose ZIP Upload
- App Name: `my-frontend`
- App Type: Frontend
- Build Dir: (leave empty, auto-detected)
- Click Deploy

4. **Platform will automatically:**
- Run `npm install`
- Run `npm run build`
- Detect output folder (dist/build)
- Serve static files

5. **Access your app**
- http://my-frontend.platformx.localhost:5000/

### Configuring API Proxy (Frontend → Backend)

When deploying a frontend app that needs to call backend APIs:

1. **In Upload Form:**
- App Type: Frontend
- API Proxy Routes:
  - Path: `/api`
  - Target: `http://backend-app.platformx.localhost:5000`

2. **In your frontend code:**
```javascript
// Instead of:
fetch('http://backend-app.platformx.localhost:5000/api/users')

// Just use relative URL:
fetch('/api/users')  // Proxied automatically!
```

3. **Benefits:**
- ✅ No CORS issues
- ✅ Same-origin requests
- ✅ Simplified configuration

### Deploying from Git

1. **Via Dashboard:**
- Go to Upload App
- Choose Git Import
- Repository URL: `https://github.com/username/repo.git`
- Branch: `main`
- App Name: `myapp`
- Entry File: `server.js`
- Click Deploy

2. **Platform will:**
- Clone the repository
- Detect app type
- Build if needed
- Deploy the app

### Environment Variables

1. **Add via Dashboard:**
- Go to App Details → Environment Variables tab
- Add key-value pairs
- Click Save

2. **Or include `.env` in your ZIP:**
```env
DATABASE_URL=mongodb://localhost/mydb
API_KEY=secret123
DEBUG=true
```

3. **Access in your app:**
```javascript
const apiKey = process.env.API_KEY;
```

### Per-App MongoDB Database

Each app automatically gets its own MongoDB database:

```javascript
// In your app:
module.exports = function createApp() {
  const router = express.Router();
  
  router.get('/data', async (req, res) => {
    // req.db is the per-app MongoDB connection
    const data = await req.db.collection('items').find().toArray();
    res.json(data);
  });
  
  return router;
};
```

---

## 🔧 Configuration

### Server Configuration (.env)

```env
# MongoDB
MONGO_URI=mongodb://root:password@localhost:27017/PlatformX?authSource=admin

# Server
PORT=5000
NODE_ENV=development

# Authentication
ADMIN_USERNAME=admin
ADMIN_PASSWORD=changeme123
JWT_SECRET=your-secret-jwt-key-change-this-in-production
```

### App Types

| Type | Description | Use Case |
|------|-------------|----------|
| `backend` | Express.js API | REST API, GraphQL, webhooks |
| `frontend` | Static site/SPA | React, Vue, Angular apps |
| `fullstack` | Frontend + Backend | Monolithic applications |

### Validation Rules

**App Names (slugs):**
- Only lowercase letters, digits, and hyphens
- Must be 3-63 characters long
- Examples: `my-app`, `api-v2`, `dashboard123`

**Backend Apps:**
- Must export a function that returns Express router
- Cannot call `.listen()`, `http.createServer()`, or `https.createServer()`
- Entry file must exist (default: `server.js`)

---

## 🛠️ Development

### Project Structure

```
PlatformX/
├── server/                  # Backend
│   ├── apps/               # Deployed apps
│   ├── middleware/         # Custom middleware
│   │   ├── auth.js        # JWT authentication
│   │   ├── lazyLoader.js  # App loading system
│   │   ├── platformRouter.js  # Subdomain routing
│   │   ├── staticServer.js    # Frontend serving
│   │   └── ...
│   ├── models/            # MongoDB models
│   │   └── App.js
│   ├── routes/            # API routes
│   │   ├── auth.js       # Login/verify
│   │   ├── upload.js     # ZIP upload
│   │   ├── gitImport.js  # Git deployment
│   │   └── appsAdmin.js  # App management
│   ├── utils/            # Utilities
│   │   ├── buildSystem.js   # Frontend builds
│   │   ├── envManager.js    # Environment vars
│   │   ├── logger.js        # Event logging
│   │   └── mongodbManager.js # Per-app DBs
│   └── server.js         # Entry point
├── client/               # Frontend Dashboard
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Dashboard pages
│   │   ├── services/    # API client
│   │   └── context/     # Auth context
│   └── ...
└── README.md
```

### Adding New Features

1. **Backend routes**: Add to `server/routes/`
2. **Middleware**: Add to `server/middleware/`
3. **Frontend pages**: Add to `client/src/pages/`
4. **Database models**: Add to `server/models/`

### Hot Reload

In development mode (`NODE_ENV=development`):
- Apps auto-reload when files change
- Useful for development, disabled in production

---

## 🔐 Security

### Best Practices

1. **Change Default Credentials**
```bash
# In server/.env
ADMIN_USERNAME=your-secure-username
ADMIN_PASSWORD=your-secure-password
JWT_SECRET=generate-a-long-random-string
```

2. **Use Strong JWT Secret**
```bash
# Generate a secure secret:
openssl rand -base64 32
```

3. **Production Deployment**
```bash
NODE_ENV=production
# Disable development features
# Enable HTTPS
# Set secure headers
```

4. **MongoDB Security**
```bash
# Use authentication
# Limit network access
# Regular backups
```

---

## 🚨 Troubleshooting

### App Not Loading

**Problem:** App returns 500 error

**Solutions:**
1. Check if entry file exists
2. Verify app exports a function
3. Check for `.listen()` calls (not allowed)
4. View logs in Dashboard → App Details → Logs

### Build Failed

**Problem:** Frontend app build fails

**Solutions:**
1. Check if `package.json` has `build` script
2. Verify dependencies are correct
3. Check build output directory exists
4. View error message in deployment result

### Subdomain Not Working

**Problem:** Cannot access app at subdomain

**Solutions:**
1. Check `/etc/hosts` configuration
2. Verify app is deployed (check Dashboard)
3. Ensure app name matches subdomain
4. Try accessing via `http://` not `https://`

### Database Connection Issues

**Problem:** App cannot connect to database

**Solutions:**
1. Verify MongoDB is running
2. Check `MONGO_URI` in `.env`
3. Ensure MongoDB authentication is correct
4. Check app has access to `req.db`

---

## 📊 Monitoring

### Request Counter
- Track total requests per app
- View in Dashboard → Apps List

### Event Logs
- Deployment events
- Error logs
- App lifecycle events
- View in Dashboard → App Details → Logs

### Cached Apps
- View loaded apps in memory
- See last used time and request count
- Dashboard → Cached Apps

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📝 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

Built with:
- Express.js
- React
- MongoDB
- Mongoose
- Tailwind CSS
- Vite

---

## 📞 Support

- Issues: https://github.com/JadonAman/PlatformX/issues
- Discussions: https://github.com/JadonAman/PlatformX/discussions

---

**Made with ❤️ by the PlatformX Team**
