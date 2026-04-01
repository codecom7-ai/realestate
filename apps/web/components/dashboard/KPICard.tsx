'use client';

import { useEffect, useState, useRef } from 'react';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
} from '@heroicons/react/24/solid';

// ═══════════════════════════════════════════════════════════════
// KPI Card - World-Class Design
// Features: Glass morphism, Animated Counters, Micro-sparklines
// RTL Support | Responsive 320px → 4K | Accessibility (WCAG 2.1 AA)
// ═══════════════════════════════════════════════════════════════

interface KPICardProps {
  title: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  color: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  isCurrency?: boolean;
  sparklineData?: number[];
  icon?: React.ReactNode;
  delay?: number;
  /** Click handler for drill-down */
  onClick?: () => void;
  /** Accessibility label for the card */
  ariaLabel?: string;
}

// Animated Counter Hook
function useAnimatedCounter(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentCount = Math.floor(easeOutQuart * end);
      
      setCount(currentCount);

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return { count, ref };
}

// Mini Sparkline Component
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  const padding = 2;

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((value - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;

  const colorMap: Record<string, { stroke: string; fill: string }> = {
    primary: { stroke: '#3b82f6', fill: 'url(#gradient-primary)' },
    success: { stroke: '#10b981', fill: 'url(#gradient-success)' },
    warning: { stroke: '#f59e0b', fill: 'url(#gradient-warning)' },
    danger: { stroke: '#ef4444', fill: 'url(#gradient-danger)' },
    info: { stroke: '#06b6d4', fill: 'url(#gradient-info)' },
    secondary: { stroke: '#f97316', fill: 'url(#gradient-secondary)' },
  };

  const colors = colorMap[color] || colorMap.primary;

  return (
    <svg width={width} height={height} className="opacity-80">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={colors.stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colors.stroke} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#gradient-${color})`}
        className="animate-fade-in"
      />
      <polyline
        points={points}
        fill="none"
        stroke={colors.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="animate-fade-in"
      />
    </svg>
  );
}

// Format currency
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M ج.م`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K ج.م`;
  }
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('ar-EG').format(value);
}

export function KPICard({
  title,
  value,
  change,
  trend,
  color,
  isCurrency = false,
  sparklineData,
  icon,
  delay = 0,
  onClick,
  ariaLabel,
}: KPICardProps) {
  const { count, ref } = useAnimatedCounter(value);
  
  const displayValue = isCurrency 
    ? formatCurrency(count) 
    : formatNumber(count);

  const colorClasses: Record<string, { 
    bg: string; 
    border: string; 
    text: string; 
    iconBg: string;
    glow: string;
  }> = {
    primary: {
      bg: 'bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/20',
      border: 'border-blue-200/60 dark:border-blue-800/40',
      text: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500',
      glow: 'hover:shadow-blue-500/10 dark:hover:shadow-blue-400/10',
    },
    success: {
      bg: 'bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/20',
      border: 'border-emerald-200/60 dark:border-emerald-800/40',
      text: 'text-emerald-600 dark:text-emerald-400',
      iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-400 dark:to-emerald-500',
      glow: 'hover:shadow-emerald-500/10 dark:hover:shadow-emerald-400/10',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20',
      border: 'border-amber-200/60 dark:border-amber-800/40',
      text: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500',
      glow: 'hover:shadow-amber-500/10 dark:hover:shadow-amber-400/10',
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-50/80 to-red-100/50 dark:from-red-950/40 dark:to-red-900/20',
      border: 'border-red-200/60 dark:border-red-800/40',
      text: 'text-red-600 dark:text-red-400',
      iconBg: 'bg-gradient-to-br from-red-500 to-red-600 dark:from-red-400 dark:to-red-500',
      glow: 'hover:shadow-red-500/10 dark:hover:shadow-red-400/10',
    },
    info: {
      bg: 'bg-gradient-to-br from-cyan-50/80 to-cyan-100/50 dark:from-cyan-950/40 dark:to-cyan-900/20',
      border: 'border-cyan-200/60 dark:border-cyan-800/40',
      text: 'text-cyan-600 dark:text-cyan-400',
      iconBg: 'bg-gradient-to-br from-cyan-500 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500',
      glow: 'hover:shadow-cyan-500/10 dark:hover:shadow-cyan-400/10',
    },
    secondary: {
      bg: 'bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/20',
      border: 'border-orange-200/60 dark:border-orange-800/40',
      text: 'text-orange-600 dark:text-orange-400',
      iconBg: 'bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500',
      glow: 'hover:shadow-orange-500/10 dark:hover:shadow-orange-400/10',
    },
  };

  const colors = colorClasses[color] || colorClasses.primary;

  const TrendIcon = trend === 'up' 
    ? ArrowTrendingUpIcon 
    : trend === 'down' 
      ? ArrowTrendingDownIcon 
      : MinusIcon;

  const trendColor = trend === 'up' 
    ? 'text-emerald-500 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400' 
    : trend === 'down' 
      ? 'text-red-500 bg-red-100 dark:bg-red-900/30 dark:text-red-400' 
      : 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400';

  // Build accessible label
  const accessibleLabel = ariaLabel || `${title}: ${displayValue}. ${change > 0 ? 'زيادة' : change < 0 ? 'انخفاض' : 'ثابت'} بنسبة ${Math.abs(change).toFixed(1)}%`;

  return (
    <div
      ref={ref}
      role="article"
      aria-label={accessibleLabel}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`
        group relative overflow-hidden
        rounded-2xl border backdrop-blur-sm
        transition-all duration-300 ease-out
        hover:scale-[1.02] hover:shadow-xl
        ${colors.bg} ${colors.border} ${colors.glow}
        animate-fade-in-up
        ${onClick ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-900' : ''}
      `}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-current to-transparent blur-2xl" />
        <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-gradient-to-tl from-current to-transparent blur-2xl" />
      </div>

      <div className="relative p-4 sm:p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 mb-1 truncate">
              {title}
            </p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
                {displayValue}
              </h3>
            </div>
          </div>

          {/* Icon Container */}
          <div className={`
            flex-shrink-0
            p-2.5 sm:p-3
            rounded-xl
            text-white shadow-lg
            ${colors.iconBg}
            transition-transform duration-300
            group-hover:scale-110 group-hover:rotate-3
          `}>
            {icon || <TrendIcon className="w-5 h-5 sm:w-6 sm:h-6" />}
          </div>
        </div>

        {/* Footer: Trend & Sparkline */}
        <div className="mt-3 sm:mt-4 flex items-center justify-between gap-3">
          {/* Trend Badge */}
          <div className={`
            inline-flex items-center gap-1.5
            px-2.5 py-1
            rounded-full text-xs font-semibold
            ${trendColor}
            transition-transform duration-200
            group-hover:scale-105
          `}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span>
              {change > 0 ? '+' : ''}{change.toFixed(1)}%
            </span>
          </div>

          {/* Sparkline */}
          {sparklineData && sparklineData.length > 0 && (
            <div className="hidden sm:block">
              <MiniSparkline data={sparklineData} color={color} />
            </div>
          )}
        </div>

        {/* Bottom Progress Line */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200/50 dark:bg-gray-800/50">
          <div 
            className={`
              h-full rounded-r-full
              transition-all duration-1000 ease-out
              ${colors.iconBg}
            `}
            style={{ 
              width: `${Math.min(Math.abs(change) * 3 + 20, 100)}%`,
              animationDelay: `${delay + 300}ms`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

// Skeleton Loader for KPI Card
export function KPICardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-5 md:p-6 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="h-3 sm:h-4 w-20 sm:w-24 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2" />
          <div className="h-6 sm:h-8 w-28 sm:w-32 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        </div>
        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gray-200 dark:bg-gray-800" />
      </div>
      <div className="mt-3 sm:mt-4 flex items-center justify-between">
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-800 rounded-full" />
        <div className="hidden sm:block h-6 w-20 bg-gray-200 dark:bg-gray-800 rounded" />
      </div>
    </div>
  );
}
