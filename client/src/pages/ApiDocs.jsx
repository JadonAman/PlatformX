import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { platformAPI } from '../services/api';
import ErrorAlert from '../components/ErrorAlert';

function ApiDocs() {
  const [docs, setDocs] = useState(null);
  const [version, setVersion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    fetchDocs();
  }, []);

  const fetchDocs = async () => {
    try {
      const [docsResponse, versionResponse] = await Promise.all([
        platformAPI.getApiDocs(),
        platformAPI.getApiVersion(),
      ]);
      
      setDocs(docsResponse.data);
      setVersion(versionResponse.data);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch API docs:', err);
    } finally {
      setLoading(false);
    }
  };

  const getMethodColor = (method) => {
    const colors = {
      GET: 'bg-blue-100 text-blue-800',
      POST: 'bg-green-100 text-green-800',
      PUT: 'bg-yellow-100 text-yellow-800',
      PATCH: 'bg-orange-100 text-orange-800',
      DELETE: 'bg-red-100 text-red-800',
    };
    return colors[method] || 'bg-gray-100 text-gray-800';
  };

  // Flatten endpoints from nested object structure to array
  const flattenEndpoints = (endpointsObj) => {
    if (!endpointsObj) return [];
    const result = [];
    
    // Iterate through categories (authentication, health, apps, etc.)
    Object.entries(endpointsObj).forEach(([category, endpoints]) => {
      // Iterate through endpoints in each category
      Object.entries(endpoints).forEach(([key, endpoint]) => {
        result.push({
          ...endpoint,
          category,
          key
        });
      });
    });
    
    return result;
  };

  // Extract and flatten endpoints
  const endpoints = docs?.endpoints ? flattenEndpoints(docs.endpoints) : [];
  
  const categories = endpoints.length > 0 ? [
    ...new Set(endpoints.map(e => e.category))
  ] : [];

  const filteredEndpoints = selectedCategory === 'all' 
    ? endpoints 
    : endpoints.filter(endpoint => endpoint.category === selectedCategory);

  if (loading) {
    return (
      <>
        <Header title="API Documentation" subtitle="Complete API reference" />
        <div className="px-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading documentation...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="API Documentation" subtitle="Complete API reference" />

      <div className="px-8 pb-8">
        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

        {docs && (
          <>
            {/* API Info */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-6 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{docs.name}</h2>
                  <p className="text-blue-100 mb-4">{docs.description}</p>
                  {version && (
                    <div className="flex gap-4 text-sm">
                      <span>Version: {version.version}</span>
                      <span>•</span>
                      <span>Node: {version.environment.nodeVersion}</span>
                      <span>•</span>
                      <span>Environment: {version.environment.env}</span>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-blue-100">Base URL</p>
                  <code className="text-sm bg-white bg-opacity-20 px-3 py-1 rounded">
                    {docs.baseUrl}
                  </code>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="mb-6">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-4 py-2 rounded-lg ${
                    selectedCategory === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All
                </button>
                {categories.map(category => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`px-4 py-2 rounded-lg capitalize ${
                      selectedCategory === category
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {/* Endpoints */}
            <div className="space-y-4">
              {filteredEndpoints.map((endpoint, idx) => (
                <div key={idx} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${getMethodColor(endpoint.method)}`}>
                          {endpoint.method}
                        </span>
                        <code className="text-gray-900 font-mono text-sm">{endpoint.path}</code>
                        {endpoint.auth && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                            🔒 Auth Required
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{endpoint.description}</p>

                    {/* Request Body */}
                    {endpoint.body && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Request Body:</h4>
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                          {JSON.stringify(endpoint.body, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Query Parameters */}
                    {endpoint.query && (
                      <div className="mb-3">
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Query Parameters:</h4>
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                          {JSON.stringify(endpoint.query, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Response */}
                    {endpoint.response && (
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 mb-2">Response:</h4>
                        <pre className="bg-gray-50 border border-gray-200 rounded p-3 overflow-x-auto text-xs">
                          {JSON.stringify(endpoint.response, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Error Codes */}
            {docs.errorCodes && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Error Codes</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(docs.errorCodes).map(([code, description]) => (
                    <div key={code} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <code className="text-sm font-mono font-bold text-red-600">{code}</code>
                      <span className="text-sm text-gray-700">{description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reserved Names */}
            {docs.reservedNames && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Reserved App Names</h2>
                <p className="text-gray-600 mb-4">The following names cannot be used for apps:</p>
                <div className="flex flex-wrap gap-2">
                  {docs.reservedNames.map(name => (
                    <code key={name} className="px-3 py-1 bg-red-50 text-red-700 rounded-lg text-sm font-mono">
                      {name}
                    </code>
                  ))}
                </div>
              </div>
            )}

            {/* App Name Rules */}
            {docs.appNameRules && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">App Name Rules</h2>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-semibold text-gray-600">Min Length</p>
                      <p className="text-lg font-bold text-gray-900">{docs.appNameRules.minLength}</p>
                    </div>
                    <div className="bg-gray-50 p-3 rounded">
                      <p className="text-sm font-semibold text-gray-600">Max Length</p>
                      <p className="text-lg font-bold text-gray-900">{docs.appNameRules.maxLength}</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-3 rounded mb-4">
                    <p className="text-sm font-semibold text-gray-600 mb-1">Pattern</p>
                    <code className="text-sm text-gray-900">{docs.appNameRules.pattern}</code>
                  </div>
                  {docs.appNameRules.restrictions && (
                    <div>
                      <p className="text-sm font-semibold text-gray-600 mb-2">Restrictions</p>
                      <ul className="space-y-2">
                        {docs.appNameRules.restrictions.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-blue-600">•</span>
                            <span className="text-gray-700">{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rate Limits */}
            {docs.rateLimits && (
              <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Rate Limits</h2>
                <div className="space-y-3">
                  {Object.entries(docs.rateLimits).map(([endpoint, limit]) => (
                    <div key={endpoint} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <code className="text-sm font-mono text-gray-700">{endpoint}</code>
                      <span className="text-sm text-gray-900">{limit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Migration Guide */}
            <div className="mt-8 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-200 p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="text-3xl">🔄</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 mb-2">Converting Your App to PlatformX</h2>
                  <p className="text-gray-700">
                    Need to migrate an existing Express app? Learn how to convert your entry point file to work with PlatformX.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">⚠️ Key Requirement</h3>
                <p className="text-gray-700 mb-3">
                  PlatformX manages the HTTP server for you. Your backend apps <strong>must export an Express router</strong> instead of calling <code className="bg-red-100 text-red-700 px-2 py-1 rounded">app.listen()</code>.
                </p>
                
                <div className="grid md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-red-500 font-bold">❌</span>
                      <span className="font-semibold text-gray-900">Won't Work</span>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`const app = express();

app.get('/', (req, res) => {
  res.json({ ok: true });
});

// ❌ Don't do this
app.listen(3000);`}
                    </pre>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-green-500 font-bold">✅</span>
                      <span className="font-semibold text-gray-900">Correct</span>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto">
{`const app = express();

app.get('/', (req, res) => {
  res.json({ ok: true });
});

// ✅ Export instead
module.exports = app;`}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-gray-900 mb-3">📋 Quick Conversion Checklist</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">☑</span>
                    <span>Remove all <code className="bg-gray-100 px-1 rounded">app.listen()</code> or <code className="bg-gray-100 px-1 rounded">server.listen()</code> calls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">☑</span>
                    <span>Remove <code className="bg-gray-100 px-1 rounded">http.createServer()</code> or <code className="bg-gray-100 px-1 rounded">https.createServer()</code></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">☑</span>
                    <span>Add <code className="bg-gray-100 px-1 rounded">module.exports = app</code> at the end</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">☑</span>
                    <span>Remove hardcoded PORT variables (PlatformX manages this)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-0.5">☑</span>
                    <span>Test that your entry file exports correctly</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">📖 Common Scenarios Covered</h3>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Standard Express server</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Express with middleware & routes</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Express with database connection</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Using environment variables</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Express Router as entry point</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Async initialization patterns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">HTTP server with Socket.IO</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-700">Common mistakes to avoid</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <span className="text-2xl">📚</span>
                <div className="flex-1">
                  <p className="text-gray-700 mb-2">
                    <strong>Full Migration Guide:</strong> See detailed examples for each scenario in the project README
                  </p>
                  <a 
                    href="https://github.com/JadonAman/PlatformX#-converting-your-app-to-work-with-platformx"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                  >
                    View Complete Migration Guide
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default ApiDocs;
