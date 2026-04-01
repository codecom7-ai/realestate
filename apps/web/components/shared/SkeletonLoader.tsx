// ═══════════════════════════════════════════════════════════════
// SkeletonLoader Component - هيكل التحميل
// Features: Dark Mode, RTL Support, Multiple Variants
// ═══════════════════════════════════════════════════════════════

'use client';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════
// Base Skeleton with Dark Mode Support
// ═══════════════════════════════════════════════════════════════

interface SkeletonProps {
  className?: string;
  /** Animation variant */
  variant?: 'shimmer' | 'pulse' | 'wave';
}

export function Skeleton({ className, variant = 'shimmer' }: SkeletonProps) {
  const variantClasses = {
    shimmer: 'skeleton-shimmer',
    pulse: 'animate-pulse bg-gray-200 dark:bg-gray-800',
    wave: 'animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 bg-[length:200%_100%]',
  };

  return (
    <div
      className={cn(
        'rounded-lg',
        variant === 'shimmer' ? 'skeleton-shimmer' : variantClasses[variant],
        className
      )}
      role="presentation"
      aria-hidden="true"
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// Skeleton Variants
// ═══════════════════════════════════════════════════════════════

export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 ? 'w-3/4' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  return <Skeleton className={cn(sizeClasses[size], 'rounded-full')} />;
}

export function SkeletonButton({ className }: { className?: string }) {
  return <Skeleton className={cn('h-10 w-24 rounded-lg', className)} />;
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn('card p-4 space-y-4', className)}>
      <div className="flex items-center gap-3">
        <SkeletonAvatar />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <SkeletonText lines={2} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Table Skeleton
// ═══════════════════════════════════════════════════════════════

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
}

export function SkeletonTable({ rows = 5, columns = 4 }: SkeletonTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        {/* Header */}
        <thead>
          <tr className="border-b">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="p-4">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        {/* Body */}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="border-b">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="p-4">
                  <Skeleton className="h-4 w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// List Skeleton
// ═══════════════════════════════════════════════════════════════

interface SkeletonListProps {
  items?: number;
}

export function SkeletonList({ items = 5 }: SkeletonListProps) {
  return (
    <div className="space-y-4">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <SkeletonAvatar />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Dashboard Skeleton
// ═══════════════════════════════════════════════════════════════

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-24 mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="card p-4">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-4">
        <Skeleton className="h-6 w-40 mb-4" />
        <SkeletonList items={4} />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Kanban Skeleton
// ═══════════════════════════════════════════════════════════════

export function SkeletonKanban({ columns = 4 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {Array.from({ length: columns }).map((_, colIndex) => (
        <div key={colIndex} className="flex-shrink-0 w-72">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-8 rounded-full" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, cardIndex) => (
                <div key={cardIndex} className="bg-white rounded-lg p-3 shadow-sm">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2 mb-2" />
                  <div className="flex items-center justify-between">
                    <SkeletonAvatar size="sm" />
                    <Skeleton className="h-5 w-12 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Combined Skeleton Loader with type support
// ═══════════════════════════════════════════════════════════════

interface SkeletonLoaderProps {
  type?: 'card' | 'list' | 'table' | 'dashboard' | 'kanban' | 'detail' | 'grid' | 'form';
  count?: number;
  rows?: number;
  columns?: number;
  items?: number;
  className?: string;
}

export function SkeletonLoader({ 
  type = 'card', 
  count = 3, 
  rows, 
  columns, 
  items,
  className 
}: SkeletonLoaderProps) {
  switch (type) {
    case 'list':
      return <SkeletonList items={items || count} />;
    case 'table':
      return <SkeletonTable rows={rows || 5} columns={columns || 4} />;
    case 'dashboard':
      return <SkeletonDashboard />;
    case 'kanban':
      return <SkeletonKanban columns={columns || 4} />;
    case 'detail':
      return (
        <div className={cn('space-y-6', className)}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-4 space-y-4">
              <Skeleton className="h-5 w-24" />
              <SkeletonText lines={3} />
            </div>
            <div className="card p-4 space-y-4">
              <Skeleton className="h-5 w-24" />
              <SkeletonText lines={3} />
            </div>
          </div>
        </div>
      );
    case 'grid':
      return (
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-6 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      );
    case 'form':
      return (
        <div className={cn('space-y-6', className)}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-32" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j}>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    case 'card':
    default:
      return (
        <div className={cn('space-y-4', className)}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );
  }
}

export default SkeletonLoader;
