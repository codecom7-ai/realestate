// ═══════════════════════════════════════════════════════════════
// AddActivityForm - نموذج إضافة نشاط جديد
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import type { ActivityType, EntityType } from './ActivityTimeline';

// أنواع الأنشطة المتاحة للمستخدم (بدون system)
const USER_ACTIVITY_TYPES: ActivityType[] = [
  'call',
  'whatsapp',
  'email',
  'meeting',
  'note',
  'viewing',
];

// أيقونات الأنشطة
const activityIcons: Record<ActivityType, string> = {
  call: '📞',
  whatsapp: '💬',
  email: '📧',
  meeting: '👥',
  note: '📝',
  viewing: '🏠',
  contract: '📄',
  payment: '💰',
  system: '⚙️',
};

// مخطط التحقق
const createActivitySchema = (t: (key: string) => string) =>
  z.object({
    activityType: z.enum(['call', 'whatsapp', 'email', 'meeting', 'note', 'viewing', 'contract', 'payment', 'system'], {
      required_error: t('validation.typeRequired'),
    }),
    title: z
      .string()
      .min(3, t('validation.titleMinLength'))
      .max(200, t('validation.titleMaxLength')),
    body: z.string().max(2000, t('validation.bodyMaxLength')).optional(),
    occurredAt: z.string().optional(),
  });

type ActivityFormData = z.infer<ReturnType<typeof createActivitySchema>>;

interface AddActivityFormProps {
  entityType: EntityType;
  entityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onActivityAdded?: () => void;
  defaultType?: ActivityType;
}

export default function AddActivityForm({
  entityType,
  entityId,
  onSuccess,
  onCancel,
  onActivityAdded,
  defaultType = 'note',
}: AddActivityFormProps) {
  const t = useTranslations('activities');
  const tCommon = useTranslations('common');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const schema = createActivitySchema(t);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      activityType: defaultType,
      title: '',
      body: '',
      occurredAt: new Date().toISOString().slice(0, 16),
    },
  });

  const selectedType = watch('activityType');

  // إرسال النموذج
  const onSubmit = async (data: ActivityFormData) => {
    try {
      setIsSubmitting(true);
      setError(null);

      await api.createActivity({
        entityType,
        entityId,
        activityType: data.activityType,
        title: data.title,
        body: data.body || undefined,
        occurredAt: data.occurredAt ? new Date(data.occurredAt).toISOString() : undefined,
      });

      if (onSuccess) {
        onSuccess();
      }
      if (onActivityAdded) {
        onActivityAdded();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* خطأ عام */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* نوع النشاط */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('fields.type')}
          </label>
          <div className="flex flex-wrap gap-2">
            {USER_ACTIVITY_TYPES.map((type) => (
              <label
                key={type}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border-2 transition-all
                  ${
                    selectedType === type
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }
                `}
              >
                <input
                  type="radio"
                  value={type}
                  {...register('activityType')}
                  className="sr-only"
                />
                <span className="text-lg">{activityIcons[type]}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t(`types.${type}`)}
                </span>
              </label>
            ))}
          </div>
          {errors.activityType && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.activityType.message}
            </p>
          )}
        </div>

        {/* العنوان */}
        <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t('fields.title')} <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            type="text"
            {...register('title')}
            placeholder={t('placeholders.title')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {errors.title && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.title.message}
            </p>
          )}
        </div>

        {/* الوصف */}
        <div>
          <label
            htmlFor="body"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t('fields.description')}
          </label>
          <textarea
            id="body"
            rows={3}
            {...register('body')}
            placeholder={t('placeholders.description')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          {errors.body && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.body.message}
            </p>
          )}
        </div>

        {/* التاريخ والوقت */}
        <div>
          <label
            htmlFor="occurredAt"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            {t('fields.date')} و {t('fields.time')}
          </label>
          <input
            id="occurredAt"
            type="datetime-local"
            {...register('occurredAt')}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* أزرار الإجراءات */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 disabled:opacity-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting ? tCommon('loading') : t('addActivity')}
          </button>
        </div>
      </form>
    </div>
  );
}
