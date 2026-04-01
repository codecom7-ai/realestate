'use client';

// ═══════════════════════════════════════════════════════════════
// Client Form - نموذج إضافة/تعديل عميل
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowRightIcon, CheckIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

// مخطط التحقق
const clientSchema = z.object({
  firstName: z.string().min(2, 'firstNameRequired'),
  lastName: z.string().min(2, 'lastNameRequired'),
  firstNameAr: z.string().optional(),
  lastNameAr: z.string().optional(),
  phone: z.string().min(10, 'phoneRequired'),
  phone2: z.string().optional(),
  email: z.string().email('emailInvalid').optional().or(z.literal('')),
  nationalId: z.string().optional(),
  nationality: z.string().default('EG'),
  clientType: z.enum(['individual', 'company']).default('individual'),
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional(),
  isVip: z.boolean().default(false),
});

type ClientFormData = z.infer<typeof clientSchema>;

// مصادر العملاء
const CLIENT_SOURCES = [
  { value: 'whatsapp', label: 'واتساب' },
  { value: 'phone', label: 'هاتف' },
  { value: 'website', label: 'الموقع' },
  { value: 'referral', label: 'توصية' },
  { value: 'portal', label: 'بوابة عقارات' },
  { value: 'other', label: 'أخرى' },
];

export default function ClientFormPage() {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  const isEdit = clientId && clientId !== 'new';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      nationality: 'EG',
      clientType: 'individual',
      tags: [],
      isVip: false,
    },
  });

  const clientType = watch('clientType');
  const tags = watch('tags') || [];

  // جلب بيانات العميل للتعديل
  useEffect(() => {
    if (isEdit) {
      fetchClient();
    }
  }, [isEdit]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clients/${clientId}`);
      const client = response.data;

      setValue('firstName', client.firstName);
      setValue('lastName', client.lastName);
      setValue('firstNameAr', client.firstNameAr || '');
      setValue('lastNameAr', client.lastNameAr || '');
      setValue('phone', client.phone);
      setValue('phone2', client.phone2 || '');
      setValue('email', client.email || '');
      setValue('nationalId', ''); // لا يرجع من API
      setValue('nationality', client.nationality || 'EG');
      setValue('clientType', client.clientType);
      setValue('companyName', client.companyName || '');
      setValue('taxId', client.taxId || '');
      setValue('source', client.source || '');
      setValue('tags', client.tags || []);
      setValue('notes', client.notes || '');
      setValue('isVip', client.isVip);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  // التحقق من تكرار الهاتف
  const checkPhoneDuplicate = async (phone: string) => {
    if (!phone || phone.length < 10) return;

    try {
      const response = await api.get(`/clients/duplicates?phone=${phone}`);
      if (response.data.hasDuplicates) {
        const dup = response.data.duplicates[0];
        if (!isEdit || dup.id !== clientId) {
          setWarning(t('phoneExistsWarning', { name: `${dup.firstName} ${dup.lastName}` }));
        }
      } else {
        setWarning(null);
      }
    } catch {
      // تجاهل أخطاء التحقق
    }
  };

  // إضافة وسم
  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setValue('tags', [...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  // حذف وسم
  const removeTag = (tag: string) => {
    setValue('tags', tags.filter((t: string) => t !== tag));
  };

  // إرسال النموذج
  const onSubmit = async (data: ClientFormData) => {
    try {
      setLoading(true);
      setError(null);

      // تنظيف البيانات
      const cleanData = {
        ...data,
        email: data.email || undefined,
        nationalId: data.nationalId || undefined,
        companyName: data.clientType === 'company' ? data.companyName : undefined,
        taxId: data.clientType === 'company' ? data.taxId : undefined,
      };

      if (isEdit) {
        await api.patch(`/clients/${clientId}`, cleanData);
      } else {
        await api.post('/clients', cleanData);
      }

      router.push('/clients');
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PermissionGate permissions={[isEdit ? PERMISSIONS.CLIENTS_WRITE : PERMISSIONS.CLIENTS_WRITE]}>
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* العنوان */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {isEdit ? t('editClient') : t('newClient')}
          </h1>
        </div>

        {/* تحذير الهاتف المكرر */}
        {warning && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 text-sm">{warning}</p>
            </div>
          </div>
        )}

        {/* رسالة الخطأ */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* النموذج */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* الاسم */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">الاسم</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('firstName')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="أحمد"
                />
                {errors.firstName && (
                  <p className="text-red-500 text-sm mt-1">{t(`validation.${errors.firstName.message}`)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('lastName')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="محمد"
                />
                {errors.lastName && (
                  <p className="text-red-500 text-sm mt-1">{t(`validation.${errors.lastName.message}`)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstNameAr')}
                </label>
                <input
                  {...register('firstNameAr')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="أحمد"
                  dir="rtl"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastNameAr')}
                </label>
                <input
                  {...register('lastNameAr')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="محمد"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          {/* التواصل */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">معلومات التواصل</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone')} <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phone', {
                    onBlur: (e) => checkPhoneDuplicate(e.target.value),
                  })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="01012345678"
                  dir="ltr"
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{t(`validation.${errors.phone.message}`)}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('phone2')}
                </label>
                <input
                  {...register('phone2')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="01123456789"
                  dir="ltr"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('email')}
                </label>
                <input
                  {...register('email')}
                  type="email"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="ahmed@example.com"
                  dir="ltr"
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{t(`validation.${errors.email.message}`)}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('nationalId')}
                </label>
                <input
                  {...register('nationalId')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  placeholder="29501011234567"
                  dir="ltr"
                  maxLength={14}
                />
                <p className="text-xs text-gray-400 mt-1">يُشفَّر تلقائياً</p>
              </div>
            </div>
          </div>

          {/* نوع العميل */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">نوع العميل</h2>

            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('clientType')}
                  type="radio"
                  value="individual"
                  className="w-4 h-4 text-blue-600"
                />
                <span>{t('types.individual')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('clientType')}
                  type="radio"
                  value="company"
                  className="w-4 h-4 text-blue-600"
                />
                <span>{t('types.company')}</span>
              </label>
            </div>

            {clientType === 'company' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('companyName')}
                  </label>
                  <input
                    {...register('companyName')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('taxId')}
                  </label>
                  <input
                    {...register('taxId')}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                    dir="ltr"
                  />
                </div>
              </div>
            )}
          </div>

          {/* معلومات إضافية */}
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <h2 className="font-semibold text-gray-900">معلومات إضافية</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('source')}
                </label>
                <select
                  {...register('source')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">اختر المصدر</option>
                  {CLIENT_SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('nationality')}
                </label>
                <select
                  {...register('nationality')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="EG">مصري</option>
                  <option value="SA">سعودي</option>
                  <option value="AE">إماراتي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            </div>

            {/* الوسوم */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tags')}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  placeholder="أضف وسم..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  إضافة
                </button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ملاحظات */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('notes')}
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* VIP */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('isVip')}
                type="checkbox"
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="font-medium">{t('isVip')}</span>
            </label>
          </div>

          {/* أزرار الإرسال */}
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                tCommon('loading')
              ) : (
                <>
                  <CheckIcon className="w-5 h-5" />
                  {tCommon('save')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PermissionGate>
  );
}
