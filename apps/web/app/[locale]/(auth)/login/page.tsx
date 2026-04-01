'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';
import { Eye, EyeOff, Loader2, Mail, Lock, ShieldCheck, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صحيح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  totp: z.string().optional(),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, checkAuth } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if already authenticated on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        await checkAuth();
        // If checkAuth succeeds, isAuthenticated will be true
        // The middleware will handle the redirect
      } catch (error) {
        // Not authenticated, continue to login
      } finally {
        setIsCheckingAuth(false);
      }
    };
    
    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isCheckingAuth) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isCheckingAuth, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const emailValue = watch('email');
  const passwordValue = watch('password');

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.login(data.email, data.password, data.totp);
      const { user } = response.data.data;

      setIsSuccess(true);
      
      // Delay for success animation
      setTimeout(() => {
        login(user);
        // Check for redirect URL from cookie (set by middleware)
        const redirectCookie = document.cookie
          .split('; ')
          .find(row => row.startsWith('redirect_after_login='))
          ?.split('=')[1];
        
        if (redirectCookie) {
          // Clear the redirect cookie
          document.cookie = 'redirect_after_login=; path=/; max-age=0';
          router.push(decodeURIComponent(redirectCookie));
        } else {
          router.push('/dashboard');
        }
      }, 800);
    } catch (err: any) {
      const errorCode = err.response?.data?.error?.code;

      if (errorCode === 'MFA_REQUIRED') {
        setMfaRequired(true);
      } else if (errorCode === 'INVALID_TOTP') {
        setError('رمز التحقق غير صحيح');
      } else {
        setError('البريد الإلكتروني أو كلمة المرور غير صحيحة');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/30 to-orange-300/20 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl animate-blob animation-delay-2000" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/30 to-teal-300/20 dark:from-emerald-500/10 dark:to-teal-500/5 rounded-full blur-3xl animate-blob animation-delay-4000" />
      <div className="absolute top-1/2 right-1/3 w-[400px] h-[400px] bg-gradient-to-bl from-slate-300/40 to-gray-200/30 dark:from-slate-600/10 dark:to-gray-700/5 rounded-full blur-3xl animate-blob" />
      
      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] dark:opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Main Content */}
      <div 
        className={`w-full max-w-md relative z-10 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <div 
            className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/25 mb-4 transition-all duration-500 ${
              mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-l from-slate-900 via-slate-700 to-slate-900 dark:from-white dark:via-slate-200 dark:to-white bg-clip-text text-transparent">
            عقارات
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            نظام تشغيل المكتب العقاري
          </p>
        </div>

        {/* Login Card - Glass Morphism */}
        <div 
          className={`relative backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-2xl shadow-slate-900/5 dark:shadow-black/20 overflow-hidden transition-all duration-500 ${
            mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
          style={{ transitionDelay: '200ms' }}
        >
          {/* Card Gradient Border Top */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          
          {/* Card Inner Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 to-transparent dark:from-white/5 pointer-events-none" />

          <div className="relative p-8">
            {/* Card Header */}
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                تسجيل الدخول
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                أدخل بياناتك للوصول إلى حسابك
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Email Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  البريد الإلكتروني
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Mail className={`w-5 h-5 transition-colors duration-200 ${
                      errors.email 
                        ? 'text-red-500' 
                        : emailValue 
                          ? 'text-amber-500' 
                          : 'text-gray-500 group-focus-within:text-amber-600'
                    }`} />
                  </div>
                  <input
                    type="email"
                    {...register('email')}
                    className={`w-full min-h-[48px] pr-12 pl-4 rounded-xl border-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none ${
                      errors.email 
                        ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'
                    }`}
                    placeholder="example@office.com"
                    dir="ltr"
                  />
                </div>
                {errors.email && (
                  <p className="flex items-center gap-1.5 text-sm text-red-500 animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors.email.message}</span>
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  كلمة المرور
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <Lock className={`w-5 h-5 transition-colors duration-200 ${
                      errors.password 
                        ? 'text-red-500' 
                        : passwordValue 
                          ? 'text-amber-500' 
                          : 'text-gray-500 group-focus-within:text-amber-600'
                    }`} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    {...register('password')}
                    className={`w-full min-h-[48px] pr-12 pl-12 rounded-xl border-2 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none ${
                      errors.password 
                        ? 'border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-4 focus:ring-red-500/10' 
                        : 'border-slate-200 dark:border-slate-700 focus:border-amber-400 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10'
                    }`}
                    placeholder="••••••••"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="flex items-center gap-1.5 text-sm text-red-500 animate-shake">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errors.password.message}</span>
                  </p>
                )}
              </div>

              {/* MFA Code Input */}
              {mfaRequired && (
                <div 
                  className="space-y-2 animate-slide-in-up"
                  style={{ animationDuration: '300ms' }}
                >
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    رمز التحقق الثنائي
                  </label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                      <ShieldCheck className="w-5 h-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      {...register('totp')}
                      className="w-full min-h-[48px] pr-12 pl-4 rounded-xl border-2 border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-center text-2xl tracking-[0.5em] font-mono transition-all duration-200 focus:outline-none focus:border-amber-400 dark:focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10"
                      placeholder="000000"
                      maxLength={6}
                      dir="ltr"
                    />
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    أدخل الرمز من تطبيق التحقق على جهازك
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 animate-shake">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm font-medium">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || isSuccess}
                className={`w-full min-h-[52px] rounded-xl font-semibold text-white transition-all duration-300 relative overflow-hidden group ${
                  isSuccess
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/25'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 active:translate-y-0'
                } disabled:opacity-80 disabled:cursor-not-allowed`}
              >
                {/* Button Shimmer Effect */}
                {!isLoading && !isSuccess && (
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                )}
                
                <span className="relative flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>جاري التحقق...</span>
                    </>
                  ) : isSuccess ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 animate-scale-in" />
                      <span>تم تسجيل الدخول بنجاح!</span>
                    </>
                  ) : (
                    <span>دخول</span>
                  )}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <p 
          className={`text-center text-sm text-slate-500 dark:text-slate-400 mt-8 transition-all duration-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ transitionDelay: '400ms' }}
        >
          نظام تشغيل المكتب العقاري المصري © {new Date().getFullYear()}
        </p>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-4 left-4 w-24 h-24 border border-amber-200/30 dark:border-amber-500/10 rounded-full animate-pulse-slow" />
      <div className="absolute top-4 right-4 w-16 h-16 border border-emerald-200/30 dark:border-emerald-500/10 rounded-full animate-pulse-slow animation-delay-2000" />
    </div>
  );
}
