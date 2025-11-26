import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { settingsAPI } from '../services/api';
import { useDialog } from '../contexts/DialogContext';

function Settings() {
  const navigate = useNavigate();
  const { toast, confirm } = useDialog();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    githubToken: '',
    autoBackupEnabled: false,
    backupRetentionDays: 30,
    webhooksEnabled: false
  });
  const [showToken, setShowToken] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await settingsAPI.getAll();
      
      if (response.data.success) {
        const { settings: dbSettings } = response.data;
        
        setSettings({
          githubToken: dbSettings['github.token']?.value || '',
          autoBackupEnabled: dbSettings['backup.auto_enabled']?.value || false,
          backupRetentionDays: dbSettings['backup.retention_days']?.value || 30,
          webhooksEnabled: dbSettings['webhooks.enabled']?.value || false
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      const payload = {
        'github.token': {
          value: settings.githubToken,
          category: 'github',
          description: 'GitHub Personal Access Token for private repository access',
          encrypted: false
        },
        'backup.auto_enabled': {
          value: settings.autoBackupEnabled,
          category: 'backup',
          description: 'Enable automatic daily backups'
        },
        'backup.retention_days': {
          value: settings.backupRetentionDays,
          category: 'backup',
          description: 'Number of days to retain backups'
        },
        'webhooks.enabled': {
          value: settings.webhooksEnabled,
          category: 'webhook',
          description: 'Enable webhook notifications'
        }
      };

      const response = await settingsAPI.updateMultiple({ settings: payload });

      if (response.data.success) {
        toast.success('Settings saved successfully!');
        setHasChanges(false);
      } else {
        toast.error(response.data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error(error.response?.data?.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const confirmed = await confirm(
      'Are you sure you want to discard all changes?',
      {
        title: 'Discard Changes',
        type: 'warning',
        confirmText: 'Discard'
      }
    );

    if (confirmed) {
      await loadSettings();
      setHasChanges(false);
      toast.info('Changes discarded');
    }
  };

  const handleTestGitHubToken = async () => {
    if (!settings.githubToken) {
      toast.warning('Please enter a GitHub token first');
      return;
    }

    try {
      // Test token by making a simple GitHub API request
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${settings.githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Token valid! Authenticated as: ${data.login}`);
      } else if (response.status === 401) {
        toast.error('Invalid token: Authentication failed');
      } else {
        toast.error(`Token validation failed: ${response.statusText}`);
      }
    } catch (error) {
      toast.error('Failed to test token: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Platform Settings</h1>
            <p className="text-gray-600 mt-1">Configure your PlatformX instance</p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
        </div>

        {/* GitHub Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <h2 className="text-xl font-bold text-gray-900">GitHub Integration</h2>
          </div>
          <p className="text-gray-600 mb-4">
            Configure GitHub access for importing private repositories
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              GitHub Personal Access Token
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={settings.githubToken}
                  onChange={(e) => handleChange('githubToken', e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showToken ? '🙈' : '👁️'}
                </button>
              </div>
              <button
                onClick={handleTestGitHubToken}
                disabled={!settings.githubToken}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Test Token
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Create a token at{' '}
              <a
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                GitHub Settings → Developer settings → Personal access tokens
              </a>
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Required scopes: <code className="bg-gray-100 px-2 py-0.5 rounded">repo</code> (for private repos)
            </p>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">💾</span>
            <h2 className="text-xl font-bold text-gray-900">Backup Settings</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Automatic Backups
                </label>
                <p className="text-sm text-gray-500">
                  Enable daily automatic backups for all apps
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoBackupEnabled}
                  onChange={(e) => handleChange('autoBackupEnabled', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Backup Retention (Days)
              </label>
              <input
                type="number"
                value={settings.backupRetentionDays}
                onChange={(e) => handleChange('backupRetentionDays', parseInt(e.target.value))}
                min="1"
                max="365"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Backups older than this will be automatically deleted
              </p>
            </div>
          </div>
        </div>

        {/* Webhook Settings */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-2">🔔</span>
            <h2 className="text-xl font-bold text-gray-900">Webhook Settings</h2>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">
                Enable Webhooks
              </label>
              <p className="text-sm text-gray-500">
                Allow apps to send webhook notifications for events
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.webhooksEnabled}
                onChange={(e) => handleChange('webhooksEnabled', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleReset}
            disabled={!hasChanges || saving}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Settings;
