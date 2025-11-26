import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { backupAPI } from '../services/api';
import ErrorAlert from '../components/ErrorAlert';
import { useDialog } from '../contexts/DialogContext';

function Backups() {
  const navigate = useNavigate();
  const { confirm, toast } = useDialog();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [restoring, setRestoring] = useState(null);
  const [restoreOptions, setRestoreOptions] = useState({
    backupName: '',
    newName: '',
    overwrite: false,
  });

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const response = await backupAPI.listBackups();
      setBackups(response.data.backups || []);
      setError(null);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch backups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreOptions.backupName) {
      toast.warning('Please select a backup to restore');
      return;
    }

    try {
      const options = {};
      if (restoreOptions.newName) {
        options.newName = restoreOptions.newName;
      }
      if (restoreOptions.overwrite) {
        options.overwrite = true;
      }

      const response = await backupAPI.restoreBackup(restoreOptions.backupName, options);
      toast.success(response.data.message || 'Backup restored successfully!');
      setRestoring(null);
      navigate('/apps');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to restore backup');
    }
  };

  const handleDelete = async (backupName) => {
    const confirmed = await confirm(`Delete backup "${backupName}"? This cannot be undone.`, {
      title: 'Delete Backup',
      type: 'danger',
      confirmText: 'Delete'
    });
    if (!confirmed) return;

    try {
      await backupAPI.deleteBackup(backupName);
      toast.success('Backup deleted successfully!');
      fetchBackups();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete backup');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const parseBackupName = (filename) => {
    // Format: appname-timestamp.zip
    const match = filename.match(/^(.+?)-(\d+)\.zip$/);
    if (match) {
      return {
        appName: match[1],
        timestamp: new Date(parseInt(match[2])),
      };
    }
    return { appName: filename, timestamp: null };
  };

  if (loading) {
    return (
      <>
        <Header title="Backups" subtitle="App backup management" />
        <div className="px-8 text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading backups...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Backups" subtitle="App backup management" />

      <div className="px-8 pb-8">
        {error && <ErrorAlert error={error} onClose={() => setError(null)} />}

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={fetchBackups}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            🔄 Refresh
          </button>
          
          <div className="text-sm text-gray-600">
            {backups.length} backup{backups.length !== 1 ? 's' : ''} total
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> Backups are created manually from the app details page. 
            They include all app files and metadata. You can restore them with a different name or overwrite existing apps.
          </p>
        </div>

        {/* Backups List */}
        {backups.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Backups Yet</h3>
            <p className="text-gray-600 mb-4">
              Create backups from individual app pages to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {backups.map((backup) => {
              const parsed = parseBackupName(backup.filename);
              
              return (
                <div key={backup.filename} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-gray-900">{parsed.appName}</h3>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Backup
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Filename</p>
                          <p className="text-gray-900 font-mono text-xs">{backup.filename}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600">Size</p>
                          <p className="text-gray-900 font-medium">{formatFileSize(backup.size)}</p>
                        </div>
                        
                        <div>
                          <p className="text-gray-600">Created</p>
                          <p className="text-gray-900 font-medium">
                            {parsed.timestamp 
                              ? parsed.timestamp.toLocaleString()
                              : new Date(backup.created).toLocaleString()
                            }
                          </p>
                        </div>
                      </div>

                      {backup.metadata && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs text-gray-600 mb-1">Metadata:</p>
                          <pre className="text-xs text-gray-700 font-mono overflow-x-auto">
                            {JSON.stringify(backup.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => {
                          setRestoring(backup);
                          setRestoreOptions({
                            backupName: backup.filename,
                            newName: '',
                            overwrite: false,
                          });
                        }}
                        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                      >
                        Restore
                      </button>
                      
                      <button
                        onClick={() => handleDelete(backup.filename)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Restore Modal */}
      {restoring && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Restore Backup</h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                Restoring: <strong>{restoring.filename}</strong>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New App Name (optional)
              </label>
              <input
                type="text"
                value={restoreOptions.newName}
                onChange={(e) => setRestoreOptions({ ...restoreOptions, newName: e.target.value.toLowerCase() })}
                placeholder="Leave empty to use original name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                If empty, uses the original app name from the backup
              </p>
            </div>

            <div className="mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={restoreOptions.overwrite}
                  onChange={(e) => setRestoreOptions({ ...restoreOptions, overwrite: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Overwrite if app exists</span>
              </label>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Restoring will:
              </p>
              <ul className="text-sm text-yellow-800 mt-2 list-disc list-inside">
                <li>Extract backup files to apps directory</li>
                <li>Create or update database entry</li>
                {restoreOptions.overwrite && (
                  <li className="font-bold">Overwrite existing app files!</li>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setRestoring(null);
                  setRestoreOptions({ backupName: '', newName: '', overwrite: false });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRestore}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Backups;
