// ═══════════════════════════════════════════════════════════════
// Dashboard Loading Skeleton
// Suspense boundary for smooth page transitions
// ═══════════════════════════════════════════════════════════════

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50/50 to-gray-100/30 dark:from-gray-950 dark:to-gray-900 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 animate-pulse">
        {/* Header Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="h-8 w-48 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-32 mt-2 rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-24 rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>

        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-5"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="h-5 w-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800" />
              </div>
              <div className="h-8 w-20 rounded-lg bg-gray-200 dark:bg-gray-800 mb-2" />
              <div className="h-3 w-16 rounded-lg bg-gray-200 dark:bg-gray-800" />
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Chart Skeleton */}
          <div className="xl:col-span-2 rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-6">
            <div className="h-6 w-40 rounded-lg bg-gray-200 dark:bg-gray-800 mb-4" />
            <div className="h-80 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
          </div>

          {/* Side Panel Skeleton */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-6">
              <div className="h-6 w-32 rounded-lg bg-gray-200 dark:bg-gray-800 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-6">
              <div className="h-6 w-32 rounded-lg bg-gray-200 dark:bg-gray-800 mb-4" />
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-16 w-full rounded-lg bg-gray-200 dark:bg-gray-800" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/80 dark:bg-gray-900/80 p-4 sm:p-6">
          <div className="h-6 w-32 rounded-lg bg-gray-200 dark:bg-gray-800 mb-4" />
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
