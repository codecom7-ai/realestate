// ═══════════════════════════════════════════════════════════════
// Viewings Page - صفحة المعاينات
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import PermissionGate from '@/components/shared/PermissionGate';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PERMISSIONS } from '@realestate/shared-types';

// Types
interface Viewing {
  id: string;
  leadId: string;
  propertyId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  feedback?: string;
  rating?: number;
  createdAt: string;
  lead?: {
    id: string;
    stage: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  property?: {
    id: string;
    title: string;
    city: string;
    district?: string;
  };
}

interface ViewingStats {
  scheduled: number;
  completed: number;
  cancelled: number;
  noShow: number;
  today: number;
  thisWeek: number;
}

// Status badge component
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[status] || statusColors.scheduled}`}>
      {t(`statuses.${status}`)}
    </span>
  );
}

// Stats card component
function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
        <span className={`text-2xl ${color}`}>{icon}</span>
      </div>
    </div>
  );
}

export default function ViewingsPage() {
  const t = useTranslations('viewings');
  const tCommon = useTranslations('common');
  const params = useParams();
  const locale = params.locale as string;
  const { user } = useAuth();

  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [stats, setStats] = useState<ViewingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch viewings
  const fetchViewings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, any> = {
        page,
        limit: 20,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (dateFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.from = today.toISOString();
        today.setHours(23, 59, 59, 999);
        params.to = today.toISOString();
      } else if (dateFilter === 'thisWeek') {
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        params.from = weekStart.toISOString();
      } else if (dateFilter === 'upcoming') {
        params.from = new Date().toISOString();
      }

      const viewingsRes = await apiClient.getViewings(params);
      const statsRes = null; // stats fetched separately below

      if (viewingsRes.data.success) {
        setViewings(viewingsRes.data.data || []);
        setHasMore(viewingsRes.data.meta?.hasMore || false);
      }

      // Fetch stats using apiClient (secure - uses HttpOnly cookies)
      try {
        const statsRes = await apiClient.getViewingsStats();
        if (statsRes.data.success) {
          setStats(statsRes.data.data);
        }
      } catch {
        // Ignore stats errors - non-critical
      }

    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || err.message || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, page, tCommon]);

  useEffect(() => {
    fetchViewings();
  }, [fetchViewings]);

  // Format date
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Get status color classes
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      scheduled: 'border-r-blue-500',
      confirmed: 'border-r-green-500',
      completed: 'border-r-purple-500',
      cancelled: 'border-r-red-500',
      no_show: 'border-r-gray-500',
    };
    return colors[status] || colors.scheduled;
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_READ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
            <p className="text-gray-500 mt-1">{t('subtitle')}</p>
          </div>
          <Link
            href={`/${locale}/viewings/new`}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('newViewing')}
          </Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard title={t('stats.today')} value={stats.today} icon="📅" color="text-blue-500" />
            <StatCard title={t('stats.thisWeek')} value={stats.thisWeek} icon="📆" color="text-indigo-500" />
            <StatCard title={t('stats.scheduled')} value={stats.scheduled} icon="📋" color="text-blue-500" />
            <StatCard title={t('stats.completed')} value={stats.completed} icon="✅" color="text-green-500" />
            <StatCard title={t('stats.cancelled')} value={stats.cancelled} icon="❌" color="text-red-500" />
            <StatCard title={t('stats.noShow')} value={stats.noShow} icon="👤" color="text-gray-500" />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Status Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tCommon('status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="scheduled">{t('filters.scheduled')}</option>
                <option value="confirmed">{t('filters.confirmed')}</option>
                <option value="completed">{t('filters.completed')}</option>
                <option value="cancelled">{t('filters.cancelled')}</option>
              </select>
            </div>

            {/* Date Filter */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tCommon('date')}
              </label>
              <select
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="today">{t('filters.today')}</option>
                <option value="thisWeek">{t('filters.thisWeek')}</option>
                <option value="upcoming">{t('filters.upcoming')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Viewings List */}
        {loading ? (
          <SkeletonLoader type="list" count={5} />
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : viewings.length === 0 ? (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            icon="📅"
            actionLabel={t('emptyAddButton')}
            actionHref={`/${locale}/viewings/new`}
          />
        ) : (
          <div className="space-y-4">
            {viewings.map((viewing) => (
              <Link
                key={viewing.id}
                href={`/${locale}/viewings/${viewing.id}`}
                className={`block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow border-r-4 ${getStatusColor(viewing.status)}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  {/* Client & Property Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <StatusBadge status={viewing.status} t={t} />
                      <span className="text-sm text-gray-500">
                        {formatDate(viewing.scheduledAt)}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                      {/* Client */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">👤</span>
                        <span className="font-medium text-gray-900 truncate">
                          {viewing.lead?.client
                            ? `${viewing.lead.client.firstName} ${viewing.lead.client.lastName}`
                            : t('placeholders.selectLead')}
                        </span>
                      </div>

                      {/* Property */}
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">🏠</span>
                        <span className="text-gray-700 truncate">
                          {viewing.property?.title || t('placeholders.selectProperty')}
                        </span>
                        {viewing.property?.city && (
                          <span className="text-gray-400 text-sm">
                            ({viewing.property.city})
                          </span>
                        )}
                      </div>
                    </div>

                    {viewing.notes && (
                      <p className="mt-2 text-sm text-gray-500 truncate">{viewing.notes}</p>
                    )}
                  </div>

                  {/* Time & Actions */}
                  <div className="flex items-center gap-4">
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-bold text-gray-900">
                        {formatTime(viewing.scheduledAt)}
                      </p>
                      {viewing.lead?.client?.phone && (
                        <p className="text-sm text-gray-500" dir="ltr">
                          {viewing.lead.client.phone}
                        </p>
                      )}
                    </div>

                    <svg className="w-5 h-5 text-gray-400 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            ))}

            {/* Load More */}
            {hasMore && (
              <div className="text-center">
                <button
                  onClick={() => setPage(p => p + 1)}
                  className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {tCommon('next')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
