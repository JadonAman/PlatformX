import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { platformAPI } from '../services/api';

function CachedApps() {
  const [cachedApps, setCachedApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [idleThreshold, setIdleThreshold] = useState(1); // Default 1 minute

  useEffect(() => {
    fetchCachedApps();
  }, []);

  const fetchCachedApps = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await platformAPI.getCachedApps();
      setCachedApps(response.data.apps);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch cached apps');
    } finally {
      setLoading(false);
    }
  };

  const handleUnload = async (appName) => {
    if (!confirm(`Unload "${appName}" from memory?`)) return;

    try {
      await platformAPI.unloadApp(appName);
      fetchCachedApps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unload app');
    }
  };

  const handleUnloadIdle = async () => {
    try {
      const response = await platformAPI.unloadIdleApps(idleThreshold);
      alert(`Unloaded ${response.data.unloaded} idle apps (idle > ${idleThreshold} min)`);
      fetchCachedApps();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to unload idle apps');
    }
  };

  const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  return (
    <>
      <Header 
        title="Cached Apps" 
        subtitle="Apps currently loaded in memory"
      />

      <div className="px-8 pb-8">
        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={fetchCachedApps}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            🔄 Refresh
          </button>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">
              Idle threshold:
              <input
                type="number"
                min="1"
                max="60"
                value={idleThreshold}
                onChange={(e) => setIdleThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="ml-2 w-16 px-2 py-1 border border-gray-300 rounded text-center"
              />
              <span className="ml-1">min</span>
            </label>
            <button
              onClick={handleUnloadIdle}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Unload Idle Apps
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-600 mt-4">Loading cached apps...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Cached Apps List */}
        {!loading && !error && (
          <>
            {cachedApps.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <p className="text-gray-600 text-lg">No apps currently cached</p>
                <p className="text-gray-500 text-sm mt-2">
                  Apps are loaded on first request
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        App Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Loaded At
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Used
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Idle Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Requests
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {cachedApps.map((app) => (
                      <tr key={app.appName} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a
                            href={`http://${app.appName}.platformx.localhost:5000`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-blue-600 hover:text-blue-800"
                          >
                            {app.appName}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(app.loadedAt).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {new Date(app.lastUsed).toLocaleTimeString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDuration(app.idleTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {app.requestCount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleUnload(app.appName)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Unload
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Stats */}
            {cachedApps.length > 0 && (
              <div className="mt-6 grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">Cached Apps</p>
                  <p className="text-2xl font-bold text-gray-900">{cachedApps.length}</p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">Total Requests</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {cachedApps
                      .reduce((sum, a) => sum + a.requestCount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <p className="text-gray-600 text-sm">Avg Requests/App</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {Math.round(
                      cachedApps.reduce((sum, a) => sum + a.requestCount, 0) /
                        cachedApps.length
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {/* Info Box */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 About Caching</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Apps are loaded into memory on first request</li>
                <li>• Cached apps respond faster (no loading delay)</li>
                <li>• Idle apps (15+ min) are automatically unloaded</li>
                <li>• You can manually unload apps to free memory</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default CachedApps;
