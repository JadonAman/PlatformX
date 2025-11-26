import { useState, useCallback } from 'react';

/**
 * Custom hook for showing confirmation dialogs
 * Usage: const confirm = useConfirm();
 *        const result = await confirm('Delete this item?');
 */
export function useConfirm() {
  const [dialog, setDialog] = useState({ isOpen: false });

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({
        isOpen: true,
        message,
        title: options.title || 'Confirm Action',
        type: options.type || 'danger',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        onConfirm: () => {
          setDialog({ isOpen: false });
          resolve(true);
        },
        onCancel: () => {
          setDialog({ isOpen: false });
          resolve(false);
        }
      });
    });
  }, []);

  return { confirm, dialog, setDialog };
}

/**
 * Custom hook for showing toast notifications
 * Usage: const toast = useToast();
 *        toast.success('Item deleted!');
 */
export function useToast() {
  const [toast, setToast] = useState({ isOpen: false });

  const show = useCallback((message, type = 'info', duration = 3000) => {
    setToast({
      isOpen: true,
      message,
      type,
      duration
    });
  }, []);

  const success = useCallback((message, duration) => show(message, 'success', duration), [show]);
  const error = useCallback((message, duration) => show(message, 'error', duration), [show]);
  const warning = useCallback((message, duration) => show(message, 'warning', duration), [show]);
  const info = useCallback((message, duration) => show(message, 'info', duration), [show]);

  const close = useCallback(() => {
    setToast({ isOpen: false });
  }, []);

  return { 
    toast, 
    setToast, 
    show, 
    success, 
    error, 
    warning, 
    info,
    close
  };
}
