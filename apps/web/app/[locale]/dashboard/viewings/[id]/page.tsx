// ═══════════════════════════════════════════════════════════════
// Viewing Details Page - صفحة تفاصيل المعاينة
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, use } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '@/lib/api';
import PermissionGate from '@/components/shared/PermissionGate';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PERMISSIONS } from '@realestate/shared-types';

// Types
interface Viewing {
  id: string;
  leadId: string;
  propertyId: string;
  scheduledAt: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  feedback?: string;
  rating?: number;
  conductedAt?: string;
  duration?: number;
  createdAt: string;
  lead?: {
    id: string;
    stage: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };
  property?: {
    id: string;
    title: string;
    city: string;
    district?: string;
    status: string;
  };
}

// Status badge component
function StatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    completed: 'bg-purple-100 text-purple-800',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[status] || statusColors.scheduled}`}>
      {t(`statuses.${status}`)}
    </span>
  );
}

// Star rating component
function StarRating({ rating, onChange, readonly = false }: { rating?: number; onChange?: (rating: number) => void; readonly?: boolean }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className={`text-2xl ${readonly ? 'cursor-default' : 'cursor-pointer'} transition-colors`}
        >
          <span className={
            (hovered || rating || 0) >= star
              ? 'text-yellow-400'
              : 'text-gray-300'
          }>
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

export default function ViewingDetailsPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const resolvedParams = use(params);
  const { locale, id } = resolvedParams;
  
  const t = useTranslations('viewings');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState<number>(0);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch viewing details
  useEffect(() => {
    const fetchViewing = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await apiClient.getViewing(id);

        if (response.data.success) {
          setViewing(response.data.data);
          setFeedback(response.data.data.feedback || '');
          setRating(response.data.data.rating || 0);
        }
      } catch (err: any) {
        setError(err.response?.data?.error?.messageAr || err.message || tCommon('error'));
      } finally {
        setLoading(false);
      }
    };

    fetchViewing();
  }, [id, tCommon]);

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Handle cancel
  const handleCancel = async () => {
    try {
      setActionLoading(true);
      const response = await apiClient.cancelViewing(id, cancelReason);

      if (response.data.success) {
        setViewing(response.data.data);
        setShowCancelModal(false);
        setCancelReason('');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle complete
  const handleComplete = async () => {
    try {
      setActionLoading(true);
      const response = await apiClient.updateViewing(id, {
        status: 'completed',
        feedback,
        rating,
      });

      if (response.data.success) {
        setViewing(response.data.data);
        setShowCompleteModal(false);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle confirm
  const handleConfirm = async () => {
    try {
      setActionLoading(true);
      const response = await apiClient.updateViewing(id, { status: 'confirmed' });

      if (response.data.success) {
        setViewing(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Check if viewing is upcoming
  const isUpcoming = viewing ? new Date(viewing.scheduledAt) > new Date() : false;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <SkeletonLoader type="detail" />
      </div>
    );
  }

  if (error || !viewing) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error || tCommon('error')}
        </div>
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_READ]}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('viewingDetails')}</h1>
            <p className="text-gray-500 mt-1">{formatDateTime(viewing.scheduledAt)}</p>
          </div>
          <StatusBadge status={viewing.status} t={t} />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">👤</span>
              {t('fields.lead')}
            </h2>
            {viewing.lead ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">{tCommon('name')}</p>
                  <p className="font-medium text-gray-900">
                    {viewing.lead.client
                      ? `${viewing.lead.client.firstName} ${viewing.lead.client.lastName}`
                      : '-'}
                  </p>
                </div>
                {viewing.lead.client?.phone && (
                  <div>
                    <p className="text-sm text-gray-500">{tCommon('phone')}</p>
                    <p className="font-medium text-gray-900" dir="ltr">{viewing.lead.client.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">{t('fields.status')}</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-sm bg-blue-100 text-blue-800">
                    {t(`leadStages.${viewing.lead.stage}`)}
                  </span>
                </div>
                <Link
                  href={`/${locale}/leads/${viewing.lead.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                >
                  {t('viewLead')}
                  <svg className="w-4 h-4 mr-1 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <p className="text-gray-500">{t('placeholders.selectLead')}</p>
            )}
          </div>

          {/* Property Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-2xl">🏠</span>
              {t('fields.property')}
            </h2>
            {viewing.property ? (
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">{t('table.property')}</p>
                  <p className="font-medium text-gray-900">{viewing.property.title}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">{tCommon('city')}</p>
                  <p className="font-medium text-gray-900">
                    {viewing.property.city}
                    {viewing.property.district ? ` - ${viewing.property.district}` : ''}
                  </p>
                </div>
                <Link
                  href={`/${locale}/properties/${viewing.property.id}`}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                >
                  {t('viewProperty')}
                  <svg className="w-4 h-4 mr-1 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            ) : (
              <p className="text-gray-500">{t('placeholders.selectProperty')}</p>
            )}
          </div>
        </div>

        {/* Notes & Feedback */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('fields.notes')}</h2>
          {viewing.notes ? (
            <p className="text-gray-700 whitespace-pre-wrap">{viewing.notes}</p>
          ) : (
            <p className="text-gray-400">{t('placeholders.notes')}</p>
          )}

          {viewing.status === 'completed' && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h3 className="text-md font-semibold text-gray-900 mb-3">{t('fields.feedback')}</h3>
              {viewing.feedback ? (
                <p className="text-gray-700 whitespace-pre-wrap">{viewing.feedback}</p>
              ) : (
                <p className="text-gray-400">{t('placeholders.feedback')}</p>
              )}
              {viewing.rating && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-gray-500">{t('fields.rating')}:</span>
                  <StarRating rating={viewing.rating} readonly />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(viewing.status === 'scheduled' || viewing.status === 'confirmed') && (
          <div className="flex flex-wrap gap-4">
            {viewing.status === 'scheduled' && (
              <button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {t('actions.confirm')}
              </button>
            )}
            <button
              onClick={() => setShowCompleteModal(true)}
              disabled={actionLoading || isUpcoming}
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              title={isUpcoming ? 'لا يمكن إكمال المعاينة قبل موعدها' : ''}
            >
              {t('actions.complete')}
            </button>
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={actionLoading}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {t('actions.cancel')}
            </button>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('confirmCancel')}</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('cancelReason')}
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder={t('cancelReasonPlaceholder')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? tCommon('loading') : t('actions.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('confirmComplete')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('fields.feedback')}
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder={t('placeholders.feedback')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('fields.rating')}
                  </label>
                  <StarRating rating={rating} onChange={setRating} />
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowCompleteModal(false)}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleComplete}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {actionLoading ? tCommon('loading') : t('actions.complete')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
