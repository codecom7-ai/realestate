'use client';

// ═══════════════════════════════════════════════════════════════
// Dashboard Error Boundary
// Graceful error handling with retry functionality
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface DashboardErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function DashboardError({ error, unstable_retry }: DashboardErrorProps) {
  const t = useTranslations('common');

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Dashboard Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 sm:p-8 text-center">
          {/* Error Icon */}
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>

          {/* Error Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {t('errorTitle') || 'حدث خطأ'}
          </h2>

          {/* Error Message */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('errorMessage') || 'حدث خطأ أثناء تحميل البيانات. يرجى المحاولة مرة أخرى.'}
          </p>

          {/* Error Details (Development only) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-left overflow-auto">
              <code className="text-xs text-gray-600 dark:text-gray-400 break-all">
                {error.message}
              </code>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              {t('refreshPage') || 'تحديث الصفحة'}
            </button>
            <button
              onClick={unstable_retry}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
            >
              {t('tryAgain') || 'إعادة المحاولة'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
