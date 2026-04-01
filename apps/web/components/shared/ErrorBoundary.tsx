// ═══════════════════════════════════════════════════════════════
// ErrorBoundary Component - التعامل مع الأخطاء
// Features: RTL Support, Dark Mode, Accessibility (WCAG 2.1 AA)
// ═══════════════════════════════════════════════════════════════

'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    
    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI - World-Class Design
      return (
        <div 
          className="min-h-[400px] flex items-center justify-center p-4"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md w-full text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center mx-auto mb-4 ring-1 ring-red-200/50 dark:ring-red-800/30">
              <AlertTriangle className="w-8 h-8 text-red-500 dark:text-red-400" aria-hidden="true" />
            </div>

            {/* Title */}
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              حدث خطأ غير متوقع
            </h2>

            {/* Description */}
            <p className="text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">
              نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى أو العودة للصفحة الرئيسية.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary flex items-center justify-center gap-2 min-h-[44px]"
                aria-label="إعادة المحاولة"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                إعادة المحاولة
              </button>
              <button
                onClick={this.handleGoHome}
                className="btn btn-outline flex items-center justify-center gap-2 min-h-[44px]"
                aria-label="العودة للصفحة الرئيسية"
              >
                <Home className="w-4 h-4" aria-hidden="true" />
                الصفحة الرئيسية
              </button>
            </div>

            {/* Error Details (Development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div 
                className="bg-gray-100 dark:bg-gray-800/50 rounded-xl p-4 text-start ring-1 ring-gray-200 dark:ring-gray-700" 
                dir="ltr"
              >
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-medium mb-2">
                  <Bug className="w-4 h-4" aria-hidden="true" />
                  <span>Error Details (Dev Mode)</span>
                </div>
                <pre className="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-40 font-mono">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// Error Fallback for Suspense - with i18n
// ═══════════════════════════════════════════════════════════════

interface ErrorFallbackProps {
  error: Error;
  resetErrorBoundary?: () => void;
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          فشل تحميل البيانات
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {error.message || 'حدث خطأ أثناء تحميل البيانات'}
        </p>
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="btn btn-primary btn-sm inline-flex items-center gap-2"
            aria-label="إعادة المحاولة"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Network Error Component - with i18n
// ═══════════════════════════════════════════════════════════════

interface NetworkErrorProps {
  onRetry?: () => void;
  message?: string;
}

export function NetworkError({ onRetry, message }: NetworkErrorProps) {
  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-orange-500 dark:text-orange-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          خطأ في الاتصال
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {message || 'تعذر الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.'}
        </p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-primary btn-sm inline-flex items-center gap-2 mx-auto"
            aria-label="إعادة المحاولة"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Permission Error Component - with i18n
// ═══════════════════════════════════════════════════════════════

interface PermissionErrorProps {
  message?: string;
}

export function PermissionError({ message }: PermissionErrorProps) {
  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-4"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-50 dark:from-yellow-900/30 dark:to-yellow-800/20 flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 dark:text-yellow-400" aria-hidden="true" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          لا تملك صلاحية
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {message || 'ليس لديك الصلاحية اللازمة للوصول إلى هذه الصفحة.'}
        </p>
      </div>
    </div>
  );
}

export default ErrorBoundary;
