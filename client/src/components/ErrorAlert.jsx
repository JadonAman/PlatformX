import { useState } from 'react';
import { formatError, getErrorColorClasses, copyErrorToClipboard } from '../utils/errorHandler';

function ErrorAlert({ error, onClose }) {
  const [copied, setCopied] = useState(false);
  
  if (!error) return null;
  
  const errorInfo = formatError(error);
  const colors = getErrorColorClasses(errorInfo.color);
  
  const handleCopy = () => {
    copyErrorToClipboard(errorInfo);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4 mb-4`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <h3 className={`font-semibold ${colors.text}`}>Error</h3>
            {errorInfo.code && (
              <span className={`text-xs px-2 py-1 rounded-full ${colors.badge} font-mono`}>
                {errorInfo.code}
              </span>
            )}
            {errorInfo.category && (
              <span className={`text-xs px-2 py-1 rounded-full ${colors.badge}`}>
                {errorInfo.category}
              </span>
            )}
          </div>
          
          <p className={`${colors.text} mb-3`}>{errorInfo.message}</p>
          
          {errorInfo.details && (
            <div className="mb-3">
              <p className={`text-sm ${colors.text} font-semibold mb-1`}>Details:</p>
              <pre className={`text-xs ${colors.text} bg-white bg-opacity-50 p-2 rounded overflow-x-auto`}>
                {typeof errorInfo.details === 'string' 
                  ? errorInfo.details 
                  : JSON.stringify(errorInfo.details, null, 2)}
              </pre>
            </div>
          )}
          
          {errorInfo.requestId && (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-gray-600">Request ID:</span>
              <code className="text-xs font-mono bg-white bg-opacity-50 px-2 py-1 rounded">
                {errorInfo.requestId}
              </code>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleCopy}
              className={`text-xs ${colors.text} hover:underline flex items-center gap-1`}
            >
              {copied ? (
                <>
                  <span>✓</span>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <span>📋</span>
                  <span>Copy Error Details</span>
                </>
              )}
            </button>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className={`${colors.text} hover:opacity-70 ml-4`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorAlert;
