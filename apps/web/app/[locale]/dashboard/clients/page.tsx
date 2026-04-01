'use client';

// ═══════════════════════════════════════════════════════════════
// Clients Page - صفحة قائمة العملاء
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { MagnifyingGlassIcon, PlusIcon, FunnelIcon, UserIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  nationality: string;
  clientType: string;
  companyName?: string;
  source?: string;
  tags: string[];
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientsResponse {
  data: Client[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export default function ClientsPage() {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'vip' | 'individual' | 'company'>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  // جلب العملاء
  const fetchClients = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filter === 'vip') params.append('isVip', 'true');
      if (filter === 'individual' || filter === 'company') {
        params.append('clientType', filter);
      }
      params.append('page', reset ? '1' : String(page));
      params.append('limit', '20');

      const response = await api.get<ClientsResponse>(`/clients?${params.toString()}`);

      if (reset) {
        setClients(response.data.data);
      } else {
        setClients((prev) => [...prev, ...response.data.data]);
      }
      setTotal(response.data.meta.total);
      setHasMore(response.data.meta.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [search, filter, page, tCommon]);

  useEffect(() => {
    fetchClients(true);
  }, [filter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchClients(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (page > 1) {
      fetchClients(false);
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

  // التنقل لصفحة العميل
  const viewClient = (id: string) => {
    router.push(`/dashboard/clients/${id}`);
  };

  // التنقل لصفحة إضافة عميل
  const addClient = () => {
    router.push('/dashboard/clients/new');
  };

  // عرض اسم العميل
  const getClientName = (client: Client) => {
    if (client.firstNameAr && client.lastNameAr) {
      return `${client.firstNameAr} ${client.lastNameAr}`;
    }
    return `${client.firstName} ${client.lastName}`;
  };

  // عرض نوع العميل
  const getClientType = (type: string) => {
    return type === 'company' ? t('types.company') : t('types.individual');
  };

  // عرض مصدر العميل
  const getSource = (source?: string) => {
    if (!source) return '-';
    return t(`sources.${source}` as any);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* العنوان والإجراءات */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {total} {t('stats.total')}
          </p>
        </div>

        <PermissionGate permissions={[PERMISSIONS.CLIENTS_WRITE]}>
          <button
            onClick={addClient}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <PlusIcon className="w-5 h-5" />
            <span>{t('newClient')}</span>
          </button>
        </PermissionGate>
      </div>

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
            className="w-full pr-10 pl-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 dark:text-gray-100"
            dir="rtl"
          />
        </div>

        {/* الفلترة */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select style={{color:"#111827",backgroundColor:"#ffffff"}}             value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('filters.all')}</option>
            <option value="vip">{t('filters.vip')}</option>
            <option value="individual">{t('filters.individuals')}</option>
            <option value="company">{t('filters.companies')}</option>
          </select>
        </div>
      </div>

      {/* قائمة العملاء */}
      {loading && clients.length === 0 ? (
        <SkeletonLoader type="list" count={5} />
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => fetchClients(true)}
            className="mt-4 text-blue-600 hover:underline"
          >
            {tCommon('retry') || 'إعادة المحاولة'}
          </button>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          title={t('emptyState.title')}
          description={t('emptyState.description')}
          actionLabel={t('emptyState.addButton')}
          onAction={addClient}
          icon={<UserIcon className="w-12 h-12 text-gray-300" />}
        />
      ) : (
        <div className="space-y-3">
          {/* قائمة البطاقات */}
          {clients.map((client) => (
            <div
              key={client.id}
              onClick={() => viewClient(client.id)}
              className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {/* صورة العميل */}
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                    {client.firstName.charAt(0)}
                    {client.lastName.charAt(0)}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">
                        {getClientName(client)}
                      </h3>
                      {client.isVip && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                          VIP
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <span dir="ltr">{client.phone}</span>
                      </span>
                      {client.email && (
                        <span className="hidden sm:inline">{client.email}</span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-gray-400">
                      <span>{getClientType(client.clientType)}</span>
                      {client.source && (
                        <>
                          <span>•</span>
                          <span>{getSource(client.source)}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>
                        {new Date(client.createdAt).toLocaleDateString('ar-EG')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* الوسوم */}
                {client.tags.length > 0 && (
                  <div className="hidden md:flex flex-wrap gap-1">
                    {client.tags.slice(0, 2).map((tag, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                    {client.tags.length > 2 && (
                      <span className="text-gray-400 text-xs">
                        +{client.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
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
