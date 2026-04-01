import Link from 'next/link';
import { HomeIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

// ═══════════════════════════════════════════════════════════════
// 404 Not Found Page
// User-friendly 404 with helpful actions
// ═══════════════════════════════════════════════════════════════

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {/* 404 Illustration */}
        <div className="mb-8">
          <div className="text-8xl sm:text-9xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            404
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
          الصفحة غير موجودة
        </h1>

        {/* Description */}
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
          >
            <HomeIcon className="w-5 h-5" />
            الصفحة الرئيسية
          </Link>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            لوحة التحكم
          </Link>
        </div>

        {/* Help Links */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            هل تبحث عن شيء آخر؟
          </p>
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link
              href="/dashboard/properties"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              العقارات
            </Link>
            <Link
              href="/dashboard/clients"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              العملاء
            </Link>
            <Link
              href="/dashboard/leads"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              العملاء المحتملين
            </Link>
            <Link
              href="/dashboard/deals"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              الصفقات
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
