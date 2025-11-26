const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

// Import App model
const App = require('./models/App');

// Connect to MongoDB
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

async function bidirectionalSync() {
  try {
    const appsDir = path.join(__dirname, 'apps');
    
    // Get all filesystem folders
    const folders = fs.readdirSync(appsDir).filter(folder => {
      const appPath = path.join(appsDir, folder);
      return fs.statSync(appPath).isDirectory();
    });

    // Get all database apps
    const dbApps = await App.find({});

    console.log(`\n📊 Sync Status:`);
    console.log(`   Filesystem: ${folders.length} apps`);
    console.log(`   Database: ${dbApps.length} apps\n`);

    // PART 1: Add missing apps from filesystem to database
    console.log('🔄 PHASE 1: Adding missing apps to database...');
    let addedCount = 0;
    
    for (const folder of folders) {
      const existingApp = await App.findBySlug(folder);
      
      if (!existingApp) {
        const appPath = path.join(appsDir, folder);
        const serverFile = path.join(appPath, 'server.js');
        const hasServerFile = fs.existsSync(serverFile);

        if (!hasServerFile) {
          console.log(`⚠️  Skipping ${folder} (no server.js)`);
          continue;
        }

        // Create new app entry
        const newApp = new App({
          name: folder,
          slug: folder,
          status: 'active',
          description: `Auto-synced from filesystem`,
          lastDeployedAt: new Date()
        });

        await newApp.save();
        console.log(`✅ Added: ${folder}`);
        addedCount++;
      }
    }

    // PART 2: Remove database entries for deleted filesystem apps
    console.log('\n🔄 PHASE 2: Removing orphaned database entries...');
    let removedCount = 0;

    for (const dbApp of dbApps) {
      const appPath = path.join(appsDir, dbApp.slug);
      
      if (!fs.existsSync(appPath)) {
        await App.deleteOne({ slug: dbApp.slug });
        console.log(`🗑️  Removed: ${dbApp.slug} (folder doesn't exist)`);
        removedCount++;
      }
    }

    console.log('\n✅ Sync Complete!');
    console.log(`   Added: ${addedCount} apps`);
    console.log(`   Removed: ${removedCount} apps`);
    console.log(`   Final count: ${folders.length} apps in sync\n`);

  } catch (err) {
    console.error('❌ Sync error:', err);
  } finally {
    mongoose.connection.close();
  }
}

bidirectionalSync();
