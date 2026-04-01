'use client';

import { useToastStore } from '@/hooks/useToast';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const toastStyles = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    icon: 'text-green-500',
    title: 'text-green-800 dark:text-green-200',
    message: 'text-green-600 dark:text-green-300',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500',
    title: 'text-red-800 dark:text-red-200',
    message: 'text-red-600 dark:text-red-300',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500',
    title: 'text-yellow-800 dark:text-yellow-200',
    message: 'text-yellow-600 dark:text-yellow-300',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500',
    title: 'text-blue-800 dark:text-blue-200',
    message: 'text-blue-600 dark:text-blue-300',
  },
};

const icons = {
  success: CheckCircleIcon,
  error: XCircleIcon,
  warning: ExclamationTriangleIcon,
  info: InformationCircleIcon,
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div
      className="fixed z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none"
      style={{ top: '1rem', left: '1rem' }}
      dir="rtl"
    >
      {toasts.map((toast, index) => {
        const styles = toastStyles[toast.type];
        const Icon = icons[toast.type];

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 p-4 rounded-lg border shadow-lg',
              'animate-in slide-in-from-left-full duration-300',
              styles.bg,
              styles.border
            )}
            style={{
              animationDelay: `${index * 50}ms`,
            }}
          >
            <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', styles.icon)} />
            
            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-medium', styles.title)}>
                {toast.title}
              </p>
              {toast.message && (
                <p className={cn('mt-1 text-sm', styles.message)}>
                  {toast.message}
                </p>
              )}
              {toast.action && (
                <button
                  onClick={toast.action.onClick}
                  className={cn(
                    'mt-2 text-sm font-medium underline',
                    styles.title
                  )}
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className={cn(
                'flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors',
                styles.title
              )}
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
