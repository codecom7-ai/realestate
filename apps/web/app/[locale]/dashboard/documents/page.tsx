'use client';

// ═══════════════════════════════════════════════════════════════
// Documents Page - قائمة المستندات
// ═══════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  DocumentIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowUpTrayIcon,
  CloudArrowUpIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

// Mock data
const mockDocuments = [
  {
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
      birthDate: '1995-01-01',
    },
    fileUrl: '/docs/id-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024000,
    expiresAt: null,
    uploadedBy: 'محمد علي',
    createdAt: '2024-03-15',
  },
  {
    id: '2',
    title: 'صك ملكية - شقة التجمع',
    documentType: 'ownership_deed',
    entityType: 'property',
    entityId: '1',
    entityName: 'شقة فاخرة - التجمع الخامس',
    status: 'pending_review',
    ocrStatus: 'processing',
    ocrData: null,
    fileUrl: '/docs/deed-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 2560000,
    expiresAt: null,
    uploadedBy: 'سارة أحمد',
    createdAt: '2024-03-18',
  },
  {
    id: '3',
    title: 'السجل التجاري - شركة الفجر',
    documentType: 'commercial_register',
    entityType: 'client',
    entityId: '2',
    entityName: 'شركة الفجر للتسويق',
    status: 'verified',
    ocrStatus: 'completed',
    ocrData: {
      commercialRegNo: '123456',
      companyName: 'شركة الفجر للتسويق',
    },
    fileUrl: '/docs/cr-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1536000,
    expiresAt: '2025-06-15',
    uploadedBy: 'محمد علي',
    createdAt: '2024-03-10',
  },
  {
    id: '4',
    title: 'جواز سفر - جون سميث',
    documentType: 'passport',
    entityType: 'client',
    entityId: '3',
    entityName: 'جون سميث',
    status: 'rejected',
    ocrStatus: 'completed',
    ocrData: null,
    fileUrl: '/docs/passport-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 768000,
    expiresAt: '2024-12-01',
    uploadedBy: 'أحمد خالد',
    createdAt: '2024-03-12',
  },
  {
    id: '5',
    title: 'توكيل رسمي',
    documentType: 'power_of_attorney',
    entityType: 'deal',
    entityId: '1',
    entityName: 'صفقة #1 - شقة التجمع',
    status: 'expired',
    ocrStatus: 'completed',
    ocrData: null,
    fileUrl: '/docs/poa-1.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512000,
    expiresAt: '2024-03-01',
    uploadedBy: 'محمد علي',
    createdAt: '2024-02-15',
  },
];

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
    month: 'short',
    day: 'numeric',
  });
}

// Check if date is expired or expiring soon
function getExpiryStatus(expiresAt: string | null): { status: 'expired' | 'expiring' | 'ok' | null; daysLeft?: number } {
  if (!expiresAt) return { status: null };
  
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { status: 'expired', daysLeft: 0 };
  if (diffDays <= 30) return { status: 'expiring', daysLeft: diffDays };
  return { status: 'ok', daysLeft: diffDays };
}

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const [searchQuery, setSearchQuery] = useState('');
  const [entityTypeFilter, setEntityTypeFilter] = useState('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return mockDocuments.filter((doc) => {
      // Search filter
      const matchesSearch =
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.entityName.toLowerCase().includes(searchQuery.toLowerCase());

      // Entity type filter
      const matchesEntityType = entityTypeFilter === 'all' || doc.entityType === entityTypeFilter;

      // Document type filter
      const matchesDocType = documentTypeFilter === 'all' || doc.documentType === documentTypeFilter;

      // Status filter
      const matchesStatus = statusFilter === 'all' || doc.status === statusFilter;

      return matchesSearch && matchesEntityType && matchesDocType && matchesStatus;
    });
  }, [searchQuery, entityTypeFilter, documentTypeFilter, statusFilter]);

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending_review: {
        label: t('statuses.pending_review'),
        className: 'bg-yellow-100 text-yellow-800',
        icon: <ClockIcon className="w-4 h-4" />,
      },
      verified: {
        label: t('statuses.verified'),
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircleIcon className="w-4 h-4" />,
      },
      rejected: {
        label: t('statuses.rejected'),
        className: 'bg-red-100 text-red-800',
        icon: <XCircleIcon className="w-4 h-4" />,
      },
      expired: {
        label: t('statuses.expired'),
        className: 'bg-gray-100 text-gray-800',
        icon: <ExclamationTriangleIcon className="w-4 h-4" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending_review;

    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  // Get OCR status badge
  const getOcrStatusBadge = (ocrStatus: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: {
        label: t('ocrStatuses.pending'),
        className: 'bg-gray-100 text-gray-600',
      },
      processing: {
        label: t('ocrStatuses.processing'),
        className: 'bg-blue-100 text-blue-600',
      },
      completed: {
        label: t('ocrStatuses.completed'),
        className: 'bg-green-100 text-green-600',
      },
      failed: {
        label: t('ocrStatuses.failed'),
        className: 'bg-red-100 text-red-600',
      },
    };

    const config = statusConfig[ocrStatus] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${config.className}`}>
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

  // Get entity type label
  const getEntityTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      client: t('entityTypes.client'),
      property: t('entityTypes.property'),
      deal: t('entityTypes.deal'),
      contract: t('entityTypes.contract'),
    };
    return types[type] || type;
  };

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      // Handle file upload
      console.log('Files dropped:', files);
      // Simulate upload progress
      setUploadProgress(0);
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);
    }
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <ArrowUpTrayIcon className="w-5 h-5" />
          {t('newDocument')}
        </button>
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

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={entityTypeFilter}
              onChange={(e) => setEntityTypeFilter(e.target.value)}
              className="input-field min-w-[120px]"
            >
              <option value="all">{t('entityTypes.all')}</option>
              <option value="client">{t('entityTypes.client')}</option>
              <option value="property">{t('entityTypes.property')}</option>
              <option value="deal">{t('entityTypes.deal')}</option>
              <option value="contract">{t('entityTypes.contract')}</option>
            </select>

            <select
              value={documentTypeFilter}
              onChange={(e) => setDocumentTypeFilter(e.target.value)}
              className="input-field min-w-[150px]"
            >
              <option value="all">{t('documentTypes.all')}</option>
              <option value="national_id">{t('documentTypes.national_id')}</option>
              <option value="passport">{t('documentTypes.passport')}</option>
              <option value="commercial_register">{t('documentTypes.commercial_register')}</option>
              <option value="tax_card">{t('documentTypes.tax_card')}</option>
              <option value="power_of_attorney">{t('documentTypes.power_of_attorney')}</option>
              <option value="ownership_deed">{t('documentTypes.ownership_deed')}</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field min-w-[120px]"
            >
              <option value="all">{t('statuses.all')}</option>
              <option value="pending_review">{t('statuses.pending_review')}</option>
              <option value="verified">{t('statuses.verified')}</option>
              <option value="rejected">{t('statuses.rejected')}</option>
              <option value="expired">{t('statuses.expired')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <p className="text-2xl font-bold text-blue-900">{mockDocuments.length}</p>
          <p className="text-sm text-blue-700">{t('statuses.all')}</p>
        </div>
        <div className="card bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <p className="text-2xl font-bold text-yellow-900">
            {mockDocuments.filter((d) => d.status === 'pending_review').length}
          </p>
          <p className="text-sm text-yellow-700">{t('statuses.pending_review')}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <p className="text-2xl font-bold text-green-900">
            {mockDocuments.filter((d) => d.status === 'verified').length}
          </p>
          <p className="text-sm text-green-700">{t('statuses.verified')}</p>
        </div>
        <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <p className="text-2xl font-bold text-red-900">
            {mockDocuments.filter((d) => d.status === 'rejected').length}
          </p>
          <p className="text-sm text-red-700">{t('statuses.rejected')}</p>
        </div>
        <div className="card bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
          <p className="text-2xl font-bold text-gray-900">
            {mockDocuments.filter((d) => d.status === 'expired').length}
          </p>
          <p className="text-sm text-gray-700">{t('statuses.expired')}</p>
        </div>
      </div>

      {/* Documents List */}
      {filteredDocuments.length === 0 ? (
        <div className="card text-center py-12">
          <DocumentIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('emptyTitle')}</h3>
          <p className="text-gray-500 mb-6">{t('emptyDescription')}</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn btn-primary"
          >
            {t('emptyAddButton')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredDocuments.map((doc) => {
            const expiryStatus = getExpiryStatus(doc.expiresAt);
            
            return (
              <div
                key={doc.id}
                className="card hover:shadow-md transition-all duration-200 border-r-4"
                style={{
                  borderRightColor:
                    doc.status === 'verified'
                      ? '#22c55e'
                      : doc.status === 'pending_review'
                      ? '#eab308'
                      : doc.status === 'rejected'
                      ? '#ef4444'
                      : '#6b7280',
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Document Info */}
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <DocumentIcon className="w-8 h-8 text-primary" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{doc.title}</h3>
                        {getStatusBadge(doc.status)}
                        {expiryStatus.status === 'expired' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                            <ExclamationTriangleIcon className="w-3 h-3" />
                            {t('expiredWarning')}
                          </span>
                        )}
                        {expiryStatus.status === 'expiring' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                            {t('expiresWarning')} ({expiryStatus.daysLeft} يوم)
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">{t('table.type')}:</span>
                          <p className="font-medium text-gray-900">{getDocTypeLabel(doc.documentType)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('table.entity')}:</span>
                          <p className="font-medium text-gray-900">
                            <span className="text-xs text-gray-400 ml-1">({getEntityTypeLabel(doc.entityType)})</span>
                            {doc.entityName}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('fields.sizeBytes')}:</span>
                          <p className="font-medium text-gray-900">{formatFileSize(doc.sizeBytes)}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">{t('table.ocr')}:</span>
                          <p className="mt-0.5">{getOcrStatusBadge(doc.ocrStatus)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <EyeIcon className="w-4 h-4" />
                      {t('actions.view')}
                    </Link>
                    <button className="btn btn-secondary flex items-center gap-2">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      {t('actions.download')}
                    </button>
                    {doc.status === 'pending_review' && (
                      <button className="btn btn-primary flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4" />
                        {t('actions.verify')}
                      </button>
                    )}
                  </div>
                </div>

                {/* Date Info */}
                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
                  <span>
                    {t('fields.uploadedBy')}: {doc.uploadedBy} • {t('fields.createdAt')}: {formatDate(doc.createdAt)}
                  </span>
                  {doc.expiresAt && (
                    <span>
                      {t('fields.expiresAt')}: {formatDate(doc.expiresAt)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5 text-primary" />
              {t('newDocument')}
            </h3>

            {/* Dropzone */}
            <div
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary/50'
              }`}
            >
              <CloudArrowUpIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">{t('dragDropHint')}</p>
              <p className="text-sm text-gray-500">{t('allowedTypes')} • {t('maxSize')}</p>
              <input type="file" className="hidden" id="file-upload" />
              <label
                htmlFor="file-upload"
                className="btn btn-secondary mt-4 inline-flex cursor-pointer"
              >
                اختيار ملف
              </label>
            </div>

            {/* Upload Progress */}
            {uploadProgress > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">جاري الرفع...</span>
                  <span className="font-medium">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.documentType')}
                </label>
                <select className="input-field w-full">
                  <option value="">{t('placeholders.selectDocumentType')}</option>
                  <option value="national_id">{t('documentTypes.national_id')}</option>
                  <option value="passport">{t('documentTypes.passport')}</option>
                  <option value="commercial_register">{t('documentTypes.commercial_register')}</option>
                  <option value="tax_card">{t('documentTypes.tax_card')}</option>
                  <option value="power_of_attorney">{t('documentTypes.power_of_attorney')}</option>
                  <option value="ownership_deed">{t('documentTypes.ownership_deed')}</option>
                  <option value="other">{t('documentTypes.other')}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.entityType')}
                  </label>
                  <select className="input-field w-full">
                    <option value="">{t('placeholders.selectEntityType')}</option>
                    <option value="client">{t('entityTypes.client')}</option>
                    <option value="property">{t('entityTypes.property')}</option>
                    <option value="deal">{t('entityTypes.deal')}</option>
                    <option value="contract">{t('entityTypes.contract')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.expiresAt')}
                  </label>
                  <input type="date" className="input-field w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.notes')}
                </label>
                <textarea
                  className="input-field w-full"
                  rows={2}
                  placeholder={t('placeholders.notes')}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadProgress(0);
                }}
                className="btn btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Handle upload
                  setShowUploadModal(false);
                }}
                className="btn btn-primary flex-1"
              >
                رفع المستند
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
