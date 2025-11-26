import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊', gradient: 'from-blue-500 to-blue-600' },
    { path: '/apps', label: 'Apps', icon: '📦', gradient: 'from-purple-500 to-purple-600' },
    { path: '/upload', label: 'Upload App', icon: '⬆️', gradient: 'from-green-500 to-green-600' },
    { path: '/cached', label: 'Cached Apps', icon: '🗂️', gradient: 'from-yellow-500 to-yellow-600' },
    { path: '/backups', label: 'Backups', icon: '💾', gradient: 'from-indigo-500 to-indigo-600' },
    { path: '/metrics', label: 'Metrics', icon: '📈', gradient: 'from-pink-500 to-pink-600' },
    { path: '/api-docs', label: 'API Docs', icon: '📚', gradient: 'from-cyan-500 to-cyan-600' },
    { path: '/settings', label: 'Settings', icon: '⚙️', gradient: 'from-gray-500 to-gray-600' },
  ];

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="w-64 bg-gradient-to-b from-dark-900 via-dark-900 to-dark-800 text-white h-screen fixed left-0 top-0 flex flex-col shadow-strong">
      {/* Logo */}
      <div className="p-6 border-b border-dark-700/50 bg-gradient-to-r from-blue-600/10 to-purple-600/10">
        <h1 className="text-2xl font-bold gradient-text bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          PlatformX
        </h1>
        <p className="text-dark-400 text-sm mt-1 font-medium">Admin Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
              isActive(item.path)
                ? `bg-gradient-to-r ${item.gradient} text-white shadow-glow-sm`
                : 'text-dark-300 hover:bg-dark-800/50 hover:text-white'
            }`}
          >
            <span className={`text-xl transition-transform duration-200 ${
              isActive(item.path) ? 'scale-110' : 'group-hover:scale-110'
            }`}>
              {item.icon}
            </span>
            <span className="font-medium">{item.label}</span>
            {isActive(item.path) && (
              <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse-soft"></div>
            )}
          </Link>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700/50 bg-dark-800/50 backdrop-blur-sm">
        <div className="bg-dark-800/80 rounded-lg p-3 mb-3 border border-dark-700/50">
          <p className="font-semibold text-white text-sm">{user?.username}</p>
          <p className="text-xs text-dark-400 mt-0.5 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={logout}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
        >
          <span className="mr-2">🚪</span>
          Logout
        </button>
        <div className="mt-3 text-dark-400 text-xs text-center">
          <p className="font-medium">v1.0.0</p>
          <p className="mt-1 text-dark-500">© 2025 PlatformX</p>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
