'use client';

// ═══════════════════════════════════════════════════════════════
// Commissions Page - صفحة قائمة العمولات
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  BanknotesIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Commission {
  id: string;
  dealId: string;
  brokerId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  calculatedAt: string;
  approvedAt?: string;
  settledAt?: string;
  paidAt?: string;
  notes?: string;
  deal?: {
    id: string;
    title?: string;
    client?: {
      firstName: string;
      lastName: string;
      firstNameAr?: string;
      lastNameAr?: string;
    };
    property?: {
      title: string;
      titleAr?: string;
    };
  };
  broker?: {
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
  };
}

interface CommissionStats {
  total: number;
  calculated: number;
  approved: number;
  settled: number;
  paid: number;
  disputed: number;
  totalAmount: number;
  totalVat: number;
}

interface CommissionsResponse {
  data: Commission[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function CommissionsPage() {
  const t = useTranslations('commissions');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<CommissionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [brokerFilter, setBrokerFilter] = useState<string>('all');
  const [brokers, setBrokers] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // جلب العمولات
  const fetchCommissions = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (brokerFilter !== 'all') params.brokerId = brokerFilter;

      const response = await api.get<CommissionsResponse>('/commissions', { params });

      if (reset) {
        setCommissions(response.data.data);
      } else {
        setCommissions((prev) => [...prev, ...response.data.data]);
      }
      setTotal(response.data.meta.total);
      setHasMore(response.data.meta.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, brokerFilter, page, tCommon]);

  // جلب الإحصائيات
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<{ data: CommissionStats }>('/commissions/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch commission stats:', err);
    }
  }, []);

  // جلب قائمة الوسطاء
  const fetchBrokers = useCallback(async () => {
    try {
      const response = await api.get('/users', {
        params: { role: 'BROKER,FIELD_AGENT', limit: 100 },
      });
      const brokersList = (response.data.data || []).map((u: any) => ({
        id: u.id,
        name: u.firstNameAr
          ? `${u.firstNameAr} ${u.lastNameAr}`
          : `${u.firstName} ${u.lastName}`,
      }));
      setBrokers(brokersList);
    } catch (err) {
      console.error('Failed to fetch brokers:', err);
    }
  }, []);

  useEffect(() => {
    fetchCommissions(true);
    fetchStats();
    fetchBrokers();
  }, [statusFilter, brokerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchCommissions(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (page > 1) {
      fetchCommissions(false);
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

  // عرض تفاصيل العمولة
  const viewCommission = (id: string) => {
    router.push(`/dashboard/commissions/${id}`);
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // عرض حالة العمولة
  const getStatusLabel = (status: string) => {
    return t(`statuses.${status}` as any) || status;
  };

  // عرض لون الحالة
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CALCULATED: 'bg-blue-100 text-blue-800',
      APPROVED: 'bg-green-100 text-green-800',
      SETTLED: 'bg-purple-100 text-purple-800',
      PAID: 'bg-emerald-100 text-emerald-800',
      DISPUTED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // عرض اسم الوسيط
  const getBrokerName = (commission: Commission) => {
    if (commission.broker) {
      const { firstName, lastName, firstNameAr, lastNameAr } = commission.broker;
      if (firstNameAr && lastNameAr) {
        return `${firstNameAr} ${lastNameAr}`;
      }
      return `${firstName} ${lastName}`;
    }
    return '-';
  };

  // عرض اسم العميل
  const getClientName = (commission: Commission) => {
    if (commission.deal?.client) {
      const { firstName, lastName, firstNameAr, lastNameAr } = commission.deal.client;
      if (firstNameAr && lastNameAr) {
        return `${firstNameAr} ${lastNameAr}`;
      }
      return `${firstName} ${lastName}`;
    }
    return '-';
  };

  // الموافقة على العمولة
  const handleApprove = async (id: string) => {
    try {
      await api.post(`/commissions/${id}/approve`);
      fetchCommissions(true);
      fetchStats();
    } catch (err) {
      console.error('Failed to approve commission:', err);
    }
  };

  // تسوية العمولة
  const handleSettle = async (id: string) => {
    try {
      await api.post(`/commissions/${id}/settle`);
      fetchCommissions(true);
      fetchStats();
    } catch (err) {
      console.error('Failed to settle commission:', err);
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.calculated')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.calculated}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.approved')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.approved}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.settled')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.settled}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.paid')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.paid}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.disputed')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.disputed}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* إجمالي المبالغ */}
      {stats && (
        <div className="bg-gradient-to-l from-blue-50 to-green-50 rounded-xl p-4 border border-blue-100">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('stats.totalAmount')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.totalAmount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('stats.totalVat')}</p>
              <p className="text-lg font-semibold text-gray-700">{formatAmount(stats.totalVat)}</p>
              <p className="text-xs text-gray-500">{t('vatInfo')}</p>
            </div>
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
            placeholder={t('searchPlaceholder')}
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            dir="rtl"
          />
        </div>

        {/* الفلاتر */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="CALCULATED">{t('filters.calculated')}</option>
            <option value="APPROVED">{t('filters.approved')}</option>
            <option value="SETTLED">{t('filters.settled')}</option>
            <option value="PAID">{t('filters.paid')}</option>
            <option value="DISPUTED">{t('filters.disputed')}</option>
          </select>

          <select
            value={brokerFilter}
            onChange={(e) => {
              setBrokerFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{tCommon('all')}</option>
            {brokers.map((broker) => (
              <option key={broker.id} value={broker.id}>
                {broker.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* قائمة العمولات */}
      {loading && commissions.length === 0 ? (
        <SkeletonLoader type="list" count={5} />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchCommissions(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            {tCommon('retry') || 'إعادة المحاولة'}
          </button>
        </div>
      ) : commissions.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          icon={<BanknotesIcon className="w-12 h-12 text-gray-300" />}
        />
      ) : (
        <div className="space-y-3">
          {/* قائمة البطاقات */}
          {commissions.map((commission) => (
            <div
              key={commission.id}
              onClick={() => viewCommission(commission.id)}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold">
                      %
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {formatAmount(commission.totalAmount)}
                        </h3>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getStatusColor(commission.status)}`}
                        >
                          {getStatusLabel(commission.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                        <UserIcon className="w-4 h-4" />
                        <span>{getBrokerName(commission)}</span>
                        <span>•</span>
                        <span>{getClientName(commission)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mr-13">
                    <span>
                      <span className="text-gray-400">{t('fields.baseAmount')}: </span>
                      {formatAmount(commission.baseAmount)}
                    </span>
                    <span>
                      <span className="text-gray-400">{t('fields.vatAmount')}: </span>
                      {formatAmount(commission.vatAmount)}
                    </span>
                    <span>
                      <span className="text-gray-400">{t('table.date')}: </span>
                      {new Date(commission.calculatedAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                    </span>
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-2">
                  {commission.status === 'CALCULATED' && (
                    <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_APPROVE]}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleApprove(commission.id);
                        }}
                        className="text-green-600 hover:text-green-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-green-50"
                      >
                        {t('actions.approve')}
                      </button>
                    </PermissionGate>
                  )}
                  {commission.status === 'APPROVED' && (
                    <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_SETTLE]}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSettle(commission.id);
                        }}
                        className="text-purple-600 hover:text-purple-700 text-sm font-medium px-3 py-1 rounded-lg hover:bg-purple-50"
                      >
                        {t('actions.settle')}
                      </button>
                    </PermissionGate>
                  )}
                </div>
              </div>
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
