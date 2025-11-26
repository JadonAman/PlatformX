import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI } from '../services/api';
import { useDialog } from '../contexts/DialogContext';

function AppsList() {
  const { confirm, toast } = useDialog();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchApps();
  }, [filterStatus]);

  const fetchApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await appsAPI.listApps(filterStatus);
      setApps(response.data.apps);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch apps');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (slug) => {
    const confirmed = await confirm(`Are you sure you want to delete "${slug}"?`, {
      title: 'Delete App',
      type: 'danger',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      await appsAPI.deleteApp(slug);
      toast.success('App deleted successfully!');
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete app');
    }
  };

  const handleSync = async (autoRename = false) => {
    try {
      const response = await appsAPI.syncApps(autoRename);
      const { added, removed, renamed, skipped, total } = response.data.sync;
      
      let message = `Sync complete!\n\nAdded: ${added} apps\nRemoved: ${removed} apps`;
      
      if (renamed > 0) {
        message += `\nRenamed: ${renamed} apps`;
      }
      
      if (skipped > 0) {
        message += `\nSkipped: ${skipped} apps (invalid names)`;
        const skippedApps = response.data.sync.skippedApps || [];
        if (skippedApps.length > 0 && !autoRename) {
          message += '\n\nTo auto-fix invalid names, use "Sync & Rename" option.';
        }
      }
      
      message += `\n\nTotal: ${total} folders`;
      
      toast.success(message, 5000);
      fetchApps();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to sync apps');
    }
  };

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
      <Header 
        title="Apps Management" 
        subtitle="Manage all deployed applications on PlatformX"
      />

      <div className="px-8 pb-8">
        {/* Filters and Actions */}
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div className="flex gap-3">
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2.5 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium cursor-pointer hover:bg-gray-50 appearance-none pr-10"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
                <option value="error">Error</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => handleSync(false)}
              className="bg-gradient-to-r from-green-600 to-green-700 text-white px-5 py-2.5 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-[1.02]"
            >
              <span>🔄</span>
              Sync with Filesystem
            </button>
            <button
              onClick={() => handleSync(true)}
              className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-5 py-2.5 rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg text-sm flex items-center gap-2 transform hover:scale-[1.02]"
              title="Sync and automatically rename folders with invalid names"
            >
              <span>🔄</span>
              Sync & Rename
            </button>
            <Link
              to="/upload"
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg flex items-center gap-2 transform hover:scale-[1.02]"
            >
              <span>⬆️</span>
              Upload New App
            </Link>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            <p className="text-gray-600 mt-4 font-medium">Loading apps...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-xl font-medium flex items-start gap-3 animate-slide-up">
            <span className="text-xl">⚠️</span>
            <p>{error}</p>
          </div>
        )}

        {/* Apps List */}
        {!loading && !error && (
          <>
            {apps.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                <div className="text-6xl mb-4 opacity-50">📦</div>
                <p className="text-gray-600 text-xl font-semibold mb-2">No apps found</p>
                <p className="text-gray-500 mb-6">Start by uploading your first application</p>
                <Link
                  to="/upload"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                >
                  <span>⬆️</span>
                  Upload your first app
                </Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-soft">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        App Name
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Slug
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Last Deployed
                      </th>
                      <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {apps.map((app) => (
                      <tr key={app.slug} className="hover:bg-blue-50/50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {app.name}
                          </div>
                          {app.description && (
                            <div className="text-sm text-gray-500 mt-1">
                              {app.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`http://${app.slug}.platformx.localhost:5000`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:text-blue-800 font-mono hover:underline"
                          >
                            {app.slug}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                              app.status
                            )}`}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                          {app.requestCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {app.lastDeployedAt
                            ? new Date(app.lastDeployedAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/apps/${app.slug}`}
                            className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium mr-4 hover:underline"
                          >
                            <span>👁️</span>
                            View
                          </Link>
                          <button
                            onClick={() => handleDelete(app.slug)}
                            className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 font-medium hover:underline"
                          >
                            <span>🗑️</span>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">Total Apps</p>
                    <p className="text-3xl font-bold text-white">{apps.length}</p>
                  </div>
                  <div className="text-4xl opacity-20">📦</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-2xl shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium mb-1">Active Apps</p>
                    <p className="text-3xl font-bold text-white">
                      {apps.filter((a) => a.status === 'active').length}
                    </p>
                  </div>
                  <div className="text-4xl opacity-20">✅</div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-2xl shadow-medium hover:shadow-strong transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium mb-1">Total Requests</p>
                    <p className="text-3xl font-bold text-white">
                      {apps.reduce((sum, a) => sum + a.requestCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-4xl opacity-20">📊</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default AppsList;
