// ═══════════════════════════════════════════════════════════════
// ActivityTimeline - الجدول الزمني للأنشطة
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { format, isToday, isYesterday, isThisWeek, isThisMonth, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import api from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';
import AddActivityForm from './AddActivityForm';

// أنواع الأنشطة
export type ActivityType = 'call' | 'whatsapp' | 'email' | 'meeting' | 'note' | 'viewing' | 'contract' | 'payment' | 'system';
export type EntityType = 'lead' | 'client' | 'property' | 'deal' | 'contract' | 'payment';

// واجهة النشاط
export interface Activity {
  id: string;
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
    avatarUrl?: string;
  };
  entityType: EntityType;
  entityId: string;
  activityType: ActivityType;
  title: string;
  body?: string;
  metadata?: Record<string, unknown>;
  aiGenerated: boolean;
  occurredAt: string;
  createdAt: string;
}

// واجهة الاستجابة
interface TimelineResponse {
  data: Activity[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

interface ActivityTimelineProps {
  entityType?: EntityType;
  entityId?: string;
  showHeader?: boolean;
  showAddButton?: boolean;
  limit?: number;
  onActivityAdded?: () => void;
}

// أيقونات الأنشطة
const activityIcons: Record<ActivityType, string> = {
  call: '📞',
  whatsapp: '💬',
  email: '📧',
  meeting: '👥',
  note: '📝',
  viewing: '🏠',
  contract: '📄',
  payment: '💰',
  system: '⚙️',
};

// ألوان الأنشطة
const activityColors: Record<ActivityType, string> = {
  call: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  whatsapp: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  email: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  meeting: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  note: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  viewing: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  contract: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  payment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  system: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
};

// تجميع الأنشطة حسب التاريخ
function groupActivitiesByDate(activities: Activity[], t: (key: string) => string) {
  const groups: { label: string; activities: Activity[] }[] = [];
  const groupMap = new Map<string, Activity[]>();

  activities.forEach((activity) => {
    const date = parseISO(activity.occurredAt);
    let groupKey: string;

    if (isToday(date)) {
      groupKey = 'today';
    } else if (isYesterday(date)) {
      groupKey = 'yesterday';
    } else if (isThisWeek(date, { weekStartsOn: 6 })) {
      groupKey = 'thisWeek';
    } else if (isThisMonth(date)) {
      groupKey = 'thisMonth';
    } else {
      groupKey = 'older';
    }

    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(activity);
  });

  const order = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'older'];
  order.forEach((key) => {
    if (groupMap.has(key)) {
      groups.push({
        label: t(key),
        activities: groupMap.get(key)!,
      });
    }
  });

  return groups;
}

export default function ActivityTimeline({
  entityType,
  entityId,
  showHeader = true,
  showAddButton = true,
  limit = 20,
  onActivityAdded,
}: ActivityTimelineProps) {
  const t = useTranslations('activities');
  const tCommon = useTranslations('common');

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [showAddForm, setShowAddForm] = useState(false);

  // تحميل الأنشطة
  const fetchActivities = useCallback(async (pageNum: number = 1, append: boolean = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (entityType) params.append('entityType', entityType);
      if (entityId) params.append('entityId', entityId);
      params.append('page', String(pageNum));
      params.append('limit', String(limit));

      const response = await api.getActivities({ 
        entityType, 
        entityId, 
        page: pageNum, 
        limit 
      });

      if (append) {
        setActivities((prev) => [...prev, ...response.data.data]);
      } else {
        setActivities(response.data.data);
      }
      setHasMore(response.data.meta.hasMore);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId, limit]);

  useEffect(() => {
    fetchActivities(1);
  }, [fetchActivities]);

  // تحميل المزيد
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchActivities(nextPage, true);
  };

  // عند إضافة نشاط جديد
  const handleActivityAdded = () => {
    setShowAddForm(false);
    fetchActivities(1);
    onActivityAdded?.();
  };

  // تنسيق الوقت
  const formatTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'HH:mm', { locale: ar });
  };

  // تنسيق التاريخ الكامل
  const formatFullDate = (dateStr: string) => {
    const date = parseISO(dateStr);
    return format(date, 'EEEE, d MMMM yyyy', { locale: ar });
  };

  // اسم المستخدم
  const getUserName = (user?: Activity['user']) => {
    if (!user) return t('fields.user');
    return user.firstNameAr
      ? `${user.firstNameAr} ${user.lastNameAr || ''}`
      : `${user.firstName} ${user.lastName}`;
  };

  if (loading && activities.length === 0) {
    return (
      <div className="space-y-4">
        {showHeader && (
          <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        )}
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities, t);

  return (
    <div className="space-y-4">
      {/* العنوان وزر الإضافة */}
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('timeline')}
          </h3>
          {showAddButton && (
            <PermissionGate permissions={[PERMISSIONS.LEADS_WRITE]}>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>+</span>
                <span>{t('addActivity')}</span>
              </button>
            </PermissionGate>
          )}
        </div>
      )}

      {/* نموذج إضافة نشاط */}
      {showAddForm && entityType && entityId && (
        <AddActivityForm
          entityType={entityType}
          entityId={entityId}
          onSuccess={handleActivityAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* قائمة الأنشطة */}
      {groupedActivities.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-500 dark:text-gray-400">{t('noActivities')}</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            {t('noActivitiesDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedActivities.map((group) => (
            <div key={group.label}>
              {/* عنوان المجموعة */}
              <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
                {group.label}
              </h4>

              {/* أنشطة المجموعة */}
              <div className="space-y-3">
                {group.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
                  >
                    {/* أيقونة النشاط */}
                    <div
                      className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                        activityColors[activity.activityType]
                      }`}
                    >
                      {activityIcons[activity.activityType]}
                    </div>

                    {/* محتوى النشاط */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {activity.title}
                          </p>
                          {activity.body && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                              {activity.body}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {formatTime(activity.occurredAt)}
                        </span>
                      </div>

                      {/* معلومات إضافية */}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                        {/* نوع النشاط */}
                        <span className={`px-2 py-0.5 rounded-full ${activityColors[activity.activityType]}`}>
                          {t(`types.${activity.activityType}`)}
                        </span>

                        {/* المستخدم */}
                        {activity.user && (
                          <span>• {getUserName(activity.user)}</span>
                        )}

                        {/* علامة AI */}
                        {activity.aiGenerated && (
                          <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
                            AI
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* زر تحميل المزيد */}
      {hasMore && (
        <div className="text-center pt-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
          >
            {loading ? tCommon('loading') : t('loadMore')}
          </button>
        </div>
      )}
    </div>
  );
}
