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
          <div className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-medium hover:shadow-strong p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <p className="text-blue-100 text-sm font-medium mb-2">Total Apps</p>
              <p className="text-4xl font-bold text-white mb-1">
                {stats.totalApps}
              </p>
              <div className="text-4xl absolute top-0 right-0 opacity-20 group-hover:opacity-30 transition-opacity">📦</div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-medium hover:shadow-strong p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <p className="text-green-100 text-sm font-medium mb-2">Active Apps</p>
              <p className="text-4xl font-bold text-white mb-1">
                {stats.activeApps}
              </p>
              <div className="text-4xl absolute top-0 right-0 opacity-20 group-hover:opacity-30 transition-opacity">✅</div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-medium hover:shadow-strong p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <p className="text-purple-100 text-sm font-medium mb-2">Total Requests</p>
              <p className="text-4xl font-bold text-white mb-1">
                {stats.totalRequests.toLocaleString()}
              </p>
              <div className="text-4xl absolute top-0 right-0 opacity-20 group-hover:opacity-30 transition-opacity">📊</div>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-medium hover:shadow-strong p-6 transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
            <div className="relative">
              <p className="text-indigo-100 text-sm font-medium mb-2">Cached Apps</p>
              <p className="text-4xl font-bold text-white mb-1">
                {stats.cachedApps}
              </p>
              <div className="text-4xl absolute top-0 right-0 opacity-20 group-hover:opacity-30 transition-opacity">🗂️</div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-5 flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/upload"
              className="group relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-7 hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-medium hover:shadow-strong hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">⬆️</div>
                <h3 className="font-bold text-xl mb-2">Upload New App</h3>
                <p className="text-blue-100 text-sm">
                  Deploy a new Node.js application
                </p>
              </div>
            </Link>

            <Link
              to="/apps"
              className="group relative overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 text-white rounded-2xl p-7 hover:from-gray-800 hover:to-gray-900 transition-all duration-300 shadow-medium hover:shadow-strong hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">📦</div>
                <h3 className="font-bold text-xl mb-2">Manage Apps</h3>
                <p className="text-gray-300 text-sm">
                  View and manage all deployed apps
                </p>
              </div>
            </Link>

            <Link
              to="/cached"
              className="group relative overflow-hidden bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-7 hover:from-purple-600 hover:to-purple-700 transition-all duration-300 shadow-medium hover:shadow-strong hover:-translate-y-1"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500"></div>
              <div className="relative">
                <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">🗂️</div>
                <h3 className="font-bold text-xl mb-2">Cached Apps</h3>
                <p className="text-purple-100 text-sm">
                  View currently loaded apps
                </p>
              </div>
            </Link>
          </div>
        </div>

        {/* Recent Apps */}
        <div>
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <span className="text-2xl">🕐</span>
              Recent Apps
            </h2>
            <Link to="/apps" className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 group">
              View all 
              <span className="transform group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>

          {recentApps.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="text-6xl mb-4 opacity-50">📦</div>
              <p className="text-gray-600 text-lg font-medium mb-2">No apps deployed yet</p>
              <p className="text-gray-500 text-sm mb-4">Get started by uploading your first application</p>
              <Link
                to="/upload"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                <span>⬆️</span>
                Upload your first app
              </Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-soft">
              <table className="min-w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                      Name
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
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentApps.map((app) => (
                    <tr key={app.slug} className="hover:bg-blue-50/50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          to={`/apps/${app.slug}`}
                          className="text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                        >
                          {app.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {app.slug}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full ${
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
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
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
