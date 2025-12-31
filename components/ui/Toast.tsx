'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  isVisible: boolean;
}

const toastConfig: Record<ToastType, { icon: typeof CheckCircle; bgColor: string; textColor: string }> = {
  success: {
    icon: CheckCircle,
    bgColor: 'var(--success, #22c55e)',
    textColor: 'white',
  },
  error: {
    icon: XCircle,
    bgColor: 'var(--error, #ef4444)',
    textColor: 'white',
  },
  warning: {
    icon: AlertCircle,
    bgColor: 'var(--warning, #f59e0b)',
    textColor: 'white',
  },
  info: {
    icon: Info,
    bgColor: 'var(--info, #3b82f6)',
    textColor: 'white',
  },
};

export function Toast({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  isVisible,
}: ToastProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => onClose?.(), 200);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !isAnimating) return null;

  const config = toastConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg
        flex items-center gap-3 min-w-[280px] max-w-[90vw] transition-all duration-200
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}
      style={{
        backgroundColor: config.bgColor,
        color: config.textColor,
      }}
      role="alert"
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      {onClose && (
        <button
          onClick={onClose}
          className="flex-shrink-0 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Hook for managing toast state
export function useToast() {
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    isVisible: boolean;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    setToast({ message, type, isVisible: true });
  };

  const hideToast = () => {
    setToast((prev) => (prev ? { ...prev, isVisible: false } : null));
  };

  const clearToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
    clearToast,
    success: (message: string) => showToast(message, 'success'),
    error: (message: string) => showToast(message, 'error'),
    warning: (message: string) => showToast(message, 'warning'),
    info: (message: string) => showToast(message, 'info'),
  };
}
