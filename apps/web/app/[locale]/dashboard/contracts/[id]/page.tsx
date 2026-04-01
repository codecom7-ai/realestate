'use client';

// ═══════════════════════════════════════════════════════════════
// Contract Details Page - تفاصيل العقد
// ═══════════════════════════════════════════════════════════════

import { useState, use } from 'react';
import Link from 'next/link';
import {
  DocumentTextIcon,
  ArrowRightIcon,
  BuildingOfficeIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useTranslations } from 'next-intl';

// Mock data
const mockContract = {
  id: '1',
  contractNumber: 'CNT-2024-001',
  contractDate: '2024-03-15',
  status: 'signed',
  notes: 'عقد بيع شقة سكنية - دفعة واحدة',
  fileUrl: '/contracts/cnt-001.pdf',
  signedByClient: true,
  signedByOffice: true,
  signedAt: '2024-03-16',
  deal: {
    id: '1',
    dealType: 'sale',
    agreedPrice: 2500000,
    currency: 'EGP',
    notes: 'العميل مهتم بالشقة وتم الاتفاق على السعر',
  },
  property: {
    id: '1',
    title: 'شقة فاخرة - التجمع الخامس',
    city: 'القاهرة',
    district: 'التجمع الخامس',
    address: 'شارع التسعين الشمالي، برج النخيل',
    areaM2: 180,
    bedrooms: 3,
    bathrooms: 2,
  },
  client: {
    id: '1',
    firstName: 'أحمد',
    lastName: 'محمد',
    phone: '+201234567890',
    email: 'ahmed@example.com',
  },
  timeline: [
    {
      id: '1',
      action: 'created',
      title: 'تم إنشاء العقد',
      description: 'تم إنشاء مسودة العقد',
      userId: 'user1',
      userName: 'محمد علي',
      occurredAt: '2024-03-15T10:00:00Z',
    },
    {
      id: '2',
      action: 'signed',
      title: 'تم توقيع العقد من المكتب',
      description: 'تم توقيع العقد من قبل إدارة المكتب',
      userId: 'user2',
      userName: 'سارة أحمد',
      occurredAt: '2024-03-15T11:30:00Z',
    },
    {
      id: '3',
      action: 'signed',
      title: 'تم توقيع العقد من العميل',
      description: 'قام العميل بتوقيع العقد',
      userId: 'user1',
      userName: 'محمد علي',
      occurredAt: '2024-03-16T14:00:00Z',
    },
  ],
  attachments: [
    {
      id: '1',
      name: 'صك الملكية.pdf',
      size: '2.5 MB',
      uploadedAt: '2024-03-15',
    },
    {
      id: '2',
      name: 'صورة البطاقة الضريبية.pdf',
      size: '1.2 MB',
      uploadedAt: '2024-03-15',
    },
  ],
};

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

// Format datetime
function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations('contracts');
  const [showSignModal, setShowSignModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // In real app, fetch contract data using id
  const contract = mockContract;

  // Get status badge
  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
      pending: {
        label: t('statuses.pending'),
        className: 'bg-yellow-100 text-yellow-800',
        icon: <ClockIcon className="w-5 h-5" />,
      },
      signed: {
        label: t('statuses.signed'),
        className: 'bg-green-100 text-green-800',
        icon: <CheckCircleIcon className="w-5 h-5" />,
      },
      cancelled: {
        label: t('statuses.cancelled'),
        className: 'bg-red-100 text-red-800',
        icon: <XCircleIcon className="w-5 h-5" />,
      },
    };

    const config = statusConfig[status] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${config.className}`}>
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

  // Get timeline icon
  const getTimelineIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
      case 'signed':
        return <CheckCircleIcon className="w-5 h-5 text-green-600" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5 text-red-600" />;
      default:
        return <ClockIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/contracts"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{contract.contractNumber}</h1>
              {getStatusBadge(contract.status)}
            </div>
            <p className="text-gray-500 mt-1">{t('contractDetails')}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {contract.fileUrl && (
            <button className="btn btn-secondary flex items-center gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" />
              {t('actions.download')}
            </button>
          )}
          {contract.status === 'pending' && (
            <>
              <button
                onClick={() => setShowSignModal(true)}
                className="btn btn-primary flex items-center gap-2"
              >
                <CheckIcon className="w-4 h-4" />
                {t('actions.sign')}
              </button>
              <button
                onClick={() => setShowCancelModal(true)}
                className="btn btn-secondary text-red-600 flex items-center gap-2"
              >
                <XMarkIcon className="w-4 h-4" />
                {t('actions.cancel')}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contract Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-primary" />
              {t('title')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">{t('fields.contractNumber')}</label>
                  <p className="font-medium">{contract.contractNumber}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('fields.contractDate')}</label>
                  <p className="font-medium">{formatDate(contract.contractDate)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('fields.dealType')}</label>
                  <p className="font-medium">{getDealTypeLabel(contract.deal.dealType)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">{t('fields.agreedPrice')}</label>
                  <p className="font-medium text-primary text-lg">
                    {formatCurrency(contract.deal.agreedPrice, contract.deal.currency)}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('fields.signedAt')}</label>
                  <p className="font-medium">{contract.signedAt ? formatDate(contract.signedAt) : '---'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('fields.fileUrl')}</label>
                  <p className="font-medium">
                    {contract.fileUrl ? (
                      <a href={contract.fileUrl} className="text-primary hover:underline flex items-center gap-1">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        {t('actions.download')}
                      </a>
                    ) : (
                      <span className="text-gray-400">{t('noFile')}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            {contract.notes && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <label className="text-sm text-gray-500">{t('fields.notes')}</label>
                <p className="mt-1 text-gray-700">{contract.notes}</p>
              </div>
            )}
          </div>

          {/* Parties */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-primary" />
              {t('fields.parties')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Party - Office */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-900 mb-3">{t('partyFirst')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                    <span>مكتب العقارات الذكي</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className={`w-4 h-4 ${contract.signedByOffice ? 'text-green-600' : 'text-gray-300'}`} />
                    <span>{contract.signedByOffice ? t('signed') : t('notSigned')}</span>
                  </div>
                </div>
              </div>

              {/* Second Party - Client */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-medium text-gray-900 mb-3">{t('partySecond')}</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span>{contract.client.firstName} {contract.client.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <span>{contract.client.phone}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className={`w-4 h-4 ${contract.signedByClient ? 'text-green-600' : 'text-gray-300'}`} />
                    <span>{contract.signedByClient ? t('signed') : t('notSigned')}</span>
                  </div>
                </div>
                <Link
                  href={`/dashboard/clients/${contract.client.id}`}
                  className="mt-3 inline-block text-sm text-primary hover:underline"
                >
                  {t('viewClient')}
                </Link>
              </div>
            </div>
          </div>

          {/* Property Info */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BuildingOfficeIcon className="w-5 h-5 text-primary" />
              {t('fields.property')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">العنوان</label>
                  <p className="font-medium">{contract.property.title}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">{t('fields.property')}</label>
                  <p className="font-medium">{contract.property.city} - {contract.property.district}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-500">المساحة</label>
                  <p className="font-medium">{contract.property.areaM2} م²</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">الغرف</label>
                  <p className="font-medium">{contract.property.bedrooms} غرف - {contract.property.bathrooms} حمام</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Link
                href={`/dashboard/properties/${contract.property.id}`}
                className="text-sm text-primary hover:underline"
              >
                {t('viewProperty')}
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href={`/dashboard/deals/${contract.deal.id}`}
                className="text-sm text-primary hover:underline"
              >
                {t('viewDeal')}
              </Link>
            </div>
          </div>

          {/* Attachments */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PaperClipIcon className="w-5 h-5 text-primary" />
              {t('fields.attachments')}
            </h2>
            {contract.attachments.length > 0 ? (
              <div className="space-y-3">
                {contract.attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-sm text-gray-500">{attachment.size}</p>
                      </div>
                    </div>
                    <button className="btn btn-secondary text-sm flex items-center gap-1">
                      <ArrowDownTrayIcon className="w-4 h-4" />
                      تحميل
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <PaperClipIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>{t('noAttachments')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Signatures Status */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-primary" />
              {t('fields.signatures')}
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                  <span>{t('officeSignature')}</span>
                </div>
                {contract.signedByOffice ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircleIcon className="w-4 h-4" />
                    {t('signed')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
                    <ClockIcon className="w-4 h-4" />
                    {t('pendingSignature')}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-gray-400" />
                  <span>{t('clientSignature')}</span>
                </div>
                {contract.signedByClient ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                    <CheckCircleIcon className="w-4 h-4" />
                    {t('signed')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
                    <ClockIcon className="w-4 h-4" />
                    {t('pendingSignature')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              {t('fields.timeline')}
            </h2>
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute right-4 top-0 bottom-0 w-0.5 bg-gray-200" />

              {/* Timeline items */}
              <div className="space-y-4">
                {contract.timeline.map((item, index) => (
                  <div key={item.id} className="relative flex gap-4">
                    {/* Icon */}
                    <div className="relative z-10 w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center">
                      {getTimelineIcon(item.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>{item.userName}</span>
                        <span>•</span>
                        <span>{formatDateTime(item.occurredAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="card bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="flex items-center gap-3 mb-3">
              <CurrencyDollarIcon className="w-6 h-6 text-primary" />
              <span className="font-medium text-gray-900">{t('fields.agreedPrice')}</span>
            </div>
            <p className="text-3xl font-bold text-primary">
              {formatCurrency(contract.deal.agreedPrice, contract.deal.currency)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {getDealTypeLabel(contract.deal.dealType)}
            </p>
          </div>
        </div>
      </div>

      {/* Sign Modal */}
      {showSignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('messages.confirmSign')}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSignModal(false)}
                className="btn btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Handle sign
                  setShowSignModal(false);
                }}
                className="btn btn-primary flex-1"
              >
                تأكيد التوقيع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-red-600">{t('messages.confirmCancel')}</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="btn btn-secondary flex-1"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  // Handle cancel
                  setShowCancelModal(false);
                }}
                className="btn bg-red-600 text-white hover:bg-red-700 flex-1"
              >
                تأكيد الإلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
