'use client';

// ═══════════════════════════════════════════════════════════════
// Audit Logs Page - سجل التدقيق
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ClockIcon,
  UserIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

// Types
interface AuditLog {
  id: string;
  userId?: string;
  userName?: string;
  action: string;
  actionAr: string;
  entityType: string;
  entityTypeAr: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  occurredAt: string;
}

interface AuditLogResponse {
  data: AuditLog[];
  total: number;
}

// Entity type translations
const ENTITY_TYPE_AR: Record<string, string> = {
  client: 'عميل',
  lead: 'عميل محتمل',
  property: 'عقار',
  deal: 'صفقة',
  user: 'مستخدم',
  document: 'مستند',
  contract: 'عقد',
  payment: 'دفعة',
  commission: 'عمولة',
  compliance_record: 'سجل امتثال',
  organization: 'منظمة',
};

// Action translations
const ACTION_AR: Record<string, string> = {
  // Client
  'client.created': 'إنشاء عميل',
  'client.updated': 'تحديث عميل',
  'client.deleted': 'حذف عميل',
  'client.merged': 'دمج عميل',
  // Lead
  'lead.created': 'إنشاء عميل محتمل',
  'lead.updated': 'تحديث عميل محتمل',
  'lead.stage_changed': 'تغيير مرحلة',
  'lead.assigned': 'تعيين مسؤول',
  'lead.deleted': 'حذف عميل محتمل',
  // Property
  'property.created': 'إنشاء عقار',
  'property.updated': 'تحديث عقار',
  'property.deleted': 'حذف عقار',
  'property.locked': 'حجز عقار',
  'property.unlocked': 'إلغاء حجز عقار',
  // Deal
  'deal.created': 'إنشاء صفقة',
  'deal.updated': 'تحديث صفقة',
  'deal.closed': 'إغلاق صفقة',
  'deal.cancelled': 'إلغاء صفقة',
  // Document
  'document.uploaded': 'رفع مستند',
  'document.verified': 'اعتماد مستند',
  'document.rejected': 'رفض مستند',
  'document.deleted': 'حذف مستند',
  'document.ocr_completed': 'اكتمال OCR',
  'document.classified': 'تصنيف مستند',
  // User
  'user.login': 'تسجيل دخول',
  'user.logout': 'تسجيل خروج',
  'user.created': 'إنشاء مستخدم',
  'user.updated': 'تحديث مستخدم',
  'user.deleted': 'حذف مستخدم',
  // Compliance
  'compliance.record_created': 'إنشاء سجل امتثال',
  'compliance.record_updated': 'تحديث سجل امتثال',
  'compliance.alert': 'تنبيه امتثال',
  // Payment
  'payment.received': 'استلام دفعة',
  'payment.refunded': 'استرداد دفعة',
  // Auth
  'auth.login': 'تسجيل دخول',
  'auth.logout': 'تسجيل خروج',
  'auth.mfa_enabled': 'تفعيل MFA',
  'auth.password_changed': 'تغيير كلمة المرور',
};

// Entity type icons
const ENTITY_ICONS: Record<string, string> = {
  client: '👤',
  lead: '📋',
  property: '🏠',
  deal: '🤝',
  user: '👥',
  document: '📄',
  contract: '📝',
  payment: '💰',
  commission: '💸',
  compliance_record: '✅',
  organization: '🏢',
};

// Format date
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'الآن';
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 7) return `منذ ${days} يوم`;
  return formatDateTime(dateStr);
}

// Get action color
function getActionColor(action: string): string {
  if (action.includes('created') || action.includes('.created')) {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (action.includes('deleted') || action.includes('.deleted')) {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  if (action.includes('updated') || action.includes('.updated')) {
    return 'bg-blue-100 text-blue-800 border-blue-200';
  }
  if (action.includes('login') || action.includes('.login')) {
    return 'bg-purple-100 text-purple-800 border-purple-200';
  }
  if (action.includes('logout') || action.includes('.logout')) {
    return 'bg-gray-100 text-gray-800 border-gray-200';
  }
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

// Timeline Item Component
function TimelineItem({
  log,
  onClick,
}: {
  log: AuditLog;
  onClick: () => void;
}) {
  const icon = ENTITY_ICONS[log.entityType] || '📌';
  const actionColor = getActionColor(log.action);

  return (
    <div
      className="flex gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors rounded-lg"
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-lg">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium text-gray-900">
              {log.actionAr || ACTION_AR[log.action] || log.action}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 mr-2">
                {log.entityTypeAr || ENTITY_TYPE_AR[log.entityType] || log.entityType}
              </span>
              {log.userName && (
                <span className="flex items-center gap-1">
                  <UserIcon className="w-3 h-3" />
                  {log.userName}
                </span>
              )}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${actionColor}`}
          >
            {formatRelativeTime(log.occurredAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

// Detail Drawer Component
function DetailDrawer({
  log,
  onClose,
}: {
  log: AuditLog | null;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-end z-50">
      <div className="bg-white h-full w-full max-w-lg shadow-xl animate-slide-in-right overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">تفاصيل السجل</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Basic Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-500 text-sm">معلومات أساسية</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-400">الإجراء</p>
                <p className="font-medium">
                  {log.actionAr || ACTION_AR[log.action] || log.action}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">نوع الكيان</p>
                <p className="font-medium">
                  {log.entityTypeAr || ENTITY_TYPE_AR[log.entityType] || log.entityType}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400">المستخدم</p>
                <p className="font-medium">{log.userName || 'النظام'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">التاريخ والوقت</p>
                <p className="font-medium">{formatDateTime(log.occurredAt)}</p>
              </div>
            </div>
          </div>

          {/* Technical Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-500 text-sm">معلومات تقنية</h3>
            <div className="space-y-2">
              {log.entityId && (
                <div>
                  <p className="text-xs text-gray-400">معرف الكيان</p>
                  <p className="font-mono text-sm">{log.entityId}</p>
                </div>
              )}
              {log.ipAddress && (
                <div>
                  <p className="text-xs text-gray-400">عنوان IP</p>
                  <p className="font-mono text-sm">{log.ipAddress}</p>
                </div>
              )}
              {log.userAgent && (
                <div>
                  <p className="text-xs text-gray-400">User Agent</p>
                  <p className="text-sm text-gray-600 truncate">{log.userAgent}</p>
                </div>
              )}
            </div>
          </div>

          {/* Old Value */}
          {log.oldValue && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-500 text-sm">القيمة القديمة</h3>
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <pre className="text-xs overflow-x-auto ltr text-left">
                  {JSON.stringify(log.oldValue, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* New Value */}
          {log.newValue && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-500 text-sm">القيمة الجديدة</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <pre className="text-xs overflow-x-auto ltr text-left">
                  {JSON.stringify(log.newValue, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-3 rounded-full bg-gray-100">{icon}</div>
      </div>
    </div>
  );
}

// Main Page Component
export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    action: '',
    entityType: '',
    userId: '',
    startDate: '',
    endDate: '',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Fetch audit logs
  const {
    data: logsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: async () => {
      const response = await apiClient.getAuditLogs({
        page: filters.page,
        limit: 50,
        action: filters.action || undefined,
        entityType: filters.entityType || undefined,
        userId: filters.userId || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      return response.data as AuditLogResponse;
    },
  });

  const logs = logsData?.data || [];
  const total = logsData?.total || 0;

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: Record<string, AuditLog[]> = {};

    logs.forEach((log) => {
      const date = new Date(log.occurredAt).toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
    });

    return groups;
  }, [logs]);

  // Calculate stats
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayLogs = logs.filter(
      (log) => new Date(log.occurredAt) >= today
    ).length;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekLogs = logs.filter(
      (log) => new Date(log.occurredAt) >= weekAgo
    ).length;

    return { total, today: todayLogs, week: weekLogs };
  }, [logs, total]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">سجل التدقيق</h1>
          <p className="text-gray-500 mt-1">تتبع جميع الأنشطة والتغييرات في النظام</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-outline flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            تحديث
          </button>
          <button
            onClick={async () => {
              const response = await apiClient.exportAuditLogs({
                startDate: filters.startDate,
                endDate: filters.endDate,
              });
              const url = window.URL.createObjectURL(new Blob([response.data]));
              const link = document.createElement('a');
              link.href = url;
              link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              link.remove();
            }}
            className="btn btn-primary flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي السجلات"
          value={stats.total}
          icon={<DocumentTextIcon className="w-5 h-5 text-blue-600" />}
        />
        <StatsCard
          title="سجلات اليوم"
          value={stats.today}
          icon={<ClockIcon className="w-5 h-5 text-green-600" />}
        />
        <StatsCard
          title="سجلات الأسبوع"
          value={stats.week}
          icon={<ClockIcon className="w-5 h-5 text-purple-600" />}
        />
        <StatsCard
          title="المستخدمين النشطين"
          value={new Set(logs.map((l) => l.userId).filter(Boolean)).size}
          icon={<UserIcon className="w-5 h-5 text-orange-600" />}
        />
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث..."
              className="input pr-10"
              disabled
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn ${showFilters ? 'btn-primary' : 'btn-outline'} flex items-center gap-2`}
          >
            <FunnelIcon className="w-4 h-4" />
            فلترة
          </button>
        </div>

        {/* Extended Filters */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                نوع الكيان
              </label>
              <select
                className="input"
                value={filters.entityType}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, entityType: e.target.value, page: 1 }))
                }
              >
                <option value="">الكل</option>
                {Object.entries(ENTITY_TYPE_AR).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الإجراء
              </label>
              <select
                className="input"
                value={filters.action}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, action: e.target.value, page: 1 }))
                }
              >
                <option value="">الكل</option>
                {Object.entries(ACTION_AR).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                من تاريخ
              </label>
              <input
                type="date"
                className="input"
                value={filters.startDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, startDate: e.target.value, page: 1 }))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                إلى تاريخ
              </label>
              <input
                type="date"
                className="input"
                value={filters.endDate}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, endDate: e.target.value, page: 1 }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <DocumentTextIcon className="w-12 h-12 mx-auto text-gray-300" />
            <p className="mt-2">لا توجد سجلات</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedLogs).map(([date, dateLogs]) => (
              <div key={date}>
                {/* Date Header */}
                <div className="bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
                  {date}
                </div>
                {/* Logs for this date */}
                <div className="divide-y divide-gray-50">
                  {dateLogs.map((log) => (
                    <TimelineItem
                      key={log.id}
                      log={log}
                      onClick={() => setSelectedLog(log)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > 50 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              عرض {(filters.page - 1) * 50 + 1} -{' '}
              {Math.min(filters.page * 50, total)} من {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={filters.page === 1}
                className="btn btn-outline text-sm disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={filters.page * 50 >= total}
                className="btn btn-outline text-sm disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedLog && (
        <DetailDrawer log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}
