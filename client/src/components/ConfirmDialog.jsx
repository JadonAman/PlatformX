import { useEffect } from 'react';

/**
 * Custom confirmation dialog component
 * Replaces browser confirm() with a styled modal
 */
function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Confirm Action',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger' // danger, warning, info
}) {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const typeColors = {
    danger: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 focus:ring-red-500',
    warning: 'from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800 focus:ring-yellow-500',
    info: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500'
  };

  const typeIcons = {
    danger: '⚠️',
    warning: '⚡',
    info: 'ℹ️'
  };

  const typeBg = {
    danger: 'bg-red-50',
    warning: 'bg-yellow-50',
    info: 'bg-blue-50'
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-strong max-w-md w-full mx-4 animate-scale-in">
        <div className={`${typeBg[type]} rounded-t-2xl px-6 py-4 border-b border-gray-200`}>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{typeIcons[type]}</span>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
        </div>
        
        <div className="px-6 py-5">
          <p className="text-gray-700 text-base leading-relaxed whitespace-pre-line">{message}</p>
        </div>
        
        <div className="flex gap-3 justify-end px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 font-medium"
          >
            {cancelText}
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 bg-gradient-to-r text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${typeColors[type]}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
