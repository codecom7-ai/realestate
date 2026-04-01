// ═══════════════════════════════════════════════════════════════
// Error Page
// صفحة الخطأ العامة
// ═══════════════════════════════════════════════════════════════

'use client';

import { useEffect } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">حدث خطأ غير متوقع</h1>
        <p className="text-gray-600 mb-6">
          نعتذر عن هذا الإزعاج. يرجى تحديث الصفحة أو المحاولة مرة أخرى.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm text-left mb-4 overflow-auto max-h-32">
            {error.message}
          </div>
        )}
        <div className="space-y-3">
          <button
            onClick={unstable_retry}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            إعادة المحاولة
          </button>
          <a
            href="/"
            className="w-full py-3 border border-gray-300 text-gray-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Home className="w-5 h-5" />
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
