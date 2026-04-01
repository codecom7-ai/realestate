'use client';

// ═══════════════════════════════════════════════════════════════
// Payments Page - صفحة قائمة المدفوعات
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  FunnelIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Payment {
  id: string;
  dealId: string;
  installmentId?: string;
  amount: number;
  method: string;
  status: string;
  reference?: string;
  receiptNumber?: string;
  paidAt?: string;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  deal?: {
    id: string;
    title?: string;
    client?: {
      firstName: string;
      lastName: string;
      firstNameAr?: string;
      lastNameAr?: string;
    };
  };
}

interface PaymentStats {
  total: number;
  confirmed: number;
  pending: number;
  overdue: number;
  totalAmount: number;
  confirmedAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}

interface PaymentsResponse {
  data: Payment[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function PaymentsPage() {
  const t = useTranslations('payments');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // جلب المدفوعات
  const fetchPayments = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page: reset ? 1 : page,
        limit: 20,
      };

      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (methodFilter !== 'all') params.method = methodFilter;

      const response = await api.get<PaymentsResponse>('/payments', { params });

      if (reset) {
        setPayments(response.data.data);
      } else {
        setPayments((prev) => [...prev, ...response.data.data]);
      }
      setTotal(response.data.meta.total);
      setHasMore(response.data.meta.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, methodFilter, page, tCommon]);

  // جلب الإحصائيات
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get<{ data: PaymentStats }>('/payments/stats');
      setStats(response.data.data);
    } catch (err) {
      console.error('Failed to fetch payment stats:', err);
    }
  }, []);

  useEffect(() => {
    fetchPayments(true);
    fetchStats();
  }, [statusFilter, methodFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchPayments(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (page > 1) {
      fetchPayments(false);
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

  // التنقل لتسجيل دفعة جديدة
  const addPayment = () => {
    router.push('/dashboard/payments/new');
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // عرض طريقة الدفع
  const getMethodLabel = (method: string) => {
    return t(`methods.${method}` as any) || method;
  };

  // عرض حالة الدفع
  const getStatusLabel = (status: string) => {
    return t(`statuses.${status}` as any) || status;
  };

  // عرض لون الحالة
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CONFIRMED: 'bg-green-100 text-green-800',
      FAILED: 'bg-red-100 text-red-800',
      REFUNDED: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  // التحقق من تأخر الدفعة
  const isOverdue = (payment: Payment) => {
    if (payment.status !== 'PENDING' || !payment.dueDate) return false;
    return new Date(payment.dueDate) < new Date();
  };

  // عرض اسم العميل
  const getClientName = (payment: Payment) => {
    if (payment.deal?.client) {
      const { firstName, lastName, firstNameAr, lastNameAr } = payment.deal.client;
      if (firstNameAr && lastNameAr) {
        return `${firstNameAr} ${lastNameAr}`;
      }
      return `${firstName} ${lastName}`;
    }
    return '-';
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* العنوان والإجراءات */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        <PermissionGate permissions={[PERMISSIONS.PAYMENTS_WRITE]}>
          <button
            onClick={addPayment}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('recordPayment')}</span>
          </button>
        </PermissionGate>
      </div>

      {/* بطاقات الإحصائيات */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('stats.confirmed')}</p>
                <p className="text-lg font-bold text-gray-900">{stats.confirmed}</p>
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

          <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('totals.totalReceived')}</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatAmount(stats.confirmedAmount)}
                </p>
              </div>
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
            className="w-full pr-10 pl-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600"
            dir="rtl"
          />
        </div>

        {/* فلترة الحالة */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="PENDING">{t('filters.pending')}</option>
            <option value="CONFIRMED">{t('filters.confirmed')}</option>
            <option value="FAILED">{t('filters.failed')}</option>
            <option value="REFUNDED">{t('filters.refunded')}</option>
          </select>

          {/* فلترة طريقة الدفع */}
          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPage(1);
            }}
            className="border border-gray-300 rounded-lg px-3 py-2.5 bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="CASH">{t('methods.CASH')}</option>
            <option value="BANK_TRANSFER">{t('methods.BANK_TRANSFER')}</option>
            <option value="CHECK">{t('methods.CHECK')}</option>
            <option value="INSTAPAY">{t('methods.INSTAPAY')}</option>
            <option value="FAWRY">{t('methods.FAWRY')}</option>
          </select>
        </div>
      </div>

      {/* قائمة المدفوعات */}
      {loading && payments.length === 0 ? (
        <SkeletonLoader type="list" count={5} />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchPayments(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            {tCommon('retry') || 'إعادة المحاولة'}
          </button>
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          actionLabel={t('emptyAddButton')}
          onAction={addPayment}
          icon={<CurrencyDollarIcon className="w-12 h-12 text-gray-300" />}
        />
      ) : (
        <div className="space-y-3">
          {/* قائمة البطاقات */}
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {/* أيقونة طريقة الدفع */}
                    <div className="text-2xl">
                      {t(`methodIcons.${payment.method}` as any) || '💵'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {formatAmount(payment.amount)}
                        </h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(payment.status)}`}>
                          {getStatusLabel(payment.status)}
                        </span>
                        {isOverdue(payment) && (
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                            {t('alerts.overdue')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {getMethodLabel(payment.method)}
                        {payment.reference && ` • ${t('fields.reference')}: ${payment.reference}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                    <span>
                      <span className="text-gray-400">{t('table.client')}: </span>
                      {getClientName(payment)}
                    </span>
                    {payment.paidAt && (
                      <span>
                        <span className="text-gray-400">{t('table.date')}: </span>
                        {new Date(payment.paidAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                      </span>
                    )}
                    {payment.dueDate && payment.status === 'PENDING' && (
                      <span className={isOverdue(payment) ? 'text-red-600 font-medium' : ''}>
                        <span className="text-gray-400">{t('table.dueDate')}: </span>
                        {new Date(payment.dueDate).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                      </span>
                    )}
                  </div>
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center gap-2">
                  {payment.status === 'PENDING' && (
                    <PermissionGate permissions={[PERMISSIONS.PAYMENTS_WRITE]}>
                      <button
                        onClick={async () => {
                          try {
                            await api.post(`/payments/${payment.id}/confirm`);
                            fetchPayments(true);
                            fetchStats();
                          } catch (err) {
                            console.error('Failed to confirm payment:', err);
                          }
                        }}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        {t('actions.confirm')}
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
