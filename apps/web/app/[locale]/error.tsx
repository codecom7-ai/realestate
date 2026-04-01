'use client';

// ═══════════════════════════════════════════════════════════════
// Global Error Boundary
// Catches unexpected errors and provides recovery options
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { ExclamationTriangleIcon, HomeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}

export default function GlobalError({ error, unstable_retry }: GlobalErrorProps) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('[Global Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 dark:bg-gray-950 antialiased">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-lg w-full">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl p-6 sm:p-8 text-center">
              {/* Error Icon */}
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>

              {/* Error Title */}
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                حدث خطأ غير متوقع
              </h1>

              {/* Error Message */}
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                نأسف لحدوث هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
              </p>

              {/* Error Details (Development only) */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-right overflow-auto max-h-40">
                  <code className="text-xs text-red-600 dark:text-red-400 break-all">
                    {error.message}
                  </code>
                  {error.stack && (
                    <pre className="mt-2 text-xs text-gray-500 dark:text-gray-500 whitespace-pre-wrap">
                      {error.stack.split('\n').slice(0, 5).join('\n')}
                    </pre>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="/"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <HomeIcon className="w-4 h-4" />
                  الصفحة الرئيسية
                </a>
                <button
                  onClick={unstable_retry}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  إعادة المحاولة
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
