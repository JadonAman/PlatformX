const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  encrypted: {
    type: Boolean,
    default: false
  },
  description: {
    type: String,
    default: ''
  },
  category: {
    type: String,
    enum: ['github', 'system', 'backup', 'webhook', 'general'],
    default: 'general'
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Update the updatedAt timestamp before saving
settingsSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to get a setting by key
settingsSchema.statics.getSetting = async function(key, defaultValue = null) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : defaultValue;
};

// Static method to set a setting
settingsSchema.statics.setSetting = async function(key, value, category = 'general', description = '', encrypted = false) {
  const result = await this.findOneAndUpdate(
    { key },
    { 
      value, 
      category, 
      description, 
      encrypted,
      updatedAt: Date.now() 
    },
    { 
      upsert: true, 
      new: true,
      setDefaultsOnInsert: true
    }
  );
  return result;
};

// Static method to get all settings by category
settingsSchema.statics.getByCategory = async function(category) {
  const settings = await this.find({ category });
  const result = {};
  settings.forEach(setting => {
    result[setting.key] = setting.value;
  });
  return result;
};

// Static method to get all settings as key-value pairs
settingsSchema.statics.getAllSettings = async function(includeEncrypted = false) {
  const query = includeEncrypted ? {} : { encrypted: false };
  const settings = await this.find(query);
  const result = {};
  settings.forEach(setting => {
    result[setting.key] = {
      value: setting.value,
      category: setting.category,
      description: setting.description,
      encrypted: setting.encrypted
    };
  });
  return result;
};

// Static method to delete a setting
settingsSchema.statics.deleteSetting = async function(key) {
  return await this.findOneAndDelete({ key });
};

const Settings = mongoose.model('Settings', settingsSchema);

module.exports = Settings;
