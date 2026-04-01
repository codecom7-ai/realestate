'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { PropertyType, PERMISSIONS } from '@realestate/shared-types';

// Form Schema
const leadEditSchema = z.object({
  budget: z.number().min(0).optional(),
  budgetCurrency: z.string().max(10).optional().default('EGP'),
  preferredAreas: z.array(z.string()).optional(),
  propertyTypes: z.array(z.nativeEnum(PropertyType)).optional(),
  minSize: z.number().min(0).optional(),
  maxSize: z.number().min(0).optional(),
  minBedrooms: z.number().min(0).optional(),
  maxBedrooms: z.number().min(0).optional(),
  notes: z.string().max(2000).optional(),
  expectedCloseDate: z.string().optional(),
});

type LeadEditFormData = z.infer<typeof leadEditSchema>;

// Property Type Options
const PROPERTY_TYPE_OPTIONS = Object.values(PropertyType);

export default function EditLeadPage() {
  const t = useTranslations('leads');
  const tCommon = useTranslations('common');
  const tProperties = useTranslations('properties');
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientName, setClientName] = useState<string>('');

  const leadId = params.id as string;

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LeadEditFormData>({
    resolver: zodResolver(leadEditSchema),
    defaultValues: {
      budgetCurrency: 'EGP',
      preferredAreas: [],
      propertyTypes: [],
    },
  });

  // Fetch lead
  useEffect(() => {
    const fetchLead = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/leads/${leadId}`);
        const lead = response.data.data;

        setClientName(
          lead.client
            ? `${lead.client.firstNameAr || lead.client.firstName} ${lead.client.lastNameAr || lead.client.lastName}`
            : t('noClient')
        );

        reset({
          budget: lead.budget || undefined,
          budgetCurrency: lead.budgetCurrency || 'EGP',
          preferredAreas: lead.preferredAreas || [],
          propertyTypes: lead.propertyTypes || [],
          minSize: lead.minSize || undefined,
          maxSize: lead.maxSize || undefined,
          minBedrooms: lead.minBedrooms || undefined,
          maxBedrooms: lead.maxBedrooms || undefined,
          notes: lead.notes || undefined,
          expectedCloseDate: lead.expectedCloseDate
            ? new Date(lead.expectedCloseDate).toISOString().split('T')[0]
            : undefined,
        });
      } catch (err) {
        console.error('Failed to fetch lead:', err);
      } finally {
        setLoading(false);
      }
    };

    if (leadId) {
      fetchLead();
    }
  }, [leadId, reset, t]);

  const onSubmit = async (data: LeadEditFormData) => {
    setSubmitting(true);
    setError(null);

    try {
      // Clean empty values
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== undefined && v !== '' && v !== null)
      );

      await api.patch(`/leads/${leadId}`, cleanData);

      // Redirect to lead details
      router.push(`/dashboard/leads/${leadId}`);
    } catch (err: any) {
      console.error('Failed to update lead:', err);
      setError(err.response?.data?.error?.messageAr || err.response?.data?.error?.message || 'حدث خطأ');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.LEADS_WRITE]}>
      <div className="max-w-3xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <span>→</span>
            <span>{tCommon('back')}</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t('editLead')}</h1>
          <p className="text-gray-500 mt-1">{clientName}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('budget')}
              </label>
              <input
                type="number"
                {...register('budget', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tCommon('currency')}
              </label>
              <select
                {...register('budgetCurrency')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="EGP">{tCommon('egp')}</option>
                <option value="USD">دولار أمريكي</option>
                <option value="EUR">يورو</option>
                <option value="SAR">ريال سعودي</option>
              </select>
            </div>
          </div>

          {/* Preferred Areas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('preferredAreas')}
            </label>
            <Controller
              name="preferredAreas"
              control={control}
              render={({ field }) => (
                <input
                  type="text"
                  value={field.value?.join(', ') || ''}
                  onChange={(e) => {
                    const areas = e.target.value.split(',').map((s) => s.trim()).filter(Boolean);
                    field.onChange(areas);
                  }}
                  placeholder="مصر الجديدة، القاهرة الجديدة، الشروق"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              افصل بين المناطق بفاصلة
            </p>
          </div>

          {/* Property Types */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('propertyTypes')}
            </label>
            <Controller
              name="propertyTypes"
              control={control}
              render={({ field }) => (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {PROPERTY_TYPE_OPTIONS.map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-2 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={field.value?.includes(type) || false}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...(field.value || []), type]);
                          } else {
                            field.onChange(field.value?.filter((t) => t !== type) || []);
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{tProperties(`types.${type}`)}</span>
                    </label>
                  ))}
                </div>
              )}
            />
          </div>

          {/* Size Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tProperties('area')} ({t('validation.minSize')})
              </label>
              <input
                type="number"
                {...register('minSize', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tProperties('area')} ({t('validation.maxSize')})
              </label>
              <input
                type="number"
                {...register('maxSize', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Bedrooms Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tProperties('bedrooms')} ({t('validation.minBedrooms')})
              </label>
              <input
                type="number"
                {...register('minBedrooms', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tProperties('bedrooms')} ({t('validation.maxBedrooms')})
              </label>
              <input
                type="number"
                {...register('maxBedrooms', { valueAsNumber: true })}
                placeholder="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Expected Close Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('expectedCloseDate')}
            </label>
            <input
              type="date"
              {...register('expectedCloseDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('notes')}
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder={t('notesPlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? tCommon('loading') : tCommon('save')}
            </button>
          </div>
        </form>
      </div>
    </PermissionGate>
  );
}
