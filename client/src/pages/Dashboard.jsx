import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI, platformAPI } from '../services/api';

function Dashboard() {
  const [stats, setStats] = useState({
    totalApps: 0,
    activeApps: 0,
    totalRequests: 0,
    cachedApps: 0,
  });
  const [recentApps, setRecentApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [appsResponse, cachedResponse] = await Promise.all([
        appsAPI.listApps(),
        platformAPI.getCachedApps(),
      ]);

      const apps = appsResponse.data.apps;
      const cached = cachedResponse.data.apps;

      setStats({
        totalApps: apps.length,
        activeApps: apps.filter((a) => a.status === 'active').length,
        totalRequests: apps.reduce((sum, a) => sum + a.requestCount, 0),
        cachedApps: cached.length,
      });

      // Get 5 most recent apps
      setRecentApps(
        apps
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 5)
      );
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <>
        <Header title="Dashboard" subtitle="Overview of your PlatformX deployment" />
        <div className="px-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Dashboard" subtitle="Overview of your PlatformX deployment" />

      <div className="px-8 pb-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Apps</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {stats.totalApps}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Active Apps</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {stats.activeApps}
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Requests</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">
                  {stats.totalRequests.toLocaleString()}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Cached Apps</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">
                  {stats.cachedApps}
                </p>
              </div>
              <div className="text-4xl">🗂️</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link
              to="/upload"
              className="bg-blue-600 text-white rounded-lg p-6 hover:bg-blue-700 transition-colors"
            >
              <div className="text-3xl mb-2">⬆️</div>
              <h3 className="font-bold text-lg">Upload New App</h3>
              <p className="text-blue-100 text-sm mt-1">
                Deploy a new Node.js application
              </p>
            </Link>

            <Link
              to="/apps"
              className="bg-gray-800 text-white rounded-lg p-6 hover:bg-gray-900 transition-colors"
            >
              <div className="text-3xl mb-2">📦</div>
              <h3 className="font-bold text-lg">Manage Apps</h3>
              <p className="text-gray-300 text-sm mt-1">
                View and manage all deployed apps
              </p>
            </Link>

            <Link
              to="/cached"
              className="bg-purple-600 text-white rounded-lg p-6 hover:bg-purple-700 transition-colors"
            >
              <div className="text-3xl mb-2">🗂️</div>
              <h3 className="font-bold text-lg">Cached Apps</h3>
              <p className="text-purple-100 text-sm mt-1">
                View currently loaded apps
              </p>
            </Link>
          </div>
        </div>

        {/* Recent Apps */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Recent Apps</h2>
            <Link to="/apps" className="text-blue-600 hover:text-blue-700 text-sm">
              View all →
            </Link>
          </div>

          {recentApps.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <p className="text-gray-600">No apps deployed yet</p>
              <Link
                to="/upload"
                className="inline-block mt-4 text-blue-600 hover:text-blue-700"
              >
                Upload your first app →
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Slug
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Requests
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentApps.map((app) => (
                    <tr key={app.slug} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/apps/${app.slug}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {app.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {app.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            app.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : app.status === 'disabled'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {app.requestCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(app.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Dashboard;
