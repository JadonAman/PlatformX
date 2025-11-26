import { useEffect } from 'react';

/**
 * Toast notification component
 * Replaces browser alert() with styled notifications
 */
function Toast({ 
  isOpen, 
  onClose, 
  message,
  type = 'success', // success, error, info, warning
  duration = 3000
}) {
  useEffect(() => {
    if (isOpen && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onClose]);

  if (!isOpen) return null;

  const typeStyles = {
    success: 'bg-gradient-to-r from-green-500 to-green-600 border-green-400/20',
    error: 'bg-gradient-to-r from-red-500 to-red-600 border-red-400/20',
    warning: 'bg-gradient-to-r from-yellow-500 to-yellow-600 border-yellow-400/20',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400/20'
  };

  const typeIcons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`${typeStyles[type]} text-white rounded-xl shadow-strong px-6 py-4 flex items-center gap-3 min-w-[320px] max-w-md border backdrop-blur-sm`}>
        <span className="text-2xl font-bold flex-shrink-0 animate-scale-in">{typeIcons[type]}</span>
        <p className="flex-1 whitespace-pre-line font-medium">{message}</p>
        <button
          onClick={onClose}
          className="text-white/90 hover:text-white hover:bg-white/20 rounded-lg p-1 font-bold text-xl leading-none transition-all duration-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default Toast;
