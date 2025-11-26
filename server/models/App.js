const mongoose = require('mongoose');

/**
 * App Model
 * Tracks metadata for apps deployed on PlatformX
 */
const appSchema = new mongoose.Schema({
  // Display name for the app
  name: {
    type: String,
    required: true,
    trim: true
  },

  // Unique slug used as subdomain/appName (e.g., "app1", "my-shop")
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },

  // App status: active, disabled, error
  status: {
    type: String,
    enum: ['active', 'disabled', 'error'],
    default: 'active'
  },

  // Optional description
  description: {
    type: String,
    default: ''
  },

  // When the app was first registered
  createdAt: {
    type: Date,
    default: Date.now
  },

  // Last time metadata was updated
  updatedAt: {
    type: Date,
    default: Date.now
  },

  // Last time the app was deployed/uploaded
  lastDeployedAt: {
    type: Date,
    default: null
  },

  // Last error message (if status=error)
  lastError: {
    type: String,
    default: null
  },

  // Total number of requests served by this app
  requestCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: false // We handle timestamps manually for more control
});

// Pre-save hook to update `updatedAt`
appSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to increment request count
appSchema.methods.incrementRequestCount = async function() {
  this.requestCount += 1;
  await this.save();
};

// Static method to find by slug
appSchema.statics.findBySlug = function(slug) {
  return this.findOne({ slug });
};

// Static method to list apps with filters
appSchema.statics.listApps = function(filters = {}) {
  const query = {};
  if (filters.status) {
    query.status = filters.status;
  }
  return this.find(query).sort({ createdAt: -1 });
};

const App = mongoose.model('App', appSchema);

module.exports = App;
