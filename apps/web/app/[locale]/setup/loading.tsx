export default function SetupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      <div className="w-full max-w-2xl">
        <div className="backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 rounded-3xl border border-white/50 dark:border-slate-700/50 shadow-2xl p-8">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Logo Skeleton */}
            <div className="w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700 animate-pulse" />
            
            {/* Title Skeleton */}
            <div className="space-y-2 text-center">
              <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse" />
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
            </div>
            
            {/* Steps Skeleton */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  {step < 5 && <div className="w-12 h-1 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />}
                </div>
              ))}
            </div>
            
            {/* Form Skeleton */}
            <div className="w-full space-y-4 pt-4">
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse" />
              <div className="h-12 w-full bg-amber-200 dark:bg-amber-500/20 rounded-xl animate-pulse mt-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
