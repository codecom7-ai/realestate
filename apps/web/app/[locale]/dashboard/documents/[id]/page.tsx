'use client';

// ═══════════════════════════════════════════════════════════════
// Document Details Page - تفاصيل المستند
// ═══════════════════════════════════════════════════════════════

import { useState, use } from 'react';
import Link from 'next/link';
import {
  DocumentIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

// Mock data
const mockDocument = {
  id: '1',
  title: 'بطاقة الرقم القومي - أحمد محمد',
  documentType: 'national_id',
  entityType: 'client',
  entityId: '1',
  entityName: 'أحمد محمد',
  status: 'verified',
  ocrStatus: 'completed',
  ocrData: {
    nationalId: '29501011234567',
    name: 'أحمد محمد علي',
    nameEn: 'Ahmed Mohamed Ali',
    birthDate: '1995-01-01',
    gender: 'ذكر',
    address: 'القاهرة - مصر الجديدة',
    issueDate: '2020-01-15',
    expiryDate: '2030-01-15',
  },
  fileUrl: '/docs/id-1.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 1024000,
  expiresAt: null,
  uploadedBy: {
    id: 'user1',
    name: 'محمد علي',
  },
  verifiedBy: {
    id: 'user2',
    name: 'سارة أحمد',
  },
  verifiedAt: '2024-03-16',
  notes: 'تم التحقق من المستند - مطابق لبيانات العميل',
  createdAt: '2024-03-15',
  updatedAt: '2024-03-16',
  versionHistory: [
    {
      id: '1',
      version: 1,
      action: 'uploaded',
      description: 'تم رفع المستند',
      userId: 'user1',
      userName: 'محمد علي',
      createdAt: '2024-03-15T10:00:00Z',
    },
    {
      id: '2',
      version: 1,
      action: 'ocr_processed',
      description: 'تم استخراج البيانات تلقائياً',
      userId: 'system',
      userName: 'النظام',
      createdAt: '2024-03-15T10:05:00Z',
    },
    {
      id: '3',
      version: 1,
      action: 'verified',
      description: 'تم توثيق المستند',
      userId: 'user2',
      userName: 'سارة أحمد',
      createdAt: '2024-03-16T09:00:00Z',
    },
  ],
};

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Format date
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format datetime
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DocumentDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('documents');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // In real app, fetch document data using id
  const document = mockDocument;

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending_review: {
        label: t('statuses.pending_review'),
        className: 'bg-yellow-100 text-yellow-800',
        icon: <ClockIcon className="w-5 h-5" />,
      },
      verified: {
        label: t('statuses.verified'),
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircleIcon className="w-5 h-5" />,
      },
      rejected: {
        label: t('statuses.rejected'),
        className: 'bg-red-100 text-red-800',
        icon: <XCircleIcon className="w-5 h-5" />,
      },
      expired: {
        label: t('statuses.expired'),
        className: 'bg-gray-100 text-gray-800',
        icon: <ExclamationTriangleIcon className="w-5 h-5" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending_review;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Get OCR status badge
  const getOcrStatusBadge = (ocrStatus: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: t('ocrStatuses.pending'), className: 'bg-gray-100 text-gray-600' },
      processing: { label: t('ocrStatuses.processing'), className: 'bg-blue-100 text-blue-600' },
      completed: { label: t('ocrStatuses.completed'), className: 'bg-green-100 text-green-600' },
      failed: { label: t('ocrStatuses.failed'), className: 'bg-red-100 text-red-600' },
    };

    const config = statusConfig[ocrStatus] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Get document type label
  const getDocTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      national_id: t('documentTypes.national_id'),
      passport: t('documentTypes.passport'),
      commercial_register: t('documentTypes.commercial_register'),
      tax_card: t('documentTypes.tax_card'),
      power_of_attorney: t('documentTypes.power_of_attorney'),
      ownership_deed: t('documentTypes.ownership_deed'),
      contract: t('documentTypes.contract'),
      other: t('documentTypes.other'),
    };
    return types[type] || type;
  };

  // Get entity type label and link
  const getEntityInfo = (entityType: string, entityId: string, entityName: string) => {
    const routes: Record<string, string> = {
      client: '/dashboard/clients',
      property: '/dashboard/properties',
      deal: '/dashboard/deals',
      contract: '/dashboard/contracts',
    };

    const labels: Record<string, string> = {
      client: t('entityTypes.client'),
      property: t('entityTypes.property'),
      deal: t('entityTypes.deal'),
      contract: t('entityTypes.contract'),
    };

    return {
      label: labels[entityType] || entityType,
      link: `${routes[entityType]}/${entityId}`,
      name: entityName,
    };
  };

  // Get version action icon
  const getVersionActionIcon = (action: string) => {
    switch (action) {
      case 'uploaded':
        return <ArrowDownTrayIcon className="w-5 h-5 text-blue-600" />;
      case 'ocr_processed':
        return <ArrowPathIcon className="w-5 h-5 text-purple-600" />;
      case 'verified':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'rejected':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const entityInfo = getEntityInfo(document.entityType, document.entityId, document.entityName);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/documents"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
              {getStatusBadge(document.status)}
            </div>
            <p className="text-gray-500 mt-1">{getDocTypeLabel(document.documentType)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            {t('actions.download')}
          </button>
          {document.status === 'pending_review' && (
            <>
              <button
                onClick={() => setShowVerifyModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <CheckCircleIcon className="w-4 h-4" />
                {t('actions.verify')}
              </button>
              <button
                onClick={() => setShowRejectModal(true)}
                className="btn btn-secondary text-red-600 flex items-center gap-2"
              >
                <XCircleIcon className="w-4 h-4" />
                {t('actions.reject')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <EyeIcon className="w-5 h-5 text-primary" />
              {t('preview')}
            </h2>
            <div className="bg-gray-100 rounded-xl p-8 text-center min-h-[400px] flex flex-col items-center justify-center">
              {document.mimeType === 'application/pdf' ? (
                <>
                  <DocumentIcon className="w-24 h-24 text-gray-400 mb-4" />
                  <p className="text-gray-600 mb-4">{t('noPreview')}</p>
                  <a
                    href={document.fileUrl}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    {t('downloadFile')}
                  </a>
                </>
              ) : (
                <img
                  src={document.fileUrl}
                  alt={document.title}
                  className="max-w-full max-h-[500px] rounded-lg"
                />
              )}
            </div>
          </div>

          {/* OCR Data */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ArrowPathIcon className="w-5 h-5 text-primary" />
                {t('fields.ocrData')}
              </h2>
              {getOcrStatusBadge(document.ocrStatus)}
            </div>

            {document.ocrStatus === 'completed' && document.ocrData ? (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(document.ocrData).map(([key, value]) => (
                    <div key={key} className="space-y-1">
                      <label className="text-sm text-gray-500 capitalize">
                        {key === 'nationalId' ? 'الرقم القومي' :
                         key === 'name' ? 'الاسم (عربي)' :
                         key === 'nameEn' ? 'الاسم (إنجليزي)' :
                         key === 'birthDate' ? 'تاريخ الميلاد' :
                         key === 'gender' ? 'الجنس' :
                         key === 'address' ? 'العنوان' :
                         key === 'issueDate' ? 'تاريخ الإصدار' :
                         key === 'expiryDate' ? 'تاريخ الانتهاء' :
                         key}
                      </label>
                      <p className="font-medium text-gray-900">{String(value)}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : document.ocrStatus === 'processing' ? (
              <div className="text-center py-8">
                <ArrowPathIcon className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
                <p className="text-gray-600">{t('ocrProcessing')}</p>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <DocumentTextIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>{t('noOcrData')}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-primary" />
                {t('fields.notes')}
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{document.notes}</p>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="text-center">
              {document.status === 'verified' ? (
                <CheckCircleIcon className="w-16 h-16 mx-auto text-green-600 mb-3" />
              ) : document.status === 'rejected' ? (
                <XCircleIcon className="w-16 h-16 mx-auto text-red-600 mb-3" />
              ) : (
                <ClockIcon className="w-16 h-16 mx-auto text-yellow-600 mb-3" />
              )}
              <h3 className="text-lg font-semibold text-gray-900">
                {document.status === 'verified' ? t('statuses.verified') :
                 document.status === 'rejected' ? t('statuses.rejected') :
                 t('statuses.pending_review')}
              </h3>
              {document.verifiedAt && (
                <p className="text-sm text-gray-500 mt-2">
                  {t('fields.verifiedAt')}: {formatDate(document.verifiedAt)}
                </p>
              )}
            </div>
          </div>

          {/* Related Entity */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5 text-primary" />
              {t('relatedEntity')}
            </h2>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  {document.entityType === 'client' ? (
                    <UserIcon className="w-5 h-5 text-primary" />
                  ) : (
                    <BuildingOfficeIcon className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500">{entityInfo.label}</p>
                  <p className="font-medium text-gray-900">{entityInfo.name}</p>
                </div>
              </div>
              <Link
                href={entityInfo.link}
                className="mt-3 inline-block text-sm text-primary hover:underline"
              >
                عرض التفاصيل ←
              </Link>
            </div>
          </div>

          {/* File Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DocumentIcon className="w-5 h-5 text-primary" />
              معلومات الملف
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('fields.sizeBytes')}</span>
                <span className="font-medium">{formatFileSize(document.sizeBytes)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('fields.mimeType')}</span>
                <span className="font-medium">{document.mimeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('fields.createdAt')}</span>
                <span className="font-medium">{formatDate(document.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">{t('fields.uploadedBy')}</span>
                <span className="font-medium">{document.uploadedBy.name}</span>
              </div>
              {document.verifiedBy && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('fields.verifiedBy')}</span>
                  <span className="font-medium">{document.verifiedBy.name}</span>
                </div>
              )}
              {document.expiresAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('fields.expiresAt')}</span>
                  <span className="font-medium text-orange-600">{formatDate(document.expiresAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Version History */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-primary" />
              {t('fields.versionHistory')}
            </h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              {/* Timeline items */}
              <div className="space-y-4">
                {document.versionHistory.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {getVersionActionIcon(item.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{item.userName}</span>
                        <span>•</span>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Verify Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <CheckCircleIcon className="w-16 h-16 mx-auto text-green-600 mb-3" />
              <h3 className="text-lg font-semibold">{t('messages.verifyConfirm')}</h3>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowVerifyModal(false)}
                className="btn btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Handle verify
                  setShowVerifyModal(false);
                }}
                className="btn bg-green-600 text-white hover:bg-green-700 flex-1"
              >
                تأكيد التوثيق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-4">
              <XCircleIcon className="w-16 h-16 mx-auto text-red-600 mb-3" />
              <h3 className="text-lg font-semibold">{t('messages.rejectConfirm')}</h3>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('rejectionReason')}
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="input-field w-full"
                rows={3}
                placeholder={t('rejectionReasonPlaceholder')}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="btn btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Handle reject
                  setShowRejectModal(false);
                  setRejectionReason('');
                }}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                تأكيد الرفض
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
