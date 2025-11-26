/**
 * Dialog Context Provider
 * Provides global confirm and toast functions to replace browser alert/confirm
 */
import { createContext, useContext, useState, useCallback } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import Toast from '../components/Toast';

const DialogContext = createContext();

export function DialogProvider({ children }) {
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false });
  const [toast, setToast] = useState({ isOpen: false });

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setConfirmDialog({
        isOpen: true,
        message,
        title: options.title || 'Confirm Action',
        type: options.type || 'danger',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => {
          setConfirmDialog({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          setConfirmDialog({ isOpen: false });
          resolve(false);
        }
      });
    });
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({
      isOpen: true,
      message,
      type,
      duration
    });
  }, []);

  const closeToast = useCallback(() => {
    setToast({ isOpen: false });
  }, []);

  // Override global alert and confirm (optional - for backward compatibility)
  if (typeof window !== 'undefined') {
    window.customAlert = (message, type = 'info') => showToast(message, type);
    window.customConfirm = (message, options) => confirm(message, options);
  }

  const value = {
    confirm,
    toast: {
      show: showToast,
      success: (msg, duration) => showToast(msg, 'success', duration),
      error: (msg, duration) => showToast(msg, 'error', duration),
      warning: (msg, duration) => showToast(msg, 'warning', duration),
      info: (msg, duration) => showToast(msg, 'info', duration),
      close: closeToast
    }
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={confirmDialog.onCancel}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
      />
      
      <Toast
        isOpen={toast.isOpen}
        onClose={closeToast}
        message={toast.message}
        type={toast.type}
        duration={toast.duration}
      />
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return context;
}
