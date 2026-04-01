'use client';

// ═══════════════════════════════════════════════════════════════
// ETA Receipt Details Page - تفاصيل الإيصال الإلكتروني
// ═══════════════════════════════════════════════════════════════

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowRightIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

// Types
interface ReceiptPayload {
  uuid: string;
  documentType: string;
  documentTypeVersion: string;
  internalId: string;
  issuanceDateTime: string;
  issuer: {
    id: string;
    name: string;
    type: string;
    branchId?: string;
  };
  receiver: {
    type: string;
    id?: string;
    name?: string;
    nationalId?: string;
    address?: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    internalCode: string;
    description: string;
    taxType: string;
    taxRate: number;
    quantity: number;
    unitPrice: number;
    discount?: number;
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
  }>;
  totalDiscountAmount: number;
  totalNetAmount: number;
  totalTaxAmount: number;
  totalAmount: number;
  extraDiscountPercentage?: number;
  remarks?: string;
}

interface ETAResponse {
  submissionUUID?: string;
  longId?: string;
  acceptedDocuments?: Array<{
    uuid: string;
    longId: string;
    receiptNumber: string;
  }>;
  rejectedDocuments?: Array<{
    receiptNumber: string;
    uuid: string;
    error: {
      message: string;
      target?: string;
      propertyPath?: string;
      details?: any[];
    };
  }>;
}

interface ETAReceiptDetail {
  id: string;
  documentUUID: string;
  status: 'PENDING' | 'VALID' | 'INVALID' | 'CANCELLED' | 'QUEUED_FOR_RETRY';
  submissionUUID?: string;
  longId?: string;
  internalId?: string;
  qrCodeData?: string;
  payload?: ReceiptPayload;
  etaResponse?: ETAResponse;
  lastError?: string;
  createdAt: string;
  updatedAt?: string;
}

// Status configuration
const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  PENDING: {
    label: 'في انتظار الإرسال',
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: <ClockIcon className="w-5 h-5" />,
  },
  VALID: {
    label: 'مقبول',
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: <CheckCircleIcon className="w-5 h-5" />,
  },
  INVALID: {
    label: 'مرفوض',
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: <XCircleIcon className="w-5 h-5" />,
  },
  CANCELLED: {
    label: 'ملغي',
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: <XCircleIcon className="w-5 h-5" />,
  },
  QUEUED_FOR_RETRY: {
    label: 'في قائمة إعادة المحاولة',
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: <ExclamationTriangleIcon className="w-5 h-5" />,
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
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Info Row Component
function InfoRow({
  label,
  value,
  className = '',
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-start justify-between py-2 ${className}`}>
      <span className="text-gray-500 text-sm">{label}</span>
      <span className="font-medium text-gray-900 text-left">{value}</span>
    </div>
  );
}

// Section Component
function Section({
  title,
  children,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="card">
      <div
        className={`flex items-center justify-between ${
          collapsible ? 'cursor-pointer' : ''
        }`}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <h3 className="text-lg font-semibold">{title}</h3>
        {collapsible && (
          <button className="p-1 hover:bg-gray-100 rounded">
            {isOpen ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>
        )}
      </div>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );
}

// JSON Viewer Component
function JsonViewer({ data, title }: { data: any; title: string }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        {isExpanded ? 'إخفاء' : 'عرض'} {title}
        {isExpanded ? (
          <ChevronUpIcon className="w-4 h-4" />
        ) : (
          <ChevronDownIcon className="w-4 h-4" />
        )}
      </button>
      {isExpanded && (
        <pre className="mt-2 p-4 bg-gray-50 rounded-lg overflow-x-auto text-xs ltr text-left">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

// Main Page Component
export default function ETAReceiptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  // Fetch receipt details
  const { data: receiptData, isLoading } = useQuery({
    queryKey: ['eta-receipt', id],
    queryFn: async () => {
      const response = await apiClient.getETAReceipt(id);
      return response.data as ETAReceiptDetail;
    },
    enabled: !!id,
  });

  // Fetch QR data
  const { data: qrData } = useQuery({
    queryKey: ['eta-receipt-qr', id],
    queryFn: async () => {
      const response = await apiClient.getETAReceiptQR(id);
      return response.data;
    },
    enabled: !!id && receiptData?.status === 'VALID',
  });

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: () => apiClient.retryETAReceipt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['eta-receipt', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="mt-4 text-gray-500">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!receiptData) {
    return (
      <div className="text-center py-16">
        <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-300" />
        <h2 className="mt-4 text-xl font-semibold">الإيصال غير موجود</h2>
        <Link href="/dashboard/eta" className="btn btn-primary mt-4">
          العودة للقائمة
        </Link>
      </div>
    );
  }

  const statusConfig = STATUS_CONFIG[receiptData.status] || STATUS_CONFIG.PENDING;
  const payload = receiptData.payload;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/eta"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              إيصال رقم: {receiptData.internalId || '-'}
            </h1>
            <p className="text-gray-500 mt-1">UUID: {receiptData.documentUUID}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Retry Button */}
          {(receiptData.status === 'INVALID' ||
            receiptData.status === 'QUEUED_FOR_RETRY') && (
            <button
              onClick={() => retryMutation.mutate()}
              disabled={retryMutation.isPending}
              className="btn btn-outline flex items-center gap-2"
            >
              <ArrowPathIcon
                className={`w-4 h-4 ${retryMutation.isPending ? 'animate-spin' : ''}`}
              />
              إعادة المحاولة
            </button>
          )}

          {/* Print Button */}
          {receiptData.status === 'VALID' && (
            <button
              onClick={() => window.print()}
              className="btn btn-outline flex items-center gap-2"
            >
              <PrinterIcon className="w-4 h-4" />
              طباعة
            </button>
          )}
        </div>
      </div>

      {/* Status Banner */}
      <div
        className={`flex items-center gap-3 p-4 rounded-lg border ${statusConfig.color}`}
      >
        {statusConfig.icon}
        <div>
          <p className="font-medium">{statusConfig.label}</p>
          {receiptData.lastError && (
            <p className="text-sm mt-1 opacity-80">{receiptData.lastError}</p>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Section title="معلومات أساسية">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <InfoRow label="الرقم الداخلي" value={receiptData.internalId || '-'} />
                <InfoRow label="الحالة" value={statusConfig.label} />
                <InfoRow
                  label="تاريخ الإنشاء"
                  value={formatDate(receiptData.createdAt)}
                />
                {receiptData.updatedAt && (
                  <InfoRow
                    label="آخر تحديث"
                    value={formatDate(receiptData.updatedAt)}
                  />
                )}
              </div>
              <div className="space-y-1">
                <InfoRow
                  label="Submission UUID"
                  value={
                    receiptData.submissionUUID ? (
                      <span className="font-mono text-xs">
                        {receiptData.submissionUUID}
                      </span>
                    ) : (
                      '-'
                    )
                  }
                />
                <InfoRow
                  label="Long ID"
                  value={
                    receiptData.longId ? (
                      <span className="font-mono text-xs">{receiptData.longId}</span>
                    ) : (
                      '-'
                    )
                  }
                />
              </div>
            </div>
          </Section>

          {/* Payload Data */}
          {payload && (
            <>
              {/* Issuer Info */}
              <Section title="بيانات المُصدِر">
                <div className="space-y-1">
                  <InfoRow label="الرقم الضريبي (RIN)" value={payload.issuer?.id || '-'} />
                  <InfoRow label="الاسم" value={payload.issuer?.name || '-'} />
                  <InfoRow
                    label="النوع"
                    value={payload.issuer?.type === 'B' ? 'شخص اعتباري' : 'شخص طبيعي'}
                  />
                  {payload.issuer?.branchId && (
                    <InfoRow label="كود الفرع" value={payload.issuer.branchId} />
                  )}
                </div>
              </Section>

              {/* Receiver Info */}
              <Section title="بيانات المستلم">
                <div className="space-y-1">
                  <InfoRow
                    label="النوع"
                    value={
                      payload.receiver?.type === 'B' ? 'شخص اعتباري' : 'شخص طبيعي'
                    }
                  />
                  {payload.receiver?.id && (
                    <InfoRow label="الرقم التعريفي" value={payload.receiver.id} />
                  )}
                  {payload.receiver?.name && (
                    <InfoRow label="الاسم" value={payload.receiver.name} />
                  )}
                  {payload.receiver?.nationalId && (
                    <InfoRow label="الرقم القومي" value={payload.receiver.nationalId} />
                  )}
                  {payload.receiver?.phone && (
                    <InfoRow label="الهاتف" value={payload.receiver.phone} />
                  )}
                  {payload.receiver?.email && (
                    <InfoRow label="البريد الإلكتروني" value={payload.receiver.email} />
                  )}
                </div>
              </Section>

              {/* Items */}
              <Section title="بنود الإيصال" collapsible>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                          الوصف
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                          الكمية
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                          السعر
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                          الضريبة
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-gray-500">
                          الإجمالي
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {payload.items?.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-sm">{item.description}</td>
                          <td className="px-3 py-2 text-sm text-center">
                            {item.quantity}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="px-3 py-2 text-sm">
                            {formatCurrency(item.taxAmount)}
                          </td>
                          <td className="px-3 py-2 text-sm font-medium">
                            {formatCurrency(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">إجمالي قبل الضريبة</span>
                    <span>{formatCurrency(payload.totalNetAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">إجمالي الضريبة</span>
                    <span>{formatCurrency(payload.totalTaxAmount)}</span>
                  </div>
                  {payload.totalDiscountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>إجمالي الخصومات</span>
                      <span>-{formatCurrency(payload.totalDiscountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                    <span>الإجمالي شامل الضريبة</span>
                    <span className="text-primary">
                      {formatCurrency(payload.totalAmount)}
                    </span>
                  </div>
                </div>
              </Section>
            </>
          )}

          {/* ETA Response */}
          {receiptData.etaResponse && (
            <Section title="استجابة ETA" collapsible defaultOpen={receiptData.status === 'INVALID'}>
              {receiptData.etaResponse.acceptedDocuments &&
                receiptData.etaResponse.acceptedDocuments.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-green-600 mb-2">
                      المستندات المقبولة:
                    </p>
                    <div className="space-y-1">
                      {receiptData.etaResponse.acceptedDocuments.map((doc, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 text-sm bg-green-50 p-2 rounded"
                        >
                          <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          <span>رقم الإيصال: {doc.receiptNumber}</span>
                          <span className="font-mono text-xs text-gray-500">
                            (Long ID: {doc.longId})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {receiptData.etaResponse.rejectedDocuments &&
                receiptData.etaResponse.rejectedDocuments.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-red-600 mb-2">
                      المستندات المرفوضة:
                    </p>
                    <div className="space-y-2">
                      {receiptData.etaResponse.rejectedDocuments.map((doc, i) => (
                        <div
                          key={i}
                          className="bg-red-50 p-3 rounded-lg space-y-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <XCircleIcon className="w-4 h-4 text-red-600" />
                            <span>رقم الإيصال: {doc.receiptNumber}</span>
                          </div>
                          <div className="text-sm text-red-700 mr-6">
                            <p className="font-medium">الخطأ:</p>
                            <p>{doc.error.message}</p>
                            {doc.error.propertyPath && (
                              <p className="text-xs text-gray-600 mt-1">
                                المسار: {doc.error.propertyPath}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <JsonViewer data={receiptData.etaResponse} title="الاستجابة الكاملة (JSON)" />
            </Section>
          )}

          {/* Raw Payload */}
          {payload && <JsonViewer data={payload} title="البيانات الخام (Payload JSON)" />}
        </div>

        {/* Right Column - QR Code */}
        <div className="space-y-6">
          {/* QR Code Card */}
          <div className="card text-center">
            <h3 className="text-lg font-semibold mb-4">رمز QR</h3>
            {qrData?.qrCodeData && receiptData.status === 'VALID' ? (
              <>
                <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-lg">
                  <QRCodeSVG
                    value={qrData.qrCodeData}
                    size={180}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p>
                    <span className="text-gray-500">إجمالي المبلغ: </span>
                    <span className="font-medium">
                      {qrData.total ? formatCurrency(qrData.total) : '-'}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-500">الرقم الضريبي: </span>
                    <span className="font-mono">{qrData.issuerRIN || '-'}</span>
                  </p>
                </div>
                {qrData.url && (
                  <a
                    href={qrData.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary mt-4 w-full"
                  >
                    عرض على بوابة ETA
                  </a>
                )}
              </>
            ) : (
              <div className="py-8 text-gray-500">
                <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-2 text-yellow-500" />
                <p>لا يتوفر رمز QR</p>
                <p className="text-sm mt-1">الإيصال غير مقبول في ETA</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">إجراءات سريعة</h3>
            <div className="space-y-2">
              <Link
                href="/dashboard/eta"
                className="btn btn-outline w-full justify-center"
              >
                العودة للقائمة
              </Link>
              {receiptData.status === 'VALID' && qrData?.url && (
                <a
                  href={qrData.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary w-full justify-center"
                >
                  فتح في بوابة ETA
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
