// ═══════════════════════════════════════════════════════════════
// Not Found Page
// صفحة غير موجودة
// ═══════════════════════════════════════════════════════════════

import { Building2, Home } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">الصفحة غير موجودة</h1>
        <p className="text-gray-600 mb-6">
          عذراً، الصفحة التي تبحث عنها غير موجودة.
        </p>
        <Link
          href="/"
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
        >
          <Home className="w-5 h-5" />
          العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
