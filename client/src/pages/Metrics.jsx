import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { platformAPI } from '../services/api';
import ErrorAlert from '../components/ErrorAlert';

function Metrics() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetchMetrics();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchMetrics = async () => {
    try {
      const response = await platformAPI.getMetrics();
      setMetrics(response.data);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <>
        <Header title="Platform Metrics" subtitle="Real-time performance monitoring" />
        <div className="px-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading metrics...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Platform Metrics" subtitle="Real-time performance monitoring" />

      <div className="px-8 pb-8">
        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

        {/* Controls */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Auto-refresh (5s)</span>
            </label>
          </div>
          
          <button
            onClick={fetchMetrics}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh Now
          </button>
        </div>

        {metrics && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Requests</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">
                      {metrics.requests?.total?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-4xl">📊</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Success Rate</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {metrics.requests?.total > 0
                        ? ((metrics.requests.success / metrics.requests.total) * 100).toFixed(1)
                        : 0}%
                    </p>
                  </div>
                  <div className="text-4xl">✅</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Avg Response Time</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">
                      {formatDuration(metrics.responseTimes?.avg || 0)}
                    </p>
                  </div>
                  <div className="text-4xl">⚡</div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Errors</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {metrics.requests?.errors?.toLocaleString() || 0}
                    </p>
                  </div>
                  <div className="text-4xl">⚠️</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Response Times */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Response Times</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Minimum:</span>
                    <span className="font-mono font-medium">{formatDuration(metrics.responseTimes?.min || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Average:</span>
                    <span className="font-mono font-medium">{formatDuration(metrics.responseTimes?.avg || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Maximum:</span>
                    <span className="font-mono font-medium">{formatDuration(metrics.responseTimes?.max || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Memory Usage</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Heap Used:</span>
                    <span className="font-mono font-medium">{formatBytes(metrics.memory?.heapUsed || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Heap Total:</span>
                    <span className="font-mono font-medium">{formatBytes(metrics.memory?.heapTotal || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">RSS:</span>
                    <span className="font-mono font-medium">{formatBytes(metrics.memory?.rss || 0)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">External:</span>
                    <span className="font-mono font-medium">{formatBytes(metrics.memory?.external || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Requests by Status Code */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requests by Status Code</h2>
                {Object.keys(metrics.requests?.byStatusCode || {}).length === 0 ? (
                  <p className="text-gray-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(metrics.requests.byStatusCode)
                      .sort(([a], [b]) => parseInt(a) - parseInt(b))
                      .map(([code, count]) => (
                        <div key={code} className="flex justify-between items-center">
                          <span className={`font-medium ${
                            code.startsWith('2') ? 'text-green-600' :
                            code.startsWith('3') ? 'text-blue-600' :
                            code.startsWith('4') ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {code}
                          </span>
                          <span className="text-gray-900">{count.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Requests by Method */}
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requests by Method</h2>
                {Object.keys(metrics.requests?.byMethod || {}).length === 0 ? (
                  <p className="text-gray-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(metrics.requests.byMethod)
                      .sort(([, a], [, b]) => b - a)
                      .map(([method, count]) => (
                        <div key={method} className="flex justify-between items-center">
                          <span className="font-medium text-gray-700">{method}</span>
                          <span className="text-gray-900">{count.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Top Paths */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Top Request Paths</h2>
                {Object.keys(metrics.requests?.byPath || {}).length === 0 ? (
                  <p className="text-gray-500">No data</p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(metrics.requests.byPath)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 10)
                      .map(([path, count]) => (
                        <div key={path} className="flex justify-between items-center">
                          <span className="font-mono text-sm text-gray-700 truncate flex-1 mr-4">{path}</span>
                          <span className="text-gray-900 font-medium">{count.toLocaleString()}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Recent Errors */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Errors</h2>
                {!metrics.errors?.recent || metrics.errors.recent.length === 0 ? (
                  <div className="text-center py-8 text-green-600">
                    <p className="text-4xl mb-2">✓</p>
                    <p>No recent errors</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {metrics.errors.recent.map((error, idx) => (
                      <div key={idx} className="border border-red-200 bg-red-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-red-900">{error.type}</span>
                          <span className="text-xs text-red-600">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-red-700">{error.message}</p>
                        {error.path && (
                          <p className="text-xs text-red-600 font-mono mt-1">{error.path}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="mt-6 text-center text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default Metrics;
