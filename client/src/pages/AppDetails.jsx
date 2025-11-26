import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI } from '../services/api';

function AppDetails() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active',
  });

  useEffect(() => {
    fetchApp();
  }, [slug]);

  const fetchApp = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await appsAPI.getApp(slug);
      setApp(response.data.app);
      setFormData({
        name: response.data.app.name,
        description: response.data.app.description || '',
        status: response.data.app.status,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch app details');
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
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update app');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${app.name}"? This will remove all app files.`)) return;

    try {
      await appsAPI.deleteApp(slug);
      navigate('/apps');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete app');
    }
  };

  const handleRedeploy = async () => {
    try {
      await appsAPI.redeployApp(slug);
      fetchApp();
      alert('App redeployed successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to redeploy app');
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

  if (error) {
    return (
      <>
        <Header title="App Details" />
        <div className="px-8">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
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
        <div className="mb-6">
          <Link to="/apps" className="text-blue-600 hover:text-blue-700">
            ← Back to Apps
          </Link>
        </div>

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
                  <p className="text-sm text-gray-600">Has server.js</p>
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
      </div>
    </>
  );
}

export default AppDetails;
