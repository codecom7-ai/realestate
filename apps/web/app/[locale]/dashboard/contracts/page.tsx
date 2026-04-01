'use client';

// ═══════════════════════════════════════════════════════════════
// Contracts Page - قائمة العقود
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

// Mock data للعرض
const mockContracts = [
  {
    id: '1',
    contractNumber: 'CNT-2024-001',
    contractDate: '2024-03-15',
    status: 'signed',
    deal: {
      id: '1',
      dealType: 'sale',
      agreedPrice: 2500000,
      currency: 'EGP',
    },
    property: {
      id: '1',
      title: 'شقة فاخرة - التجمع الخامس',
      city: 'القاهرة',
    },
    client: {
      id: '1',
      firstName: 'أحمد',
      lastName: 'محمد',
    },
    signedByClient: true,
    signedByOffice: true,
    signedAt: '2024-03-16',
    fileUrl: '/contracts/cnt-001.pdf',
  },
  {
    id: '2',
    contractNumber: 'CNT-2024-002',
    contractDate: '2024-03-18',
    status: 'pending',
    deal: {
      id: '2',
      dealType: 'rent',
      agreedPrice: 15000,
      currency: 'EGP',
    },
    property: {
      id: '2',
      title: 'فيلا - الشيخ زايد',
      city: 'الجيزة',
    },
    client: {
      id: '2',
      firstName: 'سارة',
      lastName: 'علي',
    },
    signedByClient: false,
    signedByOffice: true,
    signedAt: null,
    fileUrl: null,
  },
  {
    id: '3',
    contractNumber: 'CNT-2024-003',
    contractDate: '2024-03-10',
    status: 'cancelled',
    deal: {
      id: '3',
      dealType: 'sale',
      agreedPrice: 1800000,
      currency: 'EGP',
    },
    property: {
      id: '3',
      title: 'مكتب إداري - المعادي',
      city: 'القاهرة',
    },
    client: {
      id: '3',
      firstName: 'محمد',
      lastName: 'خالد',
    },
    signedByClient: false,
    signedByOffice: false,
    signedAt: null,
    fileUrl: null,
  },
  {
    id: '4',
    contractNumber: 'CNT-2024-004',
    contractDate: '2024-03-20',
    status: 'signed',
    deal: {
      id: '4',
      dealType: 'sale',
      agreedPrice: 3200000,
      currency: 'EGP',
    },
    property: {
      id: '4',
      title: 'دوبلكس - مدينتي',
      city: 'القاهرة',
    },
    client: {
      id: '4',
      firstName: 'فاطمة',
      lastName: 'أحمد',
    },
    signedByClient: true,
    signedByOffice: true,
    signedAt: '2024-03-21',
    fileUrl: '/contracts/cnt-004.pdf',
  },
];

// Format currency
function formatCurrency(value: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function ContractsPage() {
  const t = useTranslations('contracts');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter contracts
  const filteredContracts = useMemo(() => {
    return mockContracts.filter((contract) => {
      // Search filter
      const matchesSearch =
        contract.contractNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${contract.client.firstName} ${contract.client.lastName}`.includes(searchQuery);

      // Status filter
      const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: {
        label: t('statuses.pending'),
        className: t('statusColors.pending'),
        icon: <ClockIcon className="w-4 h-4" />,
      },
      signed: {
        label: t('statuses.signed'),
        className: t('statusColors.signed'),
        icon: <CheckCircleIcon className="w-4 h-4" />,
      },
      cancelled: {
        label: t('statuses.cancelled'),
        className: t('statusColors.cancelled'),
        icon: <XCircleIcon className="w-4 h-4" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Get deal type label
  const getDealTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      sale: t('dealTypes.sale'),
      rent: t('dealTypes.rent'),
      management: t('dealTypes.management'),
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pr-10 w-full"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field min-w-[140px]"
            >
              <option value="all">{t('statuses.all')}</option>
              <option value="pending">{t('statuses.pending')}</option>
              <option value="signed">{t('statuses.signed')}</option>
              <option value="cancelled">{t('statuses.cancelled')}</option>
            </select>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary flex items-center gap-2"
            >
              <FunnelIcon className="w-5 h-5" />
              {t('statuses.all') === 'الكل' ? 'تصفية' : 'Filter'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-200 rounded-lg">
              <DocumentTextIcon className="w-6 h-6 text-blue-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-900">{mockContracts.length}</p>
              <p className="text-sm text-blue-700">{t('statuses.all')}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-200 rounded-lg">
              <ClockIcon className="w-6 h-6 text-yellow-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-yellow-900">
                {mockContracts.filter((c) => c.status === 'pending').length}
              </p>
              <p className="text-sm text-yellow-700">{t('statuses.pending')}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-200 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-900">
                {mockContracts.filter((c) => c.status === 'signed').length}
              </p>
              <p className="text-sm text-green-700">{t('statuses.signed')}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-200 rounded-lg">
              <XCircleIcon className="w-6 h-6 text-red-700" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-900">
                {mockContracts.filter((c) => c.status === 'cancelled').length}
              </p>
              <p className="text-sm text-red-700">{t('statuses.cancelled')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyTitle')}</h3>
          <p className="text-gray-500 mb-6">{t('emptyDescription')}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredContracts.map((contract) => (
            <div
              key={contract.id}
              className="card hover:shadow-md transition-all duration-200 border-r-4"
              style={{
                borderRightColor:
                  contract.status === 'signed'
                    ? '#22c55e'
                    : contract.status === 'pending'
                    ? '#eab308'
                    : '#ef4444',
              }}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Contract Info */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-xl">
                    <DocumentTextIcon className="w-8 h-8 text-primary" />
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {contract.contractNumber}
                      </h3>
                      {getStatusBadge(contract.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-500">{t('fields.property')}:</span>
                        <p className="font-medium text-gray-900">{contract.property.title}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('fields.client')}:</span>
                        <p className="font-medium text-gray-900">
                          {contract.client.firstName} {contract.client.lastName}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('table.type')}:</span>
                        <p className="font-medium text-gray-900">
                          {getDealTypeLabel(contract.deal.dealType)}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">{t('fields.agreedPrice')}:</span>
                        <p className="font-medium text-gray-900">
                          {formatCurrency(contract.deal.agreedPrice, contract.deal.currency)}
                        </p>
                      </div>
                    </div>

                    {/* Signature Status */}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <div className="flex items-center gap-1.5">
                        {contract.signedByClient ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ClockIcon className="w-4 h-4 text-yellow-600" />
                        )}
                        <span className={contract.signedByClient ? 'text-green-700' : 'text-yellow-700'}>
                          {t('clientSignature')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {contract.signedByOffice ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                        ) : (
                          <ClockIcon className="w-4 h-4 text-yellow-600" />
                        )}
                        <span className={contract.signedByOffice ? 'text-green-700' : 'text-yellow-700'}>
                          {t('officeSignature')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/dashboard/contracts/${contract.id}`}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <EyeIcon className="w-4 h-4" />
                    {t('actions.view')}
                  </Link>
                  {contract.fileUrl && (
                    <button className="btn btn-secondary flex items-center gap-2">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {t('actions.download')}
                    </button>
                  )}
                </div>
              </div>

              {/* Date & Additional Info */}
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                <span>
                  {t('fields.contractDate')}: {formatDate(contract.contractDate)}
                </span>
                {contract.signedAt && (
                  <span>
                    {t('fields.signedAt')}: {formatDate(contract.signedAt)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
