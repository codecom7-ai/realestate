'use client';

// ═══════════════════════════════════════════════════════════════
// ETA Receipts List Page - قائمة الإيصالات الإلكترونية
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  QRCodeSVG,
} from 'qrcode.react';
import {
  DocumentTextIcon,
  ArrowPathIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

// Types
interface ETAReceipt {
  id: string;
  documentUUID: string;
  status: 'PENDING' | 'VALID' | 'INVALID' | 'CANCELLED' | 'QUEUED_FOR_RETRY';
  submissionUUID?: string;
  longId?: string;
  internalId?: string;
  qrCodeData?: string;
  lastError?: string;
  createdAt: string;
}

interface ETAReceiptStats {
  total: number;
  valid: number;
  invalid: number;
  pending: number;
  queuedForRetry: number;
  totalAmount: number;
  totalTaxAmount: number;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'في انتظار الإرسال',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <ClockIcon className="w-4 h-4" />,
  },
  VALID: {
    label: 'مقبول',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircleIcon className="w-4 h-4" />,
  },
  INVALID: {
    label: 'مرفوض',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircleIcon className="w-4 h-4" />,
  },
  CANCELLED: {
    label: 'ملغي',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <XCircleIcon className="w-4 h-4" />,
  },
  QUEUED_FOR_RETRY: {
    label: 'في قائمة إعادة المحاولة',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <ExclamationTriangleIcon className="w-4 h-4" />,
  },
};

// Format currency
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// Format date
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className={`card p-4 border-r-4 ${color}`}>
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

// QR Code Modal Component
function QRCodeModal({
  receipt,
  onClose,
}: {
  receipt: ETAReceipt;
  onClose: () => void;
}) {
  const { data: qrData } = useQuery({
    queryKey: ['eta-receipt-qr', receipt.id],
    queryFn: async () => {
      const response = await apiClient.getETAReceiptQR(receipt.id);
      return response.data;
    },
    enabled: !!receipt.id && receipt.status === 'VALID',
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">رمز QR للإيصال</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4">
          {qrData?.qrCodeData ? (
            <>
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <QRCodeSVG
                  value={qrData.qrCodeData}
                  size={200}
                  level="H"
                  includeMargin
                />
              </div>
              <div className="text-center text-sm text-gray-600">
                <p>
                  <span className="font-medium">الرقم الداخلي: </span>
                  {receipt.internalId || '-'}
                </p>
                <p>
                  <span className="font-medium">إجمالي المبلغ: </span>
                  {qrData.total ? formatCurrency(qrData.total) : '-'}
                </p>
                <p>
                  <span className="font-medium">الرقم الضريبي: </span>
                  {qrData.issuerRIN || '-'}
                </p>
              </div>
              <a
                href={qrData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary text-sm"
              >
                عرض على بوابة ETA
              </a>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
              <p>لا يتوفر رمز QR - الإيصال غير مقبول</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Main Page Component
export default function ETAReceiptsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({
    status: '',
    startDate: '',
    endDate: '',
    search: '',
    page: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ETAReceipt | null>(null);

  // Fetch receipts
  const {
    data: receiptsData,
    isLoading: isLoadingReceipts,
    refetch: refetchReceipts,
  } = useQuery({
    queryKey: ['eta-receipts', filters],
    queryFn: async () => {
      const response = await apiClient.getETAReceipts({
        page: filters.page,
        limit: 20,
        status: filters.status || undefined,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
      });
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['eta-receipts-stats'],
    queryFn: async () => {
      const response = await apiClient.getETAReceiptStats().catch(() => ({ data: { data: { total:0, valid:0, invalid:0, pending:0, queuedForRetry:0, totalAmount:0, totalTaxAmount:0 } } }));
      return response.data as ETAReceiptStats;
    },
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: (id: string) => apiClient.retryETAReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eta-receipts'] });
      queryClient.invalidateQueries({ queryKey: ['eta-receipts-stats'] });
    },
  });

  // Filter receipts by search
  const filteredReceipts = useMemo(() => {
    if (!receiptsData?.data) return [];
    if (!filters.search) return receiptsData.data;

    const search = filters.search.toLowerCase();
    return receiptsData.data.filter(
      (receipt: ETAReceipt) =>
        receipt.documentUUID?.toLowerCase().includes(search) ||
        receipt.internalId?.toLowerCase().includes(search) ||
        receipt.submissionUUID?.toLowerCase().includes(search)
    );
  }, [receiptsData, filters.search]);

  const stats = statsData || {
    total: 0,
    valid: 0,
    invalid: 0,
    pending: 0,
    queuedForRetry: 0,
    totalAmount: 0,
    totalTaxAmount: 0,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الإيصالات الإلكترونية</h1>
          <p className="text-gray-500 mt-1">نظام الفواتير الإلكترونية المصرية (ETA)</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchReceipts()}
            className="btn btn-outline flex items-center gap-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            تحديث
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatsCard
          title="إجمالي الإيصالات"
          value={stats.total}
          icon={<DocumentTextIcon className="w-5 h-5 text-blue-600" />}
          color="border-blue-500"
        />
        <StatsCard
          title="مقبولة"
          value={stats.valid}
          icon={<CheckCircleIcon className="w-5 h-5 text-green-600" />}
          color="border-green-500"
        />
        <StatsCard
          title="مرفوضة"
          value={stats.invalid}
          icon={<XCircleIcon className="w-5 h-5 text-red-600" />}
          color="border-red-500"
        />
        <StatsCard
          title="في الانتظار"
          value={stats.pending}
          icon={<ClockIcon className="w-5 h-5 text-yellow-600" />}
          color="border-yellow-500"
        />
        <StatsCard
          title="إجمالي المبالغ"
          value={formatCurrency(stats.totalAmount)}
          icon={<DocumentTextIcon className="w-5 h-5 text-purple-600" />}
          color="border-purple-500"
        />
        <StatsCard
          title="إجمالي الضرائب"
          value={formatCurrency(stats.totalTaxAmount)}
          icon={<DocumentTextIcon className="w-5 h-5 text-orange-600" />}
          color="border-orange-500"
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
              placeholder="بحث بالرقم الداخلي أو UUID..."
              className="input pr-10"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الحالة
              </label>
              <select
                className="input"
                value={filters.status}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, status: e.target.value }))
                }
              >
                <option value="">الكل</option>
                <option value="PENDING">في انتظار الإرسال</option>
                <option value="VALID">مقبول</option>
                <option value="INVALID">مرفوض</option>
                <option value="QUEUED_FOR_RETRY">في قائمة إعادة المحاولة</option>
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
                  setFilters((prev) => ({ ...prev, startDate: e.target.value }))
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
                  setFilters((prev) => ({ ...prev, endDate: e.target.value }))
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Receipts Table */}
      <div className="card overflow-hidden p-0">
        {isLoadingReceipts ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-gray-500">جاري التحميل...</p>
          </div>
        ) : filteredReceipts.length === 0 ? (
          <div className="p-8 text-center">
            <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-300" />
            <p className="mt-4 text-gray-500">لا توجد إيصالات</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    الرقم الداخلي
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    الحالة
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    تاريخ الإنشاء
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    UUID
                  </th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                    الإجراءات
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredReceipts.map((receipt: ETAReceipt) => {
                  const statusConfig = STATUS_CONFIG[receipt.status] || STATUS_CONFIG.PENDING;
                  return (
                    <tr
                      key={receipt.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/eta/${receipt.id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {receipt.internalId || '-'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(receipt.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono truncate max-w-[200px]">
                        {receipt.documentUUID?.substring(0, 16)}...
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {/* View Details */}
                          <Link
                            href={`/dashboard/eta/${receipt.id}`}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="عرض التفاصيل"
                          >
                            <EyeIcon className="w-4 h-4 text-gray-600" />
                          </Link>

                          {/* QR Code (only for valid receipts) */}
                          {receipt.status === 'VALID' && (
                            <button
                              onClick={() => setSelectedReceipt(receipt)}
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                              title="عرض QR Code"
                            >
                              <svg
                                className="w-4 h-4 text-gray-600"
                                viewBox="0 0 24 24"
                                fill="currentColor"
                              >
                                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zm8-2v8h8V3h-8zm6 6h-4V5h4v4zM3 21h8v-8H3v8zm2-6h4v4H5v-4zm13-2h-2v2h2v-2zm2 0h2v4h-4v-2h2v-2zm-2 6h2v2h-2v-2zm-4-4h2v2h-2v-2z" />
                              </svg>
                            </button>
                          )}

                          {/* Retry (only for invalid or queued) */}
                          {(receipt.status === 'INVALID' ||
                            receipt.status === 'QUEUED_FOR_RETRY') && (
                            <button
                              onClick={() => retryMutation.mutate(receipt.id)}
                              disabled={retryMutation.isPending}
                              className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                              title="إعادة المحاولة"
                            >
                              <ArrowPathIcon
                                className={`w-4 h-4 text-orange-600 ${
                                  retryMutation.isPending ? 'animate-spin' : ''
                                }`}
                              />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {receiptsData?.total > 20 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              عرض {(filters.page - 1) * 20 + 1} -{' '}
              {Math.min(filters.page * 20, receiptsData.total)} من{' '}
              {receiptsData.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page - 1 }))
                }
                disabled={filters.page === 1}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() =>
                  setFilters((prev) => ({ ...prev, page: prev.page + 1 }))
                }
                disabled={filters.page * 20 >= receiptsData.total}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* QR Code Modal */}
      {selectedReceipt && (
        <QRCodeModal
          receipt={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
        />
      )}
    </div>
  );
}
