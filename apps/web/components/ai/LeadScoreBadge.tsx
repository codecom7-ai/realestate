'use client';

// ═══════════════════════════════════════════════════════════════
// Lead Score Badge - شارة تقييم AI للعميل المحتمل
// 🔥 Hot (75-100): أخضر داكن
// 🌡️ Warm (50-74): برتقالي
// 🧊 Cold (0-49): أزرق فاتح
// ═══════════════════════════════════════════════════════════════

import { memo } from 'react';
import { Flame, Thermometer, Snowflake, Sparkles } from 'lucide-react';

// Types
export type LeadScoreLevel = 'hot' | 'warm' | 'cold';

export interface LeadScoreBadgeProps {
  score: number | null | undefined;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  onClick?: () => void;
  className?: string;
}

// Helper to determine score level
export const getScoreLevel = (score: number | null | undefined): LeadScoreLevel => {
  if (score === null || score === undefined) return 'cold';
  if (score >= 75) return 'hot';
  if (score >= 50) return 'warm';
  return 'cold';
};

// Helper to get score label
export const getScoreLabel = (level: LeadScoreLevel): string => {
  const labels: Record<LeadScoreLevel, string> = {
    hot: 'ساخن',
    warm: 'دافئ',
    cold: 'بارد',
  };
  return labels[level];
};

// Helper to get score emoji
export const getScoreEmoji = (level: LeadScoreLevel): string => {
  const emojis: Record<LeadScoreLevel, string> = {
    hot: '🔥',
    warm: '🌡️',
    cold: '🧊',
  };
  return emojis[level];
};

const LeadScoreBadge = memo(function LeadScoreBadge({
  score,
  showLabel = true,
  size = 'md',
  animated = true,
  onClick,
  className = '',
}: LeadScoreBadgeProps) {
  const level = getScoreLevel(score);
  const label = getScoreLabel(level);
  const emoji = getScoreEmoji(level);

  // Size classes
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-3 py-1 text-sm gap-1.5',
    lg: 'px-4 py-1.5 text-base gap-2',
  };

  // Color classes based on level
  const colorClasses = {
    hot: {
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
      text: 'text-emerald-700 dark:text-emerald-400',
      border: 'border-emerald-200 dark:border-emerald-800',
      glow: animated ? 'shadow-emerald-500/20' : '',
    },
    warm: {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-400',
      border: 'border-amber-200 dark:border-amber-800',
      glow: animated ? 'shadow-amber-500/20' : '',
    },
    cold: {
      bg: 'bg-sky-100 dark:bg-sky-900/30',
      text: 'text-sky-700 dark:text-sky-400',
      border: 'border-sky-200 dark:border-sky-800',
      glow: animated ? 'shadow-sky-500/20' : '',
    },
  };

  const colors = colorClasses[level];

  // Icon based on level
  const IconComponent = {
    hot: Flame,
    warm: Thermometer,
    cold: Snowflake,
  }[level];

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  }[size];

  const displayScore = score !== null && score !== undefined ? Math.round(score) : '?';

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center rounded-full border font-medium
        ${sizeClasses[size]}
        ${colors.bg} ${colors.text} ${colors.border}
        ${animated ? 'shadow-sm' : ''}
        ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
        ${className}
      `}
      title={`تقييم AI: ${displayScore}/100`}
    >
      {score === null || score === undefined ? (
        <Sparkles className={`${iconSize} opacity-50`} />
      ) : (
        <>
          <span className="text-base">{emoji}</span>
          {showLabel && (
            <>
              <IconComponent className={iconSize} />
              <span>{label}</span>
            </>
          )}
          <span className="font-bold mr-1">{displayScore}</span>
        </>
      )}
    </span>
  );
});

// Export a compact version for cards
export const LeadScoreMini = memo(function LeadScoreMini({
  score,
  onClick,
}: {
  score: number | null | undefined;
  onClick?: () => void;
}) {
  const level = getScoreLevel(score);
  const emoji = getScoreEmoji(level);
  const displayScore = score !== null && score !== undefined ? Math.round(score) : '?';

  const colorClasses = {
    hot: 'bg-emerald-500 text-white',
    warm: 'bg-amber-500 text-white',
    cold: 'bg-sky-500 text-white',
  };

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
        ${colorClasses[level]}
        ${onClick ? 'cursor-pointer' : ''}
      `}
      title={`تقييم AI: ${displayScore}/100`}
    >
      <span>{emoji}</span>
      <span>{displayScore}</span>
    </span>
  );
});

// Export a detailed version for profiles
export const LeadScoreDetailed = memo(function LeadScoreDetailed({
  score,
  factors,
  onRescore,
}: {
  score: number | null | undefined;
  factors?: {
    budgetAlignment?: number;
    timelineUrgency?: number;
    engagementLevel?: number;
    propertyMatch?: number;
  };
  onRescore?: () => void;
}) {
  const level = getScoreLevel(score);
  const label = getScoreLabel(level);
  const emoji = getScoreEmoji(level);
  const displayScore = score !== null && score !== undefined ? Math.round(score) : '--';

  const colorClasses = {
    hot: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-700 dark:text-emerald-400',
      progress: 'bg-emerald-500',
    },
    warm: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      progress: 'bg-amber-500',
    },
    cold: {
      bg: 'bg-sky-50 dark:bg-sky-900/20',
      border: 'border-sky-200 dark:border-sky-800',
      text: 'text-sky-700 dark:text-sky-400',
      progress: 'bg-sky-500',
    },
  };

  const colors = colorClasses[level];

  return (
    <div className={`rounded-xl border p-4 ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="font-bold text-lg text-gray-900 dark:text-white">
              {displayScore}/100
            </div>
            <div className={`text-sm ${colors.text}`}>{label}</div>
          </div>
        </div>
        {onRescore && (
          <button
            onClick={onRescore}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 
              border border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700
              transition-colors"
          >
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>إعادة التقييم</span>
          </button>
        )}
      </div>

      {/* Score Progress Bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
        <div
          className={`h-full ${colors.progress} transition-all duration-500`}
          style={{ width: `${score || 0}%` }}
        />
      </div>

      {/* Factors */}
      {factors && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">عوامل التقييم</div>
          {Object.entries(factors).map(([key, value]) => {
            const factorLabels: Record<string, string> = {
              budgetAlignment: 'توافق الميزانية',
              timelineUrgency: 'إلحاح الجدول الزمني',
              engagementLevel: 'مستوى التفاعل',
              propertyMatch: 'توافق العقار',
            };
            const factorValue = Math.round((value || 0) * 100);
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">
                  {factorLabels[key] || key}
                </span>
                <div className="w-24 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{ width: `${factorValue}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-left">
                  {factorValue}%
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default LeadScoreBadge;
