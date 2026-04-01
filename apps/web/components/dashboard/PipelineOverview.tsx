'use client';

import { useState, useEffect, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// Pipeline Overview - World-Class Visual Funnel
// Features: Animated Stages, Visual Funnel, Count Badges, RTL
// Responsive 320px → 4K
// ═══════════════════════════════════════════════════════════════

interface PipelineStage {
  id: string;
  name: string;
  count: number;
  value?: number;
  color: string;
}

interface PipelineOverviewProps {
  stages?: PipelineStage[];
  isLoading?: boolean;
  delay?: number;
}

// Default Stages Data
const defaultStages: PipelineStage[] = [
  { id: 'new', name: 'جديد', count: 45, color: 'blue' },
  { id: 'contacted', name: 'تواصل', count: 32, color: 'indigo' },
  { id: 'qualified', name: 'مؤهل', count: 22, color: 'purple' },
  { id: 'viewing', name: 'معاينة', count: 15, color: 'pink' },
  { id: 'negotiation', name: 'تفاوض', count: 10, color: 'orange' },
  { id: 'closed', name: 'مغلق', count: 8, color: 'green' },
];

// Stage Color Configuration
const stageColors: Record<string, { 
  bg: string; 
  text: string; 
  border: string;
  gradient: string;
  icon: string;
}> = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-blue-600',
    icon: 'bg-blue-500',
  },
  indigo: {
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800',
    gradient: 'from-indigo-500 to-indigo-600',
    icon: 'bg-indigo-500',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800',
    gradient: 'from-purple-500 to-purple-600',
    icon: 'bg-purple-500',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/50',
    text: 'text-pink-700 dark:text-pink-300',
    border: 'border-pink-200 dark:border-pink-800',
    gradient: 'from-pink-500 to-pink-600',
    icon: 'bg-pink-500',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/50',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-200 dark:border-orange-800',
    gradient: 'from-orange-500 to-orange-600',
    icon: 'bg-orange-500',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-950/50',
    text: 'text-green-700 dark:text-green-300',
    border: 'border-green-200 dark:border-green-800',
    gradient: 'from-green-500 to-green-600',
    icon: 'bg-green-500',
  },
};

// Animated Counter
function useAnimatedCounter(end: number, duration: number = 1000) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [isVisible, end, duration]);

  return { count, setIsVisible };
}

// Funnel Stage Component
function FunnelStage({ 
  stage, 
  index, 
  total,
  maxCount,
  isVisible,
  delay,
}: { 
  stage: PipelineStage;
  index: number;
  total: number;
  maxCount: number;
  isVisible: boolean;
  delay: number;
}) {
  const colors = stageColors[stage.color] || stageColors.blue;
  const percentage = total > 0 ? (stage.count / total) * 100 : 0;
  const widthPercentage = maxCount > 0 ? (stage.count / maxCount) * 100 : 0;
  const { count, setIsVisible } = useAnimatedCounter(stage.count);

  useEffect(() => {
    if (isVisible) {
      setIsVisible(true);
    }
  }, [isVisible, setIsVisible]);

  return (
    <div
      className="animate-fade-in-up"
      style={{ animationDelay: `${delay + index * 100}ms` }}
    >
      {/* Stage Card */}
      <div className={`
        relative overflow-hidden
        rounded-xl border
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-lg
        ${colors.bg} ${colors.border}
      `}>
        {/* Background Gradient */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            background: `linear-gradient(135deg, transparent 0%, currentColor 100%)`,
          }}
        />

        <div className="relative p-3 sm:p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className={`text-sm font-semibold ${colors.text}`}>
              {stage.name}
            </span>
            
            {/* Count Badge */}
            <div className={`
              flex items-center justify-center
              min-w-[32px] h-7 px-2
              rounded-lg
              text-white text-sm font-bold
              bg-gradient-to-r ${colors.gradient}
              shadow-sm
              transition-transform duration-200
              group-hover:scale-110
            `}>
              {count}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200/50 dark:bg-gray-800/50 rounded-full overflow-hidden">
            <div
              className={`
                absolute inset-y-0 right-0
                rounded-full
                bg-gradient-to-l ${colors.gradient}
                transition-all duration-1000 ease-out
              `}
              style={{
                width: isVisible ? `${widthPercentage}%` : '0%',
                transitionDelay: `${index * 100}ms`,
              }}
            >
              {/* Shimmer Effect */}
              <div className="absolute inset-0 animate-pulse-slow">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </div>
            </div>
          </div>

          {/* Percentage */}
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              نسبة التحويل
            </span>
            <span className={`text-xs font-semibold ${colors.text}`}>
              {percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Visual Funnel SVG
function VisualFunnel({ stages }: { stages: PipelineStage[] }) {
  const total = stages.reduce((acc, s) => acc + s.count, 0);
  const maxCount = Math.max(...stages.map(s => s.count));
  
  // Calculate funnel points
  const funnelHeight = 200;
  const funnelWidth = 300;
  const stageHeight = funnelHeight / stages.length;
  
  const paths = stages.map((stage, index) => {
    const topWidth = (stage.count / maxCount) * funnelWidth;
    const nextStage = stages[index + 1];
    const bottomWidth = nextStage ? (nextStage.count / maxCount) * funnelWidth : topWidth * 0.5;
    
    const yTop = index * stageHeight;
    const yBottom = (index + 1) * stageHeight;
    const centerX = funnelWidth / 2;
    
    const points = [
      [centerX - topWidth / 2, yTop],
      [centerX + topWidth / 2, yTop],
      [centerX + bottomWidth / 2, yBottom],
      [centerX - bottomWidth / 2, yBottom],
    ];
    
    return {
      path: `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]} L ${points[2][0]} ${points[2][1]} L ${points[3][0]} ${points[3][1]} Z`,
      color: stage.color,
      count: stage.count,
      name: stage.name,
    };
  });

  return (
    <div className="hidden xl:block relative">
      <svg 
        viewBox={`0 0 ${funnelWidth} ${funnelHeight}`} 
        className="w-full h-auto"
        style={{ maxHeight: '250px' }}
      >
        <defs>
          {Object.entries(stageColors).map(([name, colors]) => (
            <linearGradient
              key={name}
              id={`funnel-gradient-${name}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor={colors.gradient.split(' ')[0].replace('from-', '')} />
              <stop offset="100%" stopColor={colors.gradient.split(' ')[1].replace('to-', '')} />
            </linearGradient>
          ))}
        </defs>
        
        {paths.map((stage, index) => (
          <g key={index}>
            <path
              d={stage.path}
              fill={`url(#funnel-gradient-${stage.color})`}
              className="transition-opacity duration-300 hover:opacity-80"
              style={{ cursor: 'pointer' }}
            />
            <text
              x={funnelWidth / 2}
              y={index * stageHeight + stageHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="white"
              fontSize="12"
              fontWeight="600"
            >
              {stage.count}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function PipelineOverview({ 
  stages = defaultStages,
  isLoading = false,
  delay = 0,
}: PipelineOverviewProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const total = stages.reduce((acc, stage) => acc + stage.count, 0);
  const maxCount = Math.max(...stages.map(s => s.count));

  // Skeleton Loader
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
        <div className="space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="
        rounded-2xl 
        border border-gray-200/60 dark:border-gray-800/40
        bg-gradient-to-br from-white/80 to-white/50 
        dark:from-gray-900/80 dark:to-gray-900/50
        backdrop-blur-sm
        shadow-lg shadow-gray-500/5 dark:shadow-black/10
        overflow-hidden
        animate-fade-in-up
      "
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              Pipeline Overview
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              مراحل الـ Pipeline
            </p>
          </div>
          
          {/* Total Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-full">
            <span className="text-xs text-gray-500 dark:text-gray-400">الإجمالي</span>
            <span className="text-sm font-bold text-gray-900 dark:text-white">{total}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6">
        {/* Visual Funnel for Large Screens */}
        <VisualFunnel stages={stages} />

        {/* Stage Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:hidden gap-3">
          {stages.map((stage, index) => (
            <FunnelStage
              key={stage.id}
              stage={stage}
              index={index}
              total={total}
              maxCount={maxCount}
              isVisible={isVisible}
              delay={delay}
            />
          ))}
        </div>

        {/* Conversion Rates */}
        <div className="mt-6 pt-4 border-t border-gray-200/50 dark:border-gray-800/50">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {isVisible ? ((stages[0]?.count || 0) / Math.max(total, 1) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                معدل الـ Leads الجديدة
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
                {isVisible ? ((stages[stages.length - 1]?.count || 0) / Math.max(total, 1) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                معدل الإغلاق
              </p>
            </div>
            
            <div className="text-center">
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                {isVisible ? (total / stages.length).toFixed(1) : '0'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                متوسط لكل مرحلة
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Loader
export function PipelineOverviewSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
