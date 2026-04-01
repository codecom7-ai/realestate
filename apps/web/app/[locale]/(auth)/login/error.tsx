'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function LoginError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Login page error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-red-200/30 to-orange-300/20 dark:from-red-500/10 dark:to-orange-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-red-200/30 to-rose-300/20 dark:from-red-500/10 dark:to-rose-500/5 rounded-full blur-3xl animate-pulse" />
      
      {/* Error Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-2xl p-8">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            {/* Error Title */}
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              حدث خطأ
            </h2>
            
            {/* Error Message */}
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              حدث خطأ أثناء تحميل صفحة تسجيل الدخول. يرجى المحاولة مرة أخرى.
            </p>
            
            {/* Retry Button */}
            <Button
              onClick={() => unstable_retry()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              إعادة المحاولة
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
