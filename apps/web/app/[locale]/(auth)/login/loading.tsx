export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800" />
      
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-amber-200/30 to-orange-300/20 dark:from-amber-500/10 dark:to-orange-500/5 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-200/30 to-teal-300/20 dark:from-emerald-500/10 dark:to-teal-500/5 rounded-full blur-3xl animate-pulse" />
      
      {/* Loading Card */}
      <div className="w-full max-w-md relative z-10">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-2xl p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Loading Spinner */}
            <div className="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            
            {/* Loading Text */}
            <p className="text-slate-600 dark:text-slate-400 text-sm animate-pulse">
              جاري التحميل...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
