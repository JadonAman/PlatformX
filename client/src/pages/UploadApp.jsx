import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI } from '../services/api';
import ErrorAlert from '../components/ErrorAlert';
import { validateAppName, RESERVED_NAMES } from '../utils/errorHandler';

function UploadApp() {
  const navigate = useNavigate();
  const [deploymentMethod, setDeploymentMethod] = useState('zip'); // 'zip' or 'git'
  const [file, setFile] = useState(null);
  const [appName, setAppName] = useState('');
  const [appType, setAppType] = useState('auto'); // 'auto', 'backend', 'frontend', 'fullstack'
  const [entryFile, setEntryFile] = useState('server.js');
  const [buildDir, setBuildDir] = useState('');
  const [proxyRoutes, setProxyRoutes] = useState([{ path: '', target: '' }]);
  const [repoUrl, setRepoUrl] = useState('');
  const [repoBranch, setRepoBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [showGithubToken, setShowGithubToken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [deploymentResult, setDeploymentResult] = useState(null);

  // Update entry file when app type changes
  useEffect(() => {
    if (appType === 'frontend') {
      setEntryFile(''); // Frontend apps don't need entry file
    } else if (!entryFile || entryFile === '') {
      setEntryFile('server.js'); // Default for backend/fullstack
    }
  }, [appType]);

  const validateName = (name) => {
    return validateAppName(name);
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith('.zip')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Please select a .zip file');
        setFile(null);
      }
    }
  };

  const addProxyRoute = () => {
    setProxyRoutes([...proxyRoutes, { path: '', target: '' }]);
  };

  const removeProxyRoute = (index) => {
    setProxyRoutes(proxyRoutes.filter((_, i) => i !== index));
  };

  const updateProxyRoute = (index, field, value) => {
    const updated = [...proxyRoutes];
    updated[index][field] = value;
    setProxyRoutes(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setDeploymentResult(null);

    // Validation
    if (deploymentMethod === 'zip') {
      if (!file) {
        setError('Please select a ZIP file');
        return;
      }
    } else if (deploymentMethod === 'git') {
      if (!repoUrl) {
        setError('Repository URL is required');
        return;
      }
      if (!repoUrl.match(/^https:\/\/|^git@/)) {
        setError('Repository URL must start with https:// or git@');
        return;
      }
    }

    if (!appName) {
      setError('App name is required');
      return;
    }

    const validation = validateName(appName);
    if (!validation.valid) {
      setError('Invalid app name:\n' + validation.errors.join('\n'));
      return;
    }

    // Entry file only required for backend/fullstack apps
    if ((appType === 'backend' || appType === 'fullstack' || appType === 'auto') && !entryFile) {
      setError('Entry file is required for backend applications');
      return;
    }

    // Deploy
    try {
      setUploading(true);
      let response;

      if (deploymentMethod === 'zip') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('appName', appName);
        formData.append('entryFile', entryFile);
        
        if (appType !== 'auto') {
          formData.append('appType', appType);
        }
        
        if (buildDir) {
          formData.append('buildDir', buildDir);
        }
        
        // Add proxy config
        const validProxyRoutes = proxyRoutes.filter(r => r.path && r.target);
        if (validProxyRoutes.length > 0) {
          const proxyConfig = {};
          validProxyRoutes.forEach(r => {
            proxyConfig[r.path] = r.target;
          });
          formData.append('proxyConfig', JSON.stringify(proxyConfig));
        }

        response = await appsAPI.uploadZip(formData, (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percentCompleted);
        });
      } else {
        const payload = {
          repoUrl,
          branch: repoBranch,
          appName,
          entryFile,
        };
        
        // Add GitHub token if provided
        if (githubToken) {
          payload.githubToken = githubToken;
        }
        
        if (appType !== 'auto') {
          payload.appType = appType;
        }
        
        if (buildDir) {
          payload.buildDir = buildDir;
        }
        
        // Add proxy config
        const validProxyRoutes = proxyRoutes.filter(r => r.path && r.target);
        if (validProxyRoutes.length > 0) {
          const proxyConfig = {};
          validProxyRoutes.forEach(r => {
            proxyConfig[r.path] = r.target;
          });
          payload.proxyConfig = JSON.stringify(proxyConfig);
        }
        
        response = await appsAPI.gitImport(payload);
      }

      setSuccess(true);
      setUploadProgress(100);
      setDeploymentResult(response.data);
      
      // Reset form
      setFile(null);
      setAppName('');
      setEntryFile('server.js');
      setRepoUrl('');
      setRepoBranch('main');
      
      // Redirect after 3 seconds
      setTimeout(() => {
        navigate('/apps');
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to deploy app');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header 
        title="Deploy App" 
        subtitle="Deploy a new Node.js application to PlatformX"
      />

      <div className="px-8 pb-8 max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
            {/* Deployment Method Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Deployment Method
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setDeploymentMethod('zip')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    deploymentMethod === 'zip'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={uploading}
                >
                  <div className="font-medium">📦 ZIP Upload</div>
                  <div className="text-xs mt-1 text-gray-600">Upload a ZIP file</div>
                </button>
                <button
                  type="button"
                  onClick={() => setDeploymentMethod('git')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    deploymentMethod === 'git'
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={uploading}
                >
                  <div className="font-medium">🔗 Git Import</div>
                  <div className="text-xs mt-1 text-gray-600">Clone from repository</div>
                </button>
              </div>
            </div>

            {/* App Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Name (slug)
              </label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                placeholder="my-app"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading}
              />
              <p className="text-gray-500 text-sm mt-1">
                Only lowercase letters, digits, and hyphens allowed (3-63 characters)
              </p>
              {appName && (
                <p className="text-blue-600 text-sm mt-2">
                  Your app will be accessible at: <strong>http://{appName}.platformx.localhost:5000</strong>
                </p>
              )}
              
              {/* Reserved Names Warning */}
              <details className="mt-3">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  ⚠️ Reserved names (click to view)
                </summary>
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-xs text-red-800 mb-2">
                    The following names are reserved and cannot be used:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {RESERVED_NAMES.map(name => (
                      <code key={name} className="text-xs bg-white px-2 py-1 rounded text-red-700">
                        {name}
                      </code>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            {/* App Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                App Type
              </label>
              <select
                value={appType}
                onChange={(e) => setAppType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={uploading}
              >
                <option value="auto">🔍 Auto-detect</option>
                <option value="backend">⚙️ Backend API (Express.js)</option>
                <option value="frontend">🎨 Frontend (React/Vue/Static)</option>
                <option value="fullstack">📦 Fullstack (Frontend + Backend)</option>
              </select>
              <p className="text-gray-500 text-sm mt-1">
                {appType === 'auto' && 'Platform will detect app type automatically'}
                {appType === 'backend' && 'Express.js API that exports a router'}
                {appType === 'frontend' && 'Static site or SPA (will run npm build if needed)'}
                {appType === 'fullstack' && 'Combined frontend and backend application'}
              </p>
            </div>

            {/* Entry File (for backend/fullstack) */}
            {(appType === 'auto' || appType === 'backend' || appType === 'fullstack') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Entry File {appType === 'frontend' && '(optional)'}
                </label>
                <input
                  type="text"
                  value={entryFile}
                  onChange={(e) => setEntryFile(e.target.value)}
                  placeholder="server.js"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
                <p className="text-gray-500 text-sm mt-1">
                  Main JavaScript file that exports your Express router
                </p>
              </div>
            )}

            {/* Build Directory (for frontend/fullstack) */}
            {(appType === 'frontend' || appType === 'fullstack') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Build Directory (optional)
                </label>
                <input
                  type="text"
                  value={buildDir}
                  onChange={(e) => setBuildDir(e.target.value)}
                  placeholder="dist, build, out (auto-detected)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={uploading}
                />
                <p className="text-gray-500 text-sm mt-1">
                  Leave empty to auto-detect. Common: dist, build, out
                </p>
              </div>
            )}

            {/* API Proxy Configuration (for frontend) */}
            {(appType === 'frontend' || appType === 'fullstack') && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API Proxy Routes (optional)
                </label>
                <p className="text-gray-500 text-sm mb-3">
                  Configure proxy to forward API requests to backend services
                </p>
                {proxyRoutes.map((route, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={route.path}
                      onChange={(e) => updateProxyRoute(index, 'path', e.target.value)}
                      placeholder="/api"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={uploading}
                    />
                    <input
                      type="text"
                      value={route.target}
                      onChange={(e) => updateProxyRoute(index, 'target', e.target.value)}
                      placeholder="http://backend.localhost:5000"
                      className="flex-[2] px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      disabled={uploading}
                    />
                    {proxyRoutes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeProxyRoute(index)}
                        className="px-3 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors text-sm"
                        disabled={uploading}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addProxyRoute}
                  className="text-sm text-blue-600 hover:text-blue-700"
                  disabled={uploading}
                >
                  + Add proxy route
                </button>
              </div>
            )}

            {/* ZIP Upload Fields */}
            {deploymentMethod === 'zip' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP File
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    disabled={uploading}
                  />
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer"
                  >
                    {file ? (
                      <div>
                        <p className="text-green-600 font-medium">✓ {file.name}</p>
                        <p className="text-gray-500 text-sm mt-1">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-gray-600">Click to select a ZIP file</p>
                        <p className="text-gray-500 text-sm mt-1">Maximum size: 50MB</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>
            )}

            {/* Git Import Fields */}
            {deploymentMethod === 'git' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Repository URL
                  </label>
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repo.git"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    HTTPS or Git URL of the repository
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Branch
                  </label>
                  <input
                    type="text"
                    value={repoBranch}
                    onChange={(e) => setRepoBranch(e.target.value)}
                    placeholder="main"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploading}
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    Branch to clone (default: main)
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    GitHub Token (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showGithubToken ? 'text' : 'password'}
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxx (for private repos)"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      disabled={uploading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowGithubToken(!showGithubToken)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      tabIndex={-1}
                    >
                      {showGithubToken ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <p className="text-gray-500 text-sm mt-1">
                    Leave empty to use global token from Settings. Required for private repositories.
                  </p>
                </div>
              </>
            )}

            {/* Requirements */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Requirements:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {deploymentMethod === 'zip' ? 'ZIP' : 'Repository'} must contain your entry file (e.g., <code className="bg-blue-100 px-1">{entryFile}</code>)</li>
                <li>• App must NOT use <code className="bg-blue-100 px-1">app.listen()</code> or <code className="bg-blue-100 px-1">http.createServer()</code></li>
                <li>• Export a function that returns an Express router</li>
                {deploymentMethod === 'zip' && <li>• Include .env file in ZIP for environment variables (optional)</li>}
              </ul>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{deploymentMethod === 'zip' ? 'Uploading' : 'Cloning'}...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                <p className="font-medium">✓ App deployed successfully!</p>
                {deploymentResult && (
                  <div className="mt-2 text-sm space-y-1">
                    {deploymentResult.hasEnvFile && (
                      <p>• Environment variables loaded: {deploymentResult.envVarsCount} variables</p>
                    )}
                    {deploymentResult.deploymentMethod && (
                      <p>• Deployment method: {deploymentResult.deploymentMethod}</p>
                    )}
                  </div>
                )}
                <p className="mt-2 text-sm">Redirecting to apps list...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6">
                <ErrorAlert 
                  error={typeof error === 'string' ? { response: { data: { error } } } : error} 
                  onClose={() => setError(null)} 
                />
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading || !appName || (deploymentMethod === 'zip' && !file) || (deploymentMethod === 'git' && !repoUrl)}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {uploading 
                  ? (deploymentMethod === 'zip' ? 'Uploading...' : 'Cloning...') 
                  : (deploymentMethod === 'zip' ? 'Upload App' : 'Import from Git')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/apps')}
                disabled={uploading}
                className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* Example Code */}
        <div className="mt-6 bg-gray-900 text-gray-100 rounded-lg p-4">
          <h3 className="font-medium mb-2">Example {entryFile}:</h3>
          <pre className="text-sm overflow-x-auto">
{`const express = require('express');

function createApp() {
  const router = express.Router();
  
  // Access per-app environment variables
  router.get('/', (req, res) => {
    res.json({ 
      message: 'Hello from my app!',
      appName: req.appName,
      envVars: Object.keys(req.appEnv || {})
    });
  });
  
  // Access per-app MongoDB database
  router.get('/data', async (req, res) => {
    const collection = req.db.collection('items');
    const items = await collection.find().toArray();
    res.json({ items });
  });
  
  return router;
}

module.exports = createApp;`}
          </pre>
        </div>

        {deploymentMethod === 'zip' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">💡 Tip: Include .env file</h3>
            <p className="text-sm text-blue-800">
              Add a .env file to your ZIP with your environment variables:
            </p>
            <pre className="text-xs bg-blue-100 text-blue-900 p-2 rounded mt-2 overflow-x-auto">
{`API_KEY=your-api-key
DATABASE_URL=mongodb://localhost:27017
DEBUG=true`}
            </pre>
          </div>
        )}
      </div>
    </>
  );
}

export default UploadApp;
