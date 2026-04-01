// ═══════════════════════════════════════════════════════════════
// New Viewing Page - صفحة جدولة معاينة جديدة
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { apiClient } from '@/lib/api';
import PermissionGate from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

// Types
interface Lead {
  id: string;
  stage: string;
  client?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

interface Property {
  id: string;
  title: string;
  city: string;
  district?: string;
  status: string;
  askingPrice: number;
  propertyType: string;
}

export default function NewViewingPage() {
  const t = useTranslations('viewings');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = params.locale as string;

  // Pre-selected from query params
  const preselectedLeadId = searchParams.get('leadId');
  const preselectedPropertyId = searchParams.get('propertyId');

  // Form state
  const [leadId, setLeadId] = useState(preselectedLeadId || '');
  const [propertyId, setPropertyId] = useState(preselectedPropertyId || '');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch leads and properties
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);

        const [leadsRes, propertiesRes] = await Promise.all([
          apiClient.getLeads({ limit: 100 }),
          apiClient.getProperties({ limit: 100, status: 'AVAILABLE' }),
        ]);

        if (leadsRes.data.success) {
          setLeads(leadsRes.data.data || []);
        }

        if (propertiesRes.data.success) {
          setProperties(propertiesRes.data.data || []);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!leadId) {
      setError(t('validation.leadRequired'));
      return;
    }

    if (!propertyId) {
      setError(t('validation.propertyRequired'));
      return;
    }

    if (!scheduledAt) {
      setError(t('validation.scheduledAtRequired'));
      return;
    }

    // Check if scheduledAt is in the future
    if (new Date(scheduledAt) < new Date()) {
      setError(t('validation.scheduledAtFuture'));
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.scheduleViewing({
        leadId,
        propertyId,
        scheduledAt,
        notes: notes || undefined,
      });

      if (response.data.success) {
        // Redirect to viewings list
        router.push(`/${locale}/viewings`);
      }
    } catch (err: any) {
      const errorData = err.response?.data?.error;
      if (errorData?.code === 'VIEWING_CONFLICT') {
        setError(t('messages.conflictError'));
      } else {
        setError(errorData?.messageAr || errorData?.message || tCommon('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  // Get min datetime for input (now + 30 minutes)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16);
  };

  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_WRITE]}>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{t('newViewing')}</h1>
          <p className="text-gray-500 mt-1">{t('subtitle')}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
              {error}
            </div>
          )}

          {loadingData ? (
            <div className="text-center py-8 text-gray-500">
              {tCommon('loading')}
            </div>
          ) : (
            <>
              {/* Lead Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.lead')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t('placeholders.selectLead')}</option>
                  {leads.map((lead) => (
                    <option key={lead.id} value={lead.id}>
                      {lead.client
                        ? `${lead.client.firstName} ${lead.client.lastName} - ${lead.client.phone}`
                        : lead.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Property Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.property')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={propertyId}
                  onChange={(e) => setPropertyId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">{t('placeholders.selectProperty')}</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} - {property.city}
                      {property.district ? ` (${property.district})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled At */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.scheduledAt')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={getMinDateTime()}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('fields.notes')} ({tCommon('optional')})
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('placeholders.notes')}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? tCommon('loading') : t('newViewing')}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </PermissionGate>
  );
}
