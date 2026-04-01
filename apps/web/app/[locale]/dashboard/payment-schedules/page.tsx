'use client';

// ═══════════════════════════════════════════════════════════════
// Payment Schedules Page - صفحة جداول الأقساط
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidAt?: string;
  status: string;
}

interface PaymentSchedule {
  dealId: string;
  deal?: {
    id: string;
    title?: string;
    dealValue: number;
    client?: {
      firstName: string;
      lastName: string;
      firstNameAr?: string;
      lastNameAr?: string;
    };
    property?: {
      title: string;
      titleAr?: string;
      city: string;
    };
  };
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  installmentsCount: number;
  paidInstallments: number;
  progress: number;
  installments?: Installment[];
  overdueInstallments: number;
  upcomingInstallments: number;
}

interface ScheduleStats {
  totalDeals: number;
  totalInstallments: number;
  paid: number;
  pending: number;
  overdue: number;
  totalValue: number;
  paidValue: number;
  remainingValue: number;
}

interface SchedulesResponse {
  data: PaymentSchedule[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function PaymentSchedulesPage() {
  const t = useTranslations('paymentSchedules');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [stats, setStats] = useState<ScheduleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);

  // جلب جداول الأقساط
  const fetchSchedules = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number | boolean> = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (search) params.search = search;
      if (filter === 'overdue') params.overdue = true;
      if (filter === 'dueThisWeek') params.dueWithin = 7;
      if (filter === 'dueThisMonth') params.dueWithin = 30;

      const response = await api.get<SchedulesResponse>('/payment-schedules', { params });

      if (reset) {
        setSchedules(response.data.data);
      } else {
        setSchedules((prev) => [...prev, ...response.data.data]);
      }
      setHasMore(response.data.meta.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [search, filter, page, tCommon]);

  // جلب الإحصائيات
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<{ data: ScheduleStats }>('/payment-schedules/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch schedule stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchSchedules(true);
    fetchStats();
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchSchedules(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (page > 1) {
      fetchSchedules(false);
    }
  }, [page]);

  // معالجة البحث
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // تحميل المزيد
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // عرض اسم العميل
  const getClientName = (schedule: PaymentSchedule) => {
    if (schedule.deal?.client) {
      const { firstName, lastName, firstNameAr, lastNameAr } = schedule.deal.client;
      if (firstNameAr && lastNameAr) {
        return `${firstNameAr} ${lastNameAr}`;
      }
      return `${firstName} ${lastName}`;
    }
    return '-';
  };

  // عرض حالة القسط
  const getInstallmentStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PAID: 'bg-green-100 text-green-800',
      OVERDUE: 'bg-red-100 text-red-800',
      PARTIAL: 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // عرض نص حالة القسط
  const getInstallmentStatusLabel = (status: string) => {
    return t(`installment.statuses.${status}` as any) || status;
  };

  // التبديل بين توسيع وطي جدول
  const toggleExpand = (dealId: string) => {
    setExpandedSchedule(expandedSchedule === dealId ? null : dealId);
  };

  // التنقل لتسجيل دفعة
  const recordPayment = (dealId: string, installmentId?: string) => {
    const url = `/payments/new?dealId=${dealId}`;
    if (installmentId) {
      router.push(`${url}&installmentId=${installmentId}`);
    } else {
      router.push(url);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* العنوان */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* بطاقات الإحصائيات */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.totalInstallments')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.totalInstallments}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.paid')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.pending')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.overdue')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* شريط التقدم الإجمالي */}
      {stats && stats.totalValue > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">{t('progress')}</h3>
            <span className="text-2xl font-bold text-blue-600">
              {Math.round((stats.paidValue / stats.totalValue) * 100)}%
            </span>
          </div>

          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-l from-green-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${(stats.paidValue / stats.totalValue) * 100}%` }}
            />
          </div>

          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-500">
              {t('stats.paidValue')}: {formatAmount(stats.paidValue)}
            </span>
            <span className="text-gray-500">
              {t('stats.remainingValue')}: {formatAmount(stats.remainingValue)}
            </span>
          </div>
        </div>
      )}

      {/* البحث والفلترة */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        {/* البحث */}
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={t('searchPlaceholder') || 'ابحث بالاسم...'}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            dir="rtl"
          />
        </div>

        {/* الفلاتر */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="overdue">{t('filters.overdue')}</option>
            <option value="dueThisWeek">{t('filters.dueThisWeek')}</option>
            <option value="dueThisMonth">{t('filters.dueThisMonth')}</option>
          </select>
        </div>
      </div>

      {/* تنبيهات الأقساط */}
      {stats && stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            <div>
              <p className="font-semibold text-red-800">{t('alerts.overdueInstallments')}</p>
              <p className="text-sm text-red-600">
                {stats.overdue} قسط متأخر يحتاج متابعة
              </p>
            </div>
          </div>
        </div>
      )}

      {/* قائمة جداول الأقساط */}
      {loading && schedules.length === 0 ? (
        <SkeletonLoader type="list" count={5} />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchSchedules(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            {tCommon('retry') || 'إعادة المحاولة'}
          </button>
        </div>
      ) : schedules.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          icon={<CalendarIcon className="w-12 h-12 text-gray-300" />}
        />
      ) : (
        <div className="space-y-4">
          {/* قائمة البطاقات */}
          {schedules.map((schedule) => (
            <div
              key={schedule.dealId}
              className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm"
            >
              {/* رأس البطاقة */}
              <div
                onClick={() => toggleExpand(schedule.dealId)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        {schedule.paidInstallments}/{schedule.installmentsCount}
                      </div>

                      <div>
                        <h3 className="font-bold text-gray-900">{getClientName(schedule)}</h3>
                        <p className="text-sm text-gray-500">
                          {schedule.deal?.property?.titleAr || schedule.deal?.property?.title || '-'}
                        </p>
                      </div>
                    </div>

                    {/* شريط التقدم */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-gray-500">{t('progress')}</span>
                        <span className="font-medium text-gray-900">{Math.round(schedule.progress)}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-l from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${schedule.progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-sm text-gray-500">
                      <span>
                        {formatAmount(schedule.paidAmount)} / {formatAmount(schedule.totalAmount)}
                      </span>
                      <span>•</span>
                      <span className="text-green-600">
                        {t('fields.paidInstallments')}: {schedule.paidInstallments}
                      </span>
                      <span>•</span>
                      <span className="text-gray-600">
                        {t('fields.installmentsCount')}: {schedule.installmentsCount}
                      </span>
                    </div>
                  </div>

                  {/* مؤشرات التنبيه */}
                  <div className="flex flex-col items-end gap-2">
                    {schedule.overdueInstallments > 0 && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        {schedule.overdueInstallments} متأخر
                      </span>
                    )}
                    {schedule.upcomingInstallments > 0 && (
                      <span className="flex items-center gap-1 text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        <ClockIcon className="w-3 h-3" />
                        {schedule.upcomingInstallments} قادم
                      </span>
                    )}
                    {expandedSchedule === schedule.dealId ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* تفاصيل الأقساط */}
              {expandedSchedule === schedule.dealId && schedule.installments && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900 mb-3">{t('timeline.title')}</h4>

                  <div className="relative">
                    {/* Timeline */}
                    <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />

                    <div className="space-y-4">
                      {schedule.installments.map((inst) => (
                        <div
                          key={inst.id}
                          className="relative pr-10"
                        >
                          {/* النقطة */}
                          <div
                            className={`absolute right-2.5 top-1 w-3 h-3 rounded-full border-2 ${
                              inst.status === 'PAID'
                                ? 'bg-green-500 border-green-500'
                                : inst.status === 'OVERDUE'
                                ? 'bg-red-500 border-red-500'
                                : 'bg-white border-yellow-400'
                            }`}
                          />

                          {/* المحتوى */}
                          <div className="bg-white rounded-lg p-3 border border-gray-100">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-gray-900">
                                {t('installment.number')} {inst.installmentNumber}
                              </span>
                              <span
                                className={`text-xs px-2 py-1 rounded-full ${getInstallmentStatusColor(inst.status)}`}
                              >
                                {getInstallmentStatusLabel(inst.status)}
                              </span>
                            </div>

                            <div className="flex items-center justify-between text-sm">
                              <div>
                                <span className="text-gray-500">{t('installment.amount')}: </span>
                                <span className="font-medium text-gray-900">
                                  {formatAmount(inst.amount)}
                                </span>
                              </div>
                              <div className="text-gray-500">
                                <span>{t('installment.dueDate')}: </span>
                                {new Date(inst.dueDate).toLocaleDateString('ar-EG')}
                              </div>
                            </div>

                            {inst.paidAmount > 0 && inst.paidAmount < inst.amount && (
                              <div className="mt-2 text-xs text-orange-600">
                                مدفوع: {formatAmount(inst.paidAmount)} • متبقي:{' '}
                                {formatAmount(inst.amount - inst.paidAmount)}
                              </div>
                            )}

                            {inst.status !== 'PAID' && (
                              <PermissionGate permissions={[PERMISSIONS.PAYMENTS_WRITE]}>
                                <button
                                  onClick={() => recordPayment(schedule.dealId, inst.id)}
                                  className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                                >
                                  {t('recordPayment')}
                                </button>
                              </PermissionGate>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* زر عرض الصفقة */}
                  <button
                    onClick={() => router.push(`/dashboard/deals/${schedule.dealId}`)}
                    className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    {t('viewDeal')}
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* زر تحميل المزيد */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={loadMore}
                disabled={loading}
                className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
              >
                {loading ? tCommon('loading') : tCommon('next')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
