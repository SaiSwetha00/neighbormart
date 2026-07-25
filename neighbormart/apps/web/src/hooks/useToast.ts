import { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

let toastIdCounter = 0;

const toastQueue: ((toast: Toast) => void)[] = [];

export const toast = (options: Omit<Toast, 'id'>) => {
  const id = `toast-${++toastIdCounter}`;
  const t: Toast = { id, variant: 'default', duration: 4000, ...options };
  toastQueue.forEach((fn) => fn(t));
};

toast.success = (title: string, description?: string) =>
  toast({ title, description, variant: 'success' });
toast.error = (title: string, description?: string) =>
  toast({ title, description, variant: 'error' });
toast.warning = (title: string, description?: string) =>
  toast({ title, description, variant: 'warning' });

export const useToastStore = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Toast) => {
    setToasts((prev) => [...prev, t]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== t.id));
    }, t.duration || 4000);
  }, []);

  useState(() => {
    toastQueue.push(addToast);
    return () => {
      const idx = toastQueue.indexOf(addToast);
      if (idx >= 0) toastQueue.splice(idx, 1);
    };
  });

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, dismiss };
};
