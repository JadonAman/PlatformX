import { useState, useEffect } from 'react';

function AddEnvModal({ isOpen, onClose, onAdd }) {
  const [varName, setVarName] = useState('');
  const [varValue, setVarValue] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setVarName('');
      setVarValue('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate variable name
    if (!varName.trim()) {
      setError('Variable name is required');
      return;
    }
    
    if (!/^[A-Z0-9_]+$/.test(varName)) {
      setError('Variable name must contain only uppercase letters, digits, and underscores');
      return;
    }
    
    onAdd(varName, varValue);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-strong max-w-md w-full mx-4 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl px-6 py-5 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
                  <span className="text-xl">➕</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Add Environment Variable</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg p-1 transition-all duration-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-5">
            {error && (
              <div className="bg-gradient-to-r from-red-50 to-rose-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm font-medium animate-slide-up">
                <div className="flex items-start gap-2">
                  <span className="text-lg">⚠️</span>
                  <p>{error}</p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Variable Name *
              </label>
              <input
                type="text"
                value={varName}
                onChange={(e) => {
                  setVarName(e.target.value.toUpperCase());
                  setError('');
                }}
                placeholder="API_KEY"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono transition-all duration-200 bg-gray-50 hover:bg-white"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span>💡</span>
                Use uppercase letters, numbers, and underscores only
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Value
              </label>
              <textarea
                value={varValue}
                onChange={(e) => setVarValue(e.target.value)}
                placeholder="your-secret-value"
                rows="3"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm transition-all duration-200 bg-gray-50 hover:bg-white resize-none"
              />
              <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                <span>ℹ️</span>
                Leave empty if you'll set the value later
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 rounded-b-2xl">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98]"
            >
              Add Variable
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AddEnvModal;
