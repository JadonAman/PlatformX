// Error code categories and descriptions
export const ERROR_CATEGORIES = {
  1000: { category: 'Authentication', color: 'red' },
  2000: { category: 'Validation', color: 'yellow' },
  3000: { category: 'Application', color: 'orange' },
  4000: { category: 'Database', color: 'purple' },
  5000: { category: 'Filesystem', color: 'blue' },
  6000: { category: 'Git', color: 'green' },
  7000: { category: 'Server', color: 'gray' },
  8000: { category: 'Environment', color: 'indigo' },
};

// Get error category based on error code
export const getErrorCategory = (errorCode) => {
  if (!errorCode) return { category: 'Unknown', color: 'gray' };
  
  const categoryCode = Math.floor(errorCode / 1000) * 1000;
  return ERROR_CATEGORIES[categoryCode] || { category: 'Unknown', color: 'gray' };
};

// Format error for display
export const formatError = (error) => {
  const response = error?.response?.data;
  const requestId = response?._requestId;
  
  // Handle new error code format
  if (response?.error) {
    const { code, message, details } = response.error;
    const category = getErrorCategory(code);
    
    return {
      message: message || 'An error occurred',
      code: code || null,
      category: category.category,
      color: category.color,
      details: details || null,
      requestId: requestId || null,
      raw: response,
    };
  }
  
  // Fallback to old format
  return {
    message: response?.message || response?.error || error?.message || 'An error occurred',
    code: null,
    category: 'Unknown',
    color: 'gray',
    details: null,
    requestId: requestId || null,
    raw: response,
  };
};

// Copy error details to clipboard
export const copyErrorToClipboard = (errorInfo) => {
  const text = `
Error Report
============
Message: ${errorInfo.message}
${errorInfo.code ? `Code: ${errorInfo.code}` : ''}
${errorInfo.category ? `Category: ${errorInfo.category}` : ''}
${errorInfo.requestId ? `Request ID: ${errorInfo.requestId}` : ''}
${errorInfo.details ? `Details: ${JSON.stringify(errorInfo.details, null, 2)}` : ''}
Time: ${new Date().toISOString()}
  `.trim();
  
  navigator.clipboard.writeText(text).then(() => {
    console.log('Error details copied to clipboard');
  });
  
  return text;
};

// Get color classes for error display
export const getErrorColorClasses = (color) => {
  const colorMap = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', badge: 'bg-red-100 text-red-800' },
    yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', badge: 'bg-orange-100 text-orange-800' },
    purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
    blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
    gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  };
  
  return colorMap[color] || colorMap.gray;
};

// Reserved app names
export const RESERVED_NAMES = [
  'api', 'admin', 'www', 'mail', 'ftp', 'localhost', 'dashboard',
  'auth', 'login', 'register', 'static', 'assets', 'public',
  'cdn', 'blog'
];

// Validate app name
export const validateAppName = (name) => {
  const errors = [];
  
  if (!name || name.trim() === '') {
    errors.push('App name is required');
    return { valid: false, errors };
  }
  
  if (name.length < 3) {
    errors.push('App name must be at least 3 characters long');
  }
  
  if (name.length > 63) {
    errors.push('App name must be less than 63 characters');
  }
  
  if (!/^[a-z0-9-]+$/.test(name)) {
    errors.push('App name can only contain lowercase letters, digits, and hyphens');
  }
  
  if (name.startsWith('-') || name.endsWith('-')) {
    errors.push('App name cannot start or end with a hyphen');
  }
  
  if (name.includes('--')) {
    errors.push('App name cannot contain consecutive hyphens');
  }
  
  if (RESERVED_NAMES.includes(name)) {
    errors.push(`"${name}" is a reserved name and cannot be used`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
};
