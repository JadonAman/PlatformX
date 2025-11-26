import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI, webhookAPI, backupAPI } from '../services/api';
import ErrorAlert from '../components/ErrorAlert';
import { validateAppName, RESERVED_NAMES } from '../utils/errorHandler';
import { useDialog } from '../contexts/DialogContext';
import AddEnvModal from '../components/AddEnvModal';

function AppDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { confirm, toast } = useDialog();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'env', 'logs', 'webhooks', 'backups'
  const [envVars, setEnvVars] = useState(null);
  const [logs, setLogs] = useState([]);
  const [webhook, setWebhook] = useState(null);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [editingEnv, setEditingEnv] = useState(false);
  const [newEnvVars, setNewEnvVars] = useState({});
  const [showAddEnvModal, setShowAddEnvModal] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newSlugName, setNewSlugName] = useState('');
  const [error, setError] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);

  useEffect(() => {
    fetchApp();
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'env' && !envVars) {
      fetchEnv();
    } else if (activeTab === 'logs' && logs.length === 0) {
      fetchLogs();
    } else if (activeTab === 'webhooks' && !webhook) {
      fetchWebhook();
    }
  }, [activeTab]);

  const fetchEnv = async () => {
    try {
      setEnvLoading(true);
      const response = await appsAPI.getEnv(slug);
      setEnvVars(response.data.env || {});
      setNewEnvVars(response.data.env || {});
    } catch (err) {
      console.error('Failed to fetch env vars:', err);
      setEnvVars({});
    } finally {
      setEnvLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const response = await appsAPI.getLogs(slug, 'json');
      setLogs(response.data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleUpdateEnv = async (action = 'merge') => {
    try {
      await appsAPI.updateEnv(slug, {
        env: newEnvVars,
        action,
      });
      setEditingEnv(false);
      fetchEnv();
      toast.success('Environment variables updated successfully! App will reload.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update environment variables');
    }
  };

  const handleDeleteEnvKey = async (key) => {
    const confirmed = await confirm(`Delete environment variable "${key}"?`, {
      title: 'Delete Environment Variable',
      type: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await appsAPI.deleteEnv(slug, [key]);
      fetchEnv();
      toast.success('Environment variable deleted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete environment variable');
    }
  };

  const fetchApp = async () => {
    try {
      setLoading(true);
      setPageError(null);
      const response = await appsAPI.getApp(slug);
      setApp(response.data.app);
      setFormData({
        name: response.data.app.name,
        description: response.data.app.description || '',
        status: response.data.app.status,
      });
    } catch (err) {
      setPageError(err.response?.data?.error || 'Failed to fetch app details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await appsAPI.updateApp(slug, formData);
      setEditing(false);
      fetchApp();
      toast.success('App updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update app');
    }
  };

  const handleDelete = async () => {
    const confirmed = await confirm(`Are you sure you want to delete "${app.name}"? This will remove all app files.`, {
      title: 'Delete App',
      type: 'danger',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      await appsAPI.deleteApp(slug);
      toast.success('App deleted successfully!');
      navigate('/apps');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete app');
    }
  };

  const handleRedeploy = async () => {
    try {
      await appsAPI.redeployApp(slug);
      fetchApp();
      toast.success('App redeployed successfully!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to redeploy app');
    }
  };

  const handleRename = async () => {
    if (!newSlugName || newSlugName.trim() === '') {
      toast.warning('Please enter a new name');
      return;
    }

    if (newSlugName === slug) {
      toast.warning('New name must be different from current name');
      return;
    }

    // Validate app name
    const validation = validateAppName(newSlugName.trim());
    if (!validation.valid) {
      toast.error('Invalid app name:\n' + validation.errors.join('\n'));
      return;
    }

    try {
      const response = await appsAPI.renameApp(slug, newSlugName.trim());
      toast.success(response.data.message);
      // Navigate to the new slug
      navigate(`/apps/${response.data.newSlug}`);
      setRenaming(false);
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to rename app');
    }
  };

  // Webhook functions
  const fetchWebhook = async () => {
    try {
      setWebhookLoading(true);
      const response = await webhookAPI.getWebhook(slug);
      setWebhook(response.data.webhook);
      setWebhookUrl(response.data.webhook?.url || '');
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to fetch webhook:', err);
      }
      setWebhook(null);
      setWebhookUrl('');
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleSaveWebhook = async () => {
    if (!webhookUrl || webhookUrl.trim() === '') {
      toast.warning('Please enter a webhook URL');
      return;
    }

    try {
      await webhookAPI.registerWebhook(slug, webhookUrl.trim());
      toast.success('Webhook registered successfully!');
      fetchWebhook();
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to register webhook');
    }
  };

  const handleDeleteWebhook = async () => {
    const confirmed = await confirm('Delete webhook configuration?', {
      title: 'Delete Webhook',
      type: 'danger'
    });
    if (!confirmed) return;

    try {
      await webhookAPI.deleteWebhook(slug);
      toast.success('Webhook deleted successfully!');
      setWebhook(null);
      setWebhookUrl('');
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to delete webhook');
    }
  };

  const handleTestWebhook = async () => {
    try {
      const response = await webhookAPI.testWebhook(slug);
      toast.success(response.data.message || 'Test webhook sent successfully!');
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to send test webhook');
    }
  };

  // Backup function
  const handleCreateBackup = async () => {
    const confirmed = await confirm(`Create backup for "${app.name}"?`, {
      title: 'Create Backup',
      type: 'info',
      confirmText: 'Create'
    });
    if (!confirmed) return;

    try {
      setCreatingBackup(true);
      const response = await backupAPI.createBackup(slug);
      toast.success(response.data.message || 'Backup created successfully!');
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to create backup');
    } finally {
      setCreatingBackup(false);
    }
  };

  // Git update function
  const handleGitUpdate = async () => {
    const confirmed = await confirm(`Pull latest changes from Git for "${app.name}"?`, {
      title: 'Git Update',
      type: 'info',
      confirmText: 'Update'
    });
    if (!confirmed) return;

    try {
      const response = await appsAPI.gitUpdate(slug);
      toast.success(response.data.message || 'Git update completed successfully!');
      fetchApp();
      fetchLogs();
    } catch (err) {
      setError(err);
      toast.error(err.response?.data?.error || 'Failed to update from Git');
    }
  };

  if (loading) {
    return (
      <>
        <Header title="App Details" />
        <div className="px-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading app details...</p>
        </div>
      </>
    );
  }

  if (pageError) {
    return (
      <>
        <Header title="App Details" />
        <div className="px-8">
          <ErrorAlert error={{ response: { data: { error: pageError } } }} />
          <Link to="/apps" className="inline-block mt-4 text-blue-600 hover:text-blue-700">
            ← Back to Apps
          </Link>
        </div>
      </>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <Header title={app.name} subtitle={`App: ${app.slug}`} />

      <div className="px-8 pb-8">
        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}
        
        <div className="mb-6">
          <Link to="/apps" className="text-blue-600 hover:text-blue-700">
            ← Back to Apps
          </Link>
        </div>

        {/* Tabs Navigation */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'details'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('env')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'env'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Environment Variables
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'logs'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Logs
            </button>
            <button
              onClick={() => setActiveTab('webhooks')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'webhooks'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Webhooks
            </button>
            <button
              onClick={() => setActiveTab('backups')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'backups'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Backups
            </button>
          </nav>
        </div>

        {activeTab === 'details' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Info */}
            <div className="lg:col-span-2 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-xl font-bold text-gray-900">Basic Information</h2>
                {!editing && (
                  <button
                    onClick={() => setEditing(true)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editing ? (
                <form onSubmit={handleUpdate}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({ ...formData, description: e.target.value })
                        }
                        rows="3"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      ></textarea>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) =>
                          setFormData({ ...formData, status: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Active</option>
                        <option value="disabled">Disabled</option>
                        <option value="error">Error</option>
                      </select>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(false);
                          setFormData({
                            name: app.name,
                            description: app.description || '',
                            status: app.status,
                          });
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="text-gray-900 font-medium">{app.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Slug</p>
                    <p className="text-gray-900 font-medium">{app.slug}</p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Description</p>
                    <p className="text-gray-900">
                      {app.description || <span className="text-gray-400">No description</span>}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600 mb-2">Status</p>
                    <span
                      className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(
                        app.status
                      )}`}
                    >
                      {app.status}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Deployment Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Deployment</h2>
              <div className="space-y-4">
                {app.deploymentMethod && (
                  <div>
                    <p className="text-sm text-gray-600">Deployment Method</p>
                    <p className="text-gray-900 font-medium">
                      {app.deploymentMethod === 'zip-upload' && '📦 ZIP Upload'}
                      {app.deploymentMethod === 'git-import' && '🔗 Git Import'}
                      {app.deploymentMethod === 'manual' && '✏️ Manual'}
                      {!['zip-upload', 'git-import', 'manual'].includes(app.deploymentMethod) && app.deploymentMethod}
                    </p>
                  </div>
                )}

                {app.entryFile && (
                  <div>
                    <p className="text-sm text-gray-600">Entry File</p>
                    <p className="text-gray-900 font-mono text-sm">{app.entryFile}</p>
                  </div>
                )}

                {app.repoUrl && (
                  <div>
                    <p className="text-sm text-gray-600">Repository URL</p>
                    <p className="text-gray-900 font-mono text-sm break-all">{app.repoUrl}</p>
                  </div>
                )}

                {app.repoBranch && (
                  <div>
                    <p className="text-sm text-gray-600">Branch</p>
                    <p className="text-gray-900 font-medium">{app.repoBranch}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-gray-600">Folder Exists</p>
                  <p className="text-gray-900 font-medium">
                    {app.deployment.folderExists ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Has {app.entryFile || 'server.js'}</p>
                  <p className="text-gray-900 font-medium">
                    {app.deployment.hasServerFile ? (
                      <span className="text-green-600">✓ Yes</span>
                    ) : (
                      <span className="text-red-600">✗ No</span>
                    )}
                  </p>
                </div>

                {app.deployment.path && (
                  <div>
                    <p className="text-sm text-gray-600">Path</p>
                    <p className="text-gray-900 font-mono text-sm">{app.deployment.path}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Error Info */}
            {app.lastError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h2 className="text-xl font-bold text-red-900 mb-4">Last Error</h2>
                <p className="text-red-700">{app.lastError}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Statistics</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {app.requestCount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-gray-900">
                    {new Date(app.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Last Updated</p>
                  <p className="text-gray-900">
                    {new Date(app.updatedAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">Last Deployed</p>
                  <p className="text-gray-900">
                    {app.lastDeployedAt
                      ? new Date(app.lastDeployedAt).toLocaleDateString()
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions Card */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <a
                  href={`http://${app.slug}.platformx.localhost:5000`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-center"
                >
                  Open App
                </a>

                <button
                  onClick={handleRedeploy}
                  className="w-full bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700"
                >
                  Redeploy
                </button>

                {app.deploymentMethod === 'git-import' && app.repoUrl && (
                  <button
                    onClick={handleGitUpdate}
                    className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                  >
                    🔄 Git Pull & Update
                  </button>
                )}

                <button
                  onClick={handleCreateBackup}
                  disabled={creatingBackup}
                  className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {creatingBackup ? 'Creating...' : '💾 Create Backup'}
                </button>

                <button
                  onClick={() => {
                    setNewSlugName(app.slug);
                    setRenaming(true);
                  }}
                  className="w-full bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700"
                >
                  Rename App
                </button>

                <button
                  onClick={handleDelete}
                  className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                >
                  Delete App
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Environment Variables Tab */}
        {activeTab === 'env' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">Environment Variables</h2>
              {!editingEnv && (
                <button
                  onClick={() => setEditingEnv(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Edit
                </button>
              )}
            </div>

            {envLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading environment variables...</p>
              </div>
            ) : editingEnv ? (
              <div>
                <div className="space-y-4 mb-6">
                  {Object.entries(newEnvVars).map(([key, value]) => (
                    <div key={key} className="flex gap-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const updated = { ...newEnvVars };
                          delete updated[key];
                          updated[e.target.value] = value;
                          setNewEnvVars(updated);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="KEY"
                      />
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => {
                          setNewEnvVars({ ...newEnvVars, [key]: e.target.value });
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="value"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = { ...newEnvVars };
                          delete updated[key];
                          setNewEnvVars(updated);
                        }}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddEnvModal(true)}
                  className="mb-6 text-blue-600 hover:text-blue-700"
                >
                  + Add Variable
                </button>

                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => handleUpdateEnv('merge')}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save Changes (Merge)
                  </button>
                  <button
                    onClick={() => handleUpdateEnv('replace')}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
                  >
                    Replace All
                  </button>
                  <button
                    onClick={() => {
                      setEditingEnv(false);
                      setNewEnvVars(envVars);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {Object.keys(envVars || {}).length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <p>No environment variables set</p>
                    <button
                      onClick={() => setEditingEnv(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700"
                    >
                      Add Variables
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(envVars).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <p className="font-mono text-sm font-medium text-gray-900">{key}</p>
                          <p className="font-mono text-sm text-gray-600 mt-1">{value}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteEnvKey(key)}
                          className="ml-4 text-red-600 hover:text-red-700 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-xl font-bold text-gray-900">Event Logs</h2>
              <button
                onClick={fetchLogs}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                🔄 Refresh
              </button>
            </div>

            {logsLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No logs found</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg border ${
                      log.event === 'error'
                        ? 'bg-red-50 border-red-200'
                        : log.event === 'load' || log.event === 'deploy'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{log.event}</span>
                          {log.metadata && (
                            <span className="text-xs text-gray-600">
                              {JSON.stringify(log.metadata)}
                            </span>
                          )}
                        </div>
                        {log.message && (
                          <p className="text-sm text-gray-700 mt-1">{log.message}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Webhooks Tab */}
        {activeTab === 'webhooks' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Webhook Configuration</h2>
            
            <p className="text-gray-600 mb-6">
              Configure a webhook URL to receive notifications when events occur for this app 
              (deployments, updates, errors, etc.)
            </p>

            {webhookLoading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-600 mt-4">Loading webhook configuration...</p>
              </div>
            ) : (
              <div>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Webhook URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This URL will receive POST requests with event data
                  </p>
                </div>

                {webhook && (
                  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">
                      <strong>✓ Webhook configured</strong>
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Current URL: <code className="font-mono bg-white px-2 py-1 rounded">{webhook.url}</code>
                    </p>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2">Event Types:</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.deployed</code> - App deployed successfully</li>
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.updated</code> - App updated</li>
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.deleted</code> - App deleted</li>
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.error</code> - App encountered an error</li>
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.build.completed</code> - Build completed</li>
                    <li>• <code className="bg-white px-2 py-0.5 rounded">app.build.failed</code> - Build failed</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSaveWebhook}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Save Webhook
                  </button>
                  
                  {webhook && (
                    <>
                      <button
                        onClick={handleTestWebhook}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Send Test Event
                      </button>
                      
                      <button
                        onClick={handleDeleteWebhook}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Delete Webhook
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Backups Tab */}
        {activeTab === 'backups' && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">App Backups</h2>
            
            <p className="text-gray-600 mb-6">
              Create backups of this app to restore it later or deploy to a different name.
              Backups include all app files and metadata.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">💡 Backup Tips:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Backups are stored as ZIP files with metadata</li>
                <li>• You can restore backups with a different app name</li>
                <li>• View and manage all backups in the Backups page</li>
                <li>• Old backups are automatically cleaned up (configurable)</li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={handleCreateBackup}
                disabled={creatingBackup}
                className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                {creatingBackup ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating backup...
                  </span>
                ) : (
                  <span>💾 Create Backup Now</span>
                )}
              </button>

              <Link
                to="/backups"
                className="block w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-200 text-center font-medium"
              >
                📦 View All Backups
              </Link>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Current App Info:</h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• App Name: <strong>{app.name}</strong></p>
                <p>• Slug: <strong>{app.slug}</strong></p>
                <p>• Deployment Method: <strong>{app.deploymentMethod}</strong></p>
                <p>• Last Updated: <strong>{new Date(app.updatedAt).toLocaleString()}</strong></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Rename Modal */}
      {renaming && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Rename App</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Name: <span className="font-bold">{app.slug}</span>
              </label>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Name
              </label>
              <input
                type="text"
                value={newSlugName}
                onChange={(e) => setNewSlugName(e.target.value.toLowerCase())}
                placeholder="new-app-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Lowercase letters, digits, and hyphens only (3-63 characters)
              </p>
            </div>

            {/* Validation Rules */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">App Name Rules:</h4>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Must be 3-63 characters long</li>
                <li>• Only lowercase letters, digits, and hyphens</li>
                <li>• Cannot start or end with a hyphen</li>
                <li>• Cannot contain consecutive hyphens (--)</li>
                <li>• Cannot be a reserved name</li>
              </ul>
            </div>

            {/* Reserved Names */}
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Reserved Names (Cannot Use):</h4>
              <div className="flex flex-wrap gap-1">
                {RESERVED_NAMES.map(name => (
                  <code key={name} className="text-xs bg-white px-2 py-1 rounded text-red-700">
                    {name}
                  </code>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Renaming will:
              </p>
              <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside">
                <li>Change the app folder name</li>
                <li>Update the database</li>
                <li>Change the access URL</li>
                <li>Unload the app from memory</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRenaming(false);
                  setNewSlugName('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Environment Variable Modal */}
      <AddEnvModal
        isOpen={showAddEnvModal}
        onClose={() => setShowAddEnvModal(false)}
        onAdd={(key, value) => {
          if (newEnvVars[key]) {
            toast.warning(`Variable ${key} already exists`);
            return;
          }
          setNewEnvVars({ ...newEnvVars, [key]: value });
        }}
      />
    </>
  );
}

export default AppDetails;
