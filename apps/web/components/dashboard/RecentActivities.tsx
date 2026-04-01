'use client';

import { useState, useEffect, useRef } from 'react';
import {
  UserPlusIcon,
  HomeIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  PhoneIcon,
  DocumentTextIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';

// ═══════════════════════════════════════════════════════════════
// Recent Activities - World-Class Timeline Design
// Features: Timeline Layout, Animated Entries, User Avatars, RTL
// Responsive 320px → 4K
// ═══════════════════════════════════════════════════════════════

interface Activity {
  id: string;
  type: 'lead' | 'property' | 'deal' | 'payment' | 'viewing' | 'call' | 'note';
  title: string;
  description?: string;
  user?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  timestamp: Date;
  metadata?: {
    value?: number;
    property?: string;
    client?: string;
  };
}

interface RecentActivitiesProps {
  activities?: Activity[];
  isLoading?: boolean;
  maxItems?: number;
  delay?: number;
}

// Default Activities
const defaultActivities: Activity[] = [
  {
    id: '1',
    type: 'lead',
    title: 'تم إضافة عميل محتمل جديد',
    description: 'أحمد محمد - فيلا في الشيخ زايد',
    user: { name: 'سارة علي', initials: 'س ع' },
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    metadata: { client: 'أحمد محمد' },
  },
  {
    id: '2',
    type: 'property',
    title: 'تم حجز عقار',
    description: 'شقة 120م في التجمع الخامس',
    user: { name: 'محمد خالد', initials: 'م خ' },
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    metadata: { property: 'شقة 120م', value: 3500000 },
  },
  {
    id: '3',
    type: 'deal',
    title: 'تم إغلاق صفقة بنجاح',
    description: 'فيلا في الشيخ زايد - المرحلة الأولى',
    user: { name: 'أحمد محمد', initials: 'أ م' },
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    metadata: { value: 8500000 },
  },
  {
    id: '4',
    type: 'payment',
    title: 'تم استلام دفعة',
    description: 'دفعة أولى - شقة المعادي',
    user: { name: 'سارة علي', initials: 'س ع' },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    metadata: { value: 150000 },
  },
  {
    id: '5',
    type: 'viewing',
    title: 'تمت جدولة معاينة',
    description: 'فيلا 6 أكتوبر - غداً الساعة 10 صباحاً',
    user: { name: 'محمد خالد', initials: 'م خ' },
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000),
    metadata: { property: 'فيلا 6 أكتوبر' },
  },
  {
    id: '6',
    type: 'call',
    title: 'تم إجراء مكالمة',
    description: 'متابعة مع العميل - مهند عبدالله',
    user: { name: 'أحمد محمد', initials: 'أ م' },
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
];

// Activity Type Configuration
const activityConfig: Record<Activity['type'], {
  icon: typeof UserPlusIcon;
  color: string;
  bgColor: string;
  borderColor: string;
  label: string;
}> = {
  lead: {
    icon: UserPlusIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/40',
    borderColor: 'border-blue-400 dark:border-blue-600',
    label: 'عميل محتمل',
  },
  property: {
    icon: HomeIcon,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/40',
    borderColor: 'border-purple-400 dark:border-purple-600',
    label: 'عقار',
  },
  deal: {
    icon: CheckCircleIcon,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/40',
    borderColor: 'border-green-400 dark:border-green-600',
    label: 'صفقة',
  },
  payment: {
    icon: CurrencyDollarIcon,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40',
    borderColor: 'border-amber-400 dark:border-amber-600',
    label: 'دفعة',
  },
  viewing: {
    icon: CalendarIcon,
    color: 'text-cyan-600 dark:text-cyan-400',
    bgColor: 'bg-cyan-100 dark:bg-cyan-900/40',
    borderColor: 'border-cyan-400 dark:border-cyan-600',
    label: 'معاينة',
  },
  call: {
    icon: PhoneIcon,
    color: 'text-indigo-600 dark:text-indigo-400',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40',
    borderColor: 'border-indigo-400 dark:border-indigo-600',
    label: 'مكالمة',
  },
  note: {
    icon: DocumentTextIcon,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-400 dark:border-gray-600',
    label: 'ملاحظة',
  },
};

// Time Ago Formatter
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'الآن';
  } else if (diffMins < 60) {
    return `منذ ${diffMins} دقيقة`;
  } else if (diffHours < 24) {
    return `منذ ${diffHours} ساعة`;
  } else if (diffDays === 1) {
    return 'أمس';
  } else if (diffDays < 7) {
    return `منذ ${diffDays} أيام`;
  } else {
    return date.toLocaleDateString('ar-EG', { 
      month: 'short', 
      day: 'numeric' 
    });
  }
}

// Format Currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Timeline Entry Component
function TimelineEntry({ 
  activity, 
  index, 
  isLast,
  delay,
}: { 
  activity: Activity;
  index: number;
  isLast: boolean;
  delay: number;
}) {
  const config = activityConfig[activity.type];
  const Icon = config.icon;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, delay + index * 100);
    return () => clearTimeout(timer);
  }, [delay, index]);

  return (
    <div
      className={`
        relative flex gap-3 sm:gap-4
        transition-all duration-500 ease-out
        ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}
      `}
    >
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute right-[18px] sm:right-[22px] top-10 bottom-0 w-0.5 bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-700 dark:to-gray-800" />
      )}

      {/* Icon Container */}
      <div
        className={`
          relative z-10 flex-shrink-0
          w-9 h-9 sm:w-11 sm:h-11
          rounded-full
          flex items-center justify-center
          border-2
          shadow-sm
          ${config.bgColor} ${config.borderColor}
          transition-transform duration-300
          hover:scale-110
        `}
      >
        <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.color}`} />
        
        {/* Pulse Effect for Recent Items */}
        {index === 0 && (
          <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />
        )}
      </div>

      {/* Content Card */}
      <div className="flex-1 min-w-0 pb-4">
        <div
          className={`
            rounded-xl
            border border-gray-100 dark:border-gray-800
            bg-white dark:bg-gray-900
            p-3 sm:p-4
            shadow-sm
            transition-all duration-200
            hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700
          `}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white">
                {activity.title}
              </h4>
              {activity.description && (
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                  {activity.description}
                </p>
              )}
            </div>
            
            {/* Badge */}
            <span className={`
              flex-shrink-0
              px-2 py-0.5
              text-xs font-medium
              rounded-full
              ${config.bgColor} ${config.color}
            `}>
              {config.label}
            </span>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-50 dark:border-gray-800">
            {/* User */}
            {activity.user && (
              <div className="flex items-center gap-2">
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {activity.user.initials}
                  </span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-300">
                  {activity.user.name}
                </span>
              </div>
            )}
            
            {/* Time */}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatTimeAgo(activity.timestamp)}
            </span>
          </div>

          {/* Metadata */}
          {activity.metadata?.value && (
            <div className="mt-2 pt-2 border-t border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-1.5">
                <CurrencyDollarIcon className="w-3.5 h-3.5 text-green-500" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {formatCurrency(activity.metadata.value)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecentActivities({ 
  activities = defaultActivities,
  isLoading = false,
  maxItems = 6,
  delay = 0,
}: RecentActivitiesProps) {
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

  const displayActivities = activities.slice(0, maxItems);

  // Skeleton Loader
  if (isLoading) {
    return (
      <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 animate-pulse">
        <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
              </div>
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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
              النشاطات الأخيرة
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              آخر التحديثات في النظام
            </p>
          </div>
          
          {/* View All Button */}
          <button className="
            flex items-center gap-1
            px-3 py-1.5
            text-sm font-medium
            text-blue-600 dark:text-blue-400
            hover:bg-blue-50 dark:hover:bg-blue-900/30
            rounded-lg
            transition-colors duration-200
          ">
            عرض الكل
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4 sm:p-6 max-h-[480px] overflow-y-auto">
        <div className="space-y-1">
          {displayActivities.map((activity, index) => (
            <TimelineEntry
              key={activity.id}
              activity={activity}
              index={index}
              isLast={index === displayActivities.length - 1}
              delay={isVisible ? delay : 0}
            />
          ))}
        </div>
      </div>

      {/* Footer Stats */}
      <div className="px-4 sm:px-6 py-3 bg-gray-50/50 dark:bg-gray-800/30 border-t border-gray-200/50 dark:border-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span>نشط الآن</span>
            </div>
            <span>{activities.length} نشاط اليوم</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Skeleton Loader
export function RecentActivitiesSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/40 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-4 sm:p-6 animate-pulse">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-800 rounded-lg mb-4" />
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-800 rounded" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-800 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
