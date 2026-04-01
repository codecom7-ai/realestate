'use client';

// ═══════════════════════════════════════════════════════════════
// Edit Property Page - صفحة تعديل العقار
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRightIcon,
  CurrencyDollarIcon,
  HomeIcon,
  MapPinIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS, PropertyType, PropertyStatus, FinishingType } from '@realestate/shared-types';

// Egyptian cities
const EGYPTIAN_CITIES = [
  'القاهرة',
  'الجيزة',
  'الإسكندرية',
  'الدقي',
  'مدينة نصر',
  'التجمع الخامس',
  'الشيخ زايد',
  '6 أكتوبر',
  'العبور',
  'القاهرة الجديدة',
  'حدائق القبة',
  'مصر الجديدة',
  'المعادي',
  'حلوان',
  'المنصورة',
  'طنطا',
  'المنوفية',
  'الإسماعيلية',
  'السويس',
  'بورسعيد',
  'الشرقية',
  'أسيوط',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
];

// Schema للتحقق
const editPropertySchema = z.object({
  title: z.string().min(3).max(200),
  titleAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  propertyType: z.nativeEnum(PropertyType),
  finishingType: z.nativeEnum(FinishingType).optional().nullable(),
  status: z.nativeEnum(PropertyStatus),
  city: z.string().min(1).max(100),
  district: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  floor: z.number().int().min(-5).max(200).optional().nullable(),
  unitNumber: z.string().max(20).optional().nullable(),
  areaM2: z.number().positive(),
  bedrooms: z.number().int().min(0).max(50).optional().nullable(),
  bathrooms: z.number().int().min(0).max(20).optional().nullable(),
  parking: z.number().int().min(0).max(20).optional().nullable(),
  askingPrice: z.number().min(0),
  currency: z.string(),
  commissionRate: z.number().min(0).max(100).optional().nullable(),
  isListed: z.boolean(),
  isOffPlan: z.boolean(),
});

type EditPropertyFormData = z.infer<typeof editPropertySchema>;

interface Property {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  finishingType?: FinishingType | null;
  city: string;
  district?: string | null;
  address?: string | null;
  floor?: number | null;
  unitNumber?: string | null;
  areaM2: number;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parking?: number | null;
  askingPrice: number;
  currency: string;
  commissionRate?: number | null;
  isListed: boolean;
  isOffPlan: boolean;
}

export default function EditPropertyPage() {
  const t = useTranslations('properties');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<EditPropertyFormData>({
    resolver: zodResolver(editPropertySchema),
  });

  // جلب بيانات العقار
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/properties/${propertyId}`);
        const data = response.data.data;
        setProperty(data);

        // ملء النموذج بالبيانات الحالية
        reset({
          title: data.title,
          titleAr: data.titleAr || '',
          description: data.description || '',
          propertyType: data.propertyType,
          finishingType: data.finishingType || null,
          status: data.status,
          city: data.city,
          district: data.district || '',
          address: data.address || '',
          floor: data.floor ?? null,
          unitNumber: data.unitNumber || '',
          areaM2: data.areaM2,
          bedrooms: data.bedrooms ?? null,
          bathrooms: data.bathrooms ?? null,
          parking: data.parking ?? null,
          askingPrice: data.askingPrice,
          currency: data.currency || 'EGP',
          commissionRate: data.commissionRate ?? null,
          isListed: data.isListed ?? true,
          isOffPlan: data.isOffPlan ?? false,
        });
      } catch (err: any) {
        setError(err.response?.data?.error?.messageAr || tCommon('error'));
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, reset, tCommon]);

  // إرسال النموذج
  const onSubmit = async (data: EditPropertyFormData) => {
    if (!property) return;
    try {
      setSaving(true);
      setError(null);

      // تنظيف البيانات الفارغة
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== '' && v !== undefined)
      );

      await api.patch(`/properties/${property.id}`, cleanData);

      // الانتقال لصفحة تفاصيل العقار
      router.push(`/dashboard/properties/${property.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        <SkeletonLoader type="form" count={1} />
      </div>
    );
  }

  if (error && !property) {
    return (
      <div className="p-4 md:p-6">
        <div className="text-center py-12">
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.push('/properties')}
            className="mt-4 text-blue-600 hover:underline"
          >
            {tCommon('back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* العنوان */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowRightIcon className="w-5 h-5" />
            <span>{tCommon('back')}</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{t('editProperty')}</h1>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* قسم المعلومات الأساسية */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <HomeIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">المعلومات الأساسية</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* عنوان العقار */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.title')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  {...register('title')}
                  placeholder={t('placeholders.title')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                    errors.title ? 'border-red-300' : 'border-gray-200'
                  }`}
                  dir="rtl"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-500">{t('validation.titleRequired')}</p>
                )}
              </div>

              {/* نوع العقار */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.propertyType')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('propertyType')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                    errors.propertyType ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  {Object.values(PropertyType).map((type) => (
                    <option key={type} value={type}>
                      {t(`types.${type}` as any)}
                    </option>
                  ))}
                </select>
              </div>

              {/* حالة العقار */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.status')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('status')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                    errors.status ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  {Object.values(PropertyStatus).map((status) => (
                    <option key={status} value={status}>
                      {t(`statuses.${status}` as any)}
                    </option>
                  ))}
                </select>
              </div>

              {/* نوع التشطيب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.finishingType')}
                </label>
                <select
                  {...register('finishingType')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                >
                  <option value="">بدون تشطيب</option>
                  {Object.values(FinishingType).map((type) => (
                    <option key={type} value={type}>
                      {t(`finishingTypes.${type}` as any)}
                    </option>
                  ))}
                </select>
              </div>

              {/* وصف العقار */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.description')}
                </label>
                <textarea
                  {...register('description')}
                  placeholder={t('placeholders.description')}
                  rows={4}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white resize-none"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* قسم الموقع */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPinIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">الموقع</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* المدينة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.city')} <span className="text-red-500">*</span>
                </label>
                <select
                  {...register('city')}
                  className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white ${
                    errors.city ? 'border-red-300' : 'border-gray-200'
                  }`}
                >
                  <option value="">{t('placeholders.city')}</option>
                  {EGYPTIAN_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* المنطقة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.district')}
                </label>
                <input
                  type="text"
                  {...register('district')}
                  placeholder={t('placeholders.district')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  dir="rtl"
                />
              </div>

              {/* العنوان التفصيلي */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.address')}
                </label>
                <input
                  type="text"
                  {...register('address')}
                  placeholder={t('placeholders.address')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  dir="rtl"
                />
              </div>

              {/* الدور */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.floor')}
                </label>
                <input
                  type="number"
                  {...register('floor', { valueAsNumber: true })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              {/* رقم الوحدة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.unitNumber')}
                </label>
                <input
                  type="text"
                  {...register('unitNumber')}
                  placeholder={t('placeholders.unitNumber')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* قسم المساحة والمواصفات */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">المساحة والمواصفات</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* المساحة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.areaM2')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    {...register('areaM2', { valueAsNumber: true })}
                    placeholder="0"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white pl-12 ${
                      errors.areaM2 ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {t('m2')}
                  </span>
                </div>
              </div>

              {/* غرف النوم */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.bedrooms')}
                </label>
                <input
                  type="number"
                  {...register('bedrooms', { valueAsNumber: true })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              {/* الحمامات */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.bathrooms')}
                </label>
                <input
                  type="number"
                  {...register('bathrooms', { valueAsNumber: true })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>

              {/* أماكن الانتظار */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.parking')}
                </label>
                <input
                  type="number"
                  {...register('parking', { valueAsNumber: true })}
                  placeholder="0"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                />
              </div>
            </div>
          </div>

          {/* قسم السعر */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <CurrencyDollarIcon className="w-5 h-5 text-blue-600" />
              <h2 className="font-semibold text-gray-900">السعر</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* السعر المطلوب */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.askingPrice')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    {...register('askingPrice', { valueAsNumber: true })}
                    placeholder="0"
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white pl-16 ${
                      errors.askingPrice ? 'border-red-300' : 'border-gray-200'
                    }`}
                  />
                  <select
                    {...register('currency')}
                    className="absolute left-1 top-1 bottom-1 w-14 border-0 bg-transparent text-sm text-gray-500 focus:ring-0"
                  >
                    <option value="EGP">EGP</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              {/* نسبة العمولة */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.commissionRate')}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    {...register('commissionRate', { valueAsNumber: true })}
                    placeholder="0"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white pl-8"
                  />
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    %
                  </span>
                </div>
              </div>
            </div>

            {/* خيارات إضافية */}
            <div className="mt-4 flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isListed')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('fields.isListed')}</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('isOffPlan')}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{t('fields.isOffPlan')}</span>
              </label>
            </div>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || !isDirty}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{tCommon('loading')}</span>
                </>
              ) : (
                <>
                  <span>{tCommon('save')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PermissionGate>
  );
}
