import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { appsAPI } from '../services/api';

function UploadApp() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [appName, setAppName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const validateAppName = (name) => {
    return /^[a-z0-9-]+$/.test(name);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!file) {
      setError('Please select a ZIP file');
      return;
    }

    if (!appName) {
      setError('App name is required');
      return;
    }

    if (!validateAppName(appName)) {
      setError('App name must contain only lowercase letters, digits, and hyphens');
      return;
    }

    // Upload
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('appName', appName);

      const response = await appsAPI.uploadZip(formData, (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      });

      setSuccess(true);
      setUploadProgress(100);
      
      // Reset form
      setFile(null);
      setAppName('');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/apps');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to upload app');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Header 
        title="Upload App" 
        subtitle="Deploy a new Node.js application to PlatformX"
      />

      <div className="px-8 pb-8 max-w-2xl">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <form onSubmit={handleSubmit}>
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
                Only lowercase letters, digits, and hyphens allowed
              </p>
              {appName && (
                <p className="text-blue-600 text-sm mt-2">
                  Your app will be accessible at: <strong>http://{appName}.platformx.localhost:5000</strong>
                </p>
              )}
            </div>

            {/* File Upload */}
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

            {/* Requirements */}
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">Requirements:</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• ZIP must contain a <code className="bg-blue-100 px-1">server.js</code> file</li>
                <li>• App must NOT use <code className="bg-blue-100 px-1">app.listen()</code> or <code className="bg-blue-100 px-1">http.createServer()</code></li>
                <li>• Export a function that returns an Express router</li>
              </ul>
            </div>

            {/* Upload Progress */}
            {uploading && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading...</span>
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

            {/* Error Message */}
            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                ✓ App uploaded successfully! Redirecting...
              </div>
            )}

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading || !file || !appName}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
              >
                {uploading ? 'Uploading...' : 'Upload App'}
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
          <h3 className="font-medium mb-2">Example server.js:</h3>
          <pre className="text-sm overflow-x-auto">
{`const express = require('express');

function createApp() {
  const router = express.Router();
  
  router.get('/', (req, res) => {
    res.json({ message: 'Hello from my app!' });
  });
  
  return router;
}

module.exports = createApp;`}
          </pre>
        </div>
      </div>
    </>
  );
}

export default UploadApp;
