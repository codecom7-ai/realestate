'use client';

import { useState, useEffect, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';

// ═══════════════════════════════════════════════════════════════
// Leads Chart - World-Class Design
// Features: RTL Support, Custom Tooltips, Gradient Fills, Animations
// Responsive 320px → 4K
// ═══════════════════════════════════════════════════════════════

interface LeadsChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  title?: string;
  isLoading?: boolean;
  delay?: number;
}

// Custom Tooltip Component
function CustomTooltip({ 
  active, 
  payload, 
}: { 
  active?: boolean; 
  payload?: Array<{ value: number; payload: { name: string } }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0];

  return (
    <div className="animate-scale-in">
      <div className="
        bg-white/95 dark:bg-gray-900/95
        backdrop-blur-xl
        border border-gray-200/50 dark:border-gray-700/50
        rounded-xl
        shadow-xl shadow-gray-500/10 dark:shadow-black/20
        px-4 py-3
        min-w-[120px]
      ">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {data.payload.name}
          </span>
        </div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {data.value}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          عميل محتمل
        </div>
      </div>
    </div>
  );
}

// Stage Colors
const STAGE_COLORS = [
  { from: '#3b82f6', to: '#1d4ed8', name: 'blue' },      // جديد
  { from: '#6366f1', to: '#4338ca', name: 'indigo' },   // تواصل
  { from: '#8b5cf6', to: '#6d28d9', name: 'purple' },   // مؤهل
  { from: '#f43f5e', to: '#be123c', name: 'rose' },     // تفاوض
  { from: '#22c55e', to: '#15803d', name: 'green' },    // مغلق نجاح
];

// Animated Bar Component
function AnimatedBar({ 
  data, 
  delay 
}: { 
  data: LeadsChartProps['data'];
  delay: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  const total = data.reduce((acc, item) => acc + item.value, 0);

  return (
    <div ref={ref} className="space-y-3">
      {data.map((item, index) => {
        const percentage = total > 0 ? (item.value / total) * 100 : 0;
        const color = STAGE_COLORS[index % STAGE_COLORS.length];
        
        return (
          <div 
            key={item.name} 
            className="animate-fade-in-right"
            style={{ animationDelay: `${delay + index * 100}ms` }}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {item.value}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  ({percentage.toFixed(0)}%)
                </span>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 right-0 rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: isVisible ? `${percentage}%` : '0%',
                  background: `linear-gradient(90deg, ${color.to} 0%, ${color.from} 100%)`,
                  transitionDelay: `${index * 100}ms`,
                }}
              >
                {/* Shine Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function LeadsChart({ 
  data, 
  title = 'توزيع Leads حسب المرحلة',
  isLoading = false,
  delay = 0,
}: LeadsChartProps) {
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

  // Skeleton Loader
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg mb-6 animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between mb-2">
                <div className="h-4 w-16 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-4 w-8 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full" />
            </div>
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
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          آخر 30 يوم
        </p>
      </div>

      {/* Chart Container */}
      <div className="p-4 sm:p-6">
        {/* Bar Chart for Desktop */}
        <div className="hidden md:block h-64 lg:h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                {STAGE_COLORS.map((color, index) => (
                  <linearGradient
                    key={color.name}
                    id={`gradient-${color.name}`}
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor={color.to} />
                    <stop offset="100%" stopColor={color.from} />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid
                horizontal={true}
                vertical={false}
                stroke="#e5e7eb"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#6b7280', fontSize: 12 }}
              />
              
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                tick={{ fill: '#374151', fontSize: 13, fontWeight: 500 }}
                width={80}
              />
              
              <Tooltip content={<CustomTooltip />} />
              
              <Bar
                dataKey="value"
                radius={[0, 8, 8, 0]}
                animationBegin={delay}
                animationDuration={1000}
                animationEasing="ease-out"
              >
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={`url(#gradient-${STAGE_COLORS[index % STAGE_COLORS.length].name})`}
                  />
                ))}
                <LabelList
                  dataKey="value"
                  position="left"
                  fill="#374151"
                  fontSize={12}
                  fontWeight={600}
                  offset={10}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Progress Bars for Mobile */}
        <div className="md:hidden">
          <AnimatedBar data={data} delay={delay} />
        </div>
      </div>

      {/* Summary Footer */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            إجمالي Leads
          </span>
          <span className="font-bold text-gray-900 dark:text-white">
            {data.reduce((acc, item) => acc + item.value, 0)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Skeleton Loader
export function LeadsChartSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
      <div className="h-64 bg-gray-200 dark:bg-gray-800 rounded-lg" />
    </div>
  );
}
