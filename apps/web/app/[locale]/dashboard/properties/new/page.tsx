'use client';

// ═══════════════════════════════════════════════════════════════
// New Property Page - صفحة إضافة عقار جديد
// World-Class Multi-Step Form with Auto-Save
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRightIcon,
  ArrowLeftIcon,
  HomeIcon,
  MapPinIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CloudArrowUpIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PhotoIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  CubeIcon,
  PlusIcon,
  MinusIcon,
  ArrowPathIcon,
  ClockIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';
import { BedIcon, BathIcon } from '@/components/icons/CustomIcons';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS, PropertyType, PropertyStatus, FinishingType } from '@realestate/shared-types';

// Egyptian Cities
const EGYPTIAN_CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'الدقي', 'مدينة نصر',
  'التجمع الخامس', 'الشيخ زايد', '6 أكتوبر', 'العبور', 'القاهرة الجديدة',
  'حدائق القبة', 'مصر الجديدة', 'المعادي', 'حلوان', 'المنصورة',
  'طنطا', 'المنوفية', 'الإسماعيلية', 'السويس', 'بورسعيد',
  'الشرقية', 'أسيوط', 'الأقصر', 'أسوان', 'البحر الأحمر',
];

// Property Types with Icons
const PROPERTY_TYPES = [
  { value: PropertyType.APARTMENT, label: 'شقة', icon: '🏢' },
  { value: PropertyType.VILLA, label: 'فيلا', icon: '🏡' },
  { value: PropertyType.DUPLEX, label: 'دوبلكس', icon: '🏘️' },
  { value: PropertyType.PENTHOUSE, label: 'بنتهاوس', icon: '🏙️' },
  { value: PropertyType.STUDIO, label: 'استوديو', icon: '🏠' },
  { value: PropertyType.OFFICE, label: 'مكتب', icon: '🏛️' },
  { value: PropertyType.SHOP, label: 'محل', icon: '🏪' },
  { value: PropertyType.WAREHOUSE, label: 'مستودع', icon: '🏭' },
  { value: PropertyType.LAND, label: 'أرض', icon: '🌍' },
  { value: PropertyType.COMPOUND_UNIT, label: 'وحدة كمباوند', icon: '🌆' },
];

// Finishing Types
const FINISHING_TYPES = [
  { value: FinishingType.FULLY_FINISHED, label: 'تشطيب كامل', icon: '✨' },
  { value: FinishingType.SEMI_FINISHED, label: 'تشطيب جزئي', icon: '🔨' },
  { value: FinishingType.CORE_SHELL, label: 'هيكل فقط', icon: '🏗️' },
  { value: FinishingType.ULTRA_LUXURY, label: 'تشطيب فاخر', icon: '💎' },
];

// Form Schema
const propertySchema = z.object({
  title: z.string().min(3, 'titleRequired').max(200),
  titleAr: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  propertyType: z.nativeEnum(PropertyType),
  finishingType: z.nativeEnum(FinishingType).optional(),
  status: z.nativeEnum(PropertyStatus).optional(),
  city: z.string().min(1, 'cityRequired').max(100),
  district: z.string().max(100).optional(),
  address: z.string().max(500).optional(),
  floor: z.number().int().min(-5).max(200).optional(),
  unitNumber: z.string().max(20).optional(),
  areaM2: z.number().positive('areaM2Min'),
  bedrooms: z.number().int().min(0).max(50).optional(),
  bathrooms: z.number().int().min(0).max(20).optional(),
  parking: z.number().int().min(0).max(20).optional(),
  askingPrice: z.number().min(0, 'askingPriceMin'),
  currency: z.string().default('EGP'),
  commissionRate: z.number().min(0).max(100, 'commissionRateMax').optional(),
  isListed: z.boolean().default(true),
  isOffPlan: z.boolean().default(false),
});

type PropertyFormData = z.infer<typeof propertySchema>;

// ═══════════════════════════════════════════════════════════════
// Step Configuration
// ═══════════════════════════════════════════════════════════════
const STEPS = [
  {
    id: 1,
    title: 'المعلومات الأساسية',
    description: 'نوع العقار والوصف',
    icon: HomeIcon,
    fields: ['title', 'propertyType', 'finishingType', 'description'],
  },
  {
    id: 2,
    title: 'الموقع',
    description: 'العنوان والمنطقة',
    icon: MapPinIcon,
    fields: ['city', 'district', 'address', 'floor', 'unitNumber'],
  },
  {
    id: 3,
    title: 'المواصفات',
    description: 'المساحة والمرافق',
    icon: DocumentTextIcon,
    fields: ['areaM2', 'bedrooms', 'bathrooms', 'parking'],
  },
  {
    id: 4,
    title: 'السعر',
    description: 'السعر والعمولة',
    icon: CurrencyDollarIcon,
    fields: ['askingPrice', 'currency', 'commissionRate', 'isListed', 'isOffPlan'],
  },
];

// ═══════════════════════════════════════════════════════════════
// Image Uploader Component
// ═══════════════════════════════════════════════════════════════
interface ImageUploaderProps {
  images: File[];
  setImages: React.Dispatch<React.SetStateAction<File[]>>;
  existingImages?: { id: string; url: string; isPrimary: boolean }[];
  onRemoveExisting?: (id: string) => void;
  onSetPrimary?: (id: string) => void;
}

function ImageUploader({ images, setImages, existingImages = [], onRemoveExisting, onSetPrimary }: ImageUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(
      (file) => file.type.startsWith('image/') && file.size <= 10 * 1024 * 1024
    );
    setImages((prev) => [...prev, ...validFiles].slice(0, 10));
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const totalImages = images.length + existingImages.length;

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          dragActive
            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleChange}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            dragActive ? 'bg-primary-100 dark:bg-primary-900/30 scale-110' : 'bg-gray-100 dark:bg-gray-800'
          }`}>
            <CloudArrowUpIcon className={`w-8 h-8 ${dragActive ? 'text-primary-500' : 'text-gray-400'}`} />
          </div>
          
          <div>
            <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
              {dragActive ? 'أفلت الصور هنا' : 'اسحب الصور هنا'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              أو <span className="text-primary-500 font-medium">تصفح</span> لاختيار الصور
            </p>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span>PNG, JPG, WebP</span>
            <span>•</span>
            <span>حتى 10 صور</span>
            <span>•</span>
            <span>أقصى حجم 10MB</span>
          </div>
        </div>

        {/* Progress Overlay */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="flex items-center gap-3">
              <ArrowPathIcon className="w-5 h-5 animate-spin text-primary-500" />
              <span className="text-gray-600 dark:text-gray-300">جاري الرفع...</span>
            </div>
          </div>
        )}
      </div>

      {/* Images Grid */}
      {totalImages > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {/* Existing Images */}
          {existingImages.map((image, index) => (
            <div
              key={image.id}
              className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={image.url}
                alt=""
                className="w-full h-full object-cover"
              />
              
              {/* Primary Badge */}
              {image.isPrimary && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded-lg">
                  الرئيسية
                </div>
              )}
              
              {/* Actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {!image.isPrimary && onSetPrimary && (
                  <button
                    type="button"
                    onClick={() => onSetPrimary(image.id)}
                    className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                    title="تعيين كصورة رئيسية"
                  >
                    <CheckBadgeIcon className="w-5 h-5 text-white" />
                  </button>
                )}
                {onRemoveExisting && (
                  <button
                    type="button"
                    onClick={() => onRemoveExisting(image.id)}
                    className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                    title="حذف"
                  >
                    <XMarkIcon className="w-5 h-5 text-white" />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          {/* New Images */}
          {images.map((file, index) => (
            <div
              key={index}
              className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="w-full h-full object-cover"
              />
              
              {index === 0 && existingImages.length === 0 && (
                <div className="absolute top-2 right-2 px-2 py-1 bg-primary-500 text-white text-xs font-medium rounded-lg">
                  الرئيسية
                </div>
              )}
              
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-2 bg-red-500/80 hover:bg-red-500 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main New Property Page Component
// ═══════════════════════════════════════════════════════════════
export default function NewPropertyPage() {
  const t = useTranslations('properties');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [autoSaving, setAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    trigger,
    formState: { errors, isValid },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      status: PropertyStatus.AVAILABLE,
      currency: 'EGP',
      isListed: true,
      isOffPlan: false,
    },
    mode: 'onChange',
  });

  // Watch form values for auto-save
  const formValues = watch();

  // Auto-save to localStorage
  useEffect(() => {
    const saveDraft = async () => {
      setAutoSaving(true);
      try {
        localStorage.setItem('property_draft', JSON.stringify({
          ...formValues,
          savedAt: new Date().toISOString(),
        }));
        setLastSaved(new Date());
      } catch (e) {
        console.error('Failed to save draft:', e);
      } finally {
        setTimeout(() => setAutoSaving(false), 500);
      }
    };

    const timer = setTimeout(saveDraft, 2000);
    return () => clearTimeout(timer);
  }, [formValues]);

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem('property_draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        Object.keys(parsedDraft).forEach((key) => {
          if (key !== 'savedAt') {
            setValue(key as any, parsedDraft[key]);
          }
        });
      } catch (e) {
        console.error('Failed to load draft:', e);
      }
    }
  }, [setValue]);

  // Check if step is valid
  const isStepValid = async (step: number): Promise<boolean> => {
    const stepFields = STEPS[step - 1].fields as (keyof PropertyFormData)[];
    const result = await trigger(stepFields);
    return result;
  };

  // Go to next step
  const nextStep = async () => {
    const isValid = await isStepValid(currentStep);
    if (isValid) {
      setCompletedSteps((prev) => new Set([...prev, currentStep]));
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    }
  };

  // Go to previous step
  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Submit form
  const onSubmit = async (data: PropertyFormData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post('/properties', {
        ...data,
        titleAr: data.titleAr || data.title,
      });

      // Clear draft
      localStorage.removeItem('property_draft');

      // Navigate to property details
      router.push(`/dashboard/properties/${response.data.data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  };

  // Get error message
  const getErrorMessage = (fieldName: string, errorKey?: string) => {
    if (!errorKey) return null;
    return t(`validation.${errorKey}` as any);
  };

  // Calculate progress
  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
        {/* ═══════════════════════════════════════════════════════════════
            Header
            ═══════════════════════════════════════════════════════════════ */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-4xl mx-auto px-4 md:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.back()}
                  className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <ArrowRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                    {t('newProperty')}
                  </h1>
                  <div className="flex items-center gap-2 mt-0.5">
                    {autoSaving ? (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <ArrowPathIcon className="w-3 h-3 animate-spin" />
                        جاري الحفظ...
                      </span>
                    ) : lastSaved ? (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <CheckCircleIcon className="w-3 h-3 text-emerald-500" />
                        محفوظ تلقائياً
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Progress Indicator */}
              <div className="hidden md:flex items-center gap-2">
                {STEPS.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = currentStep === step.id;
                  const isCompleted = completedSteps.has(step.id);

                  return (
                    <div key={step.id} className="flex items-center">
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                          isActive
                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 scale-110'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircleIcon className="w-5 h-5" />
                        ) : (
                          <Icon className="w-5 h-5" />
                        )}
                      </div>
                      {index < STEPS.length - 1 && (
                        <div
                          className={`w-12 h-1 mx-2 rounded-full transition-all duration-300 ${
                            completedSteps.has(step.id) ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile Progress Bar */}
            <div className="md:hidden mt-4">
              <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>الخطوة {currentStep} من {STEPS.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            Form Content
            ═══════════════════════════════════════════════════════════════ */}
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-8">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step Content */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
              {/* Step Header */}
              <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-l from-gray-50 to-white dark:from-gray-800/50 dark:to-gray-900">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    {(() => {
                      const Icon = STEPS[currentStep - 1].icon;
                      return <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />;
                    })()}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {STEPS[currentStep - 1].title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {STEPS[currentStep - 1].description}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step Body */}
              <div className="p-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.title')} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register('title')}
                        placeholder={t('placeholders.title')}
                        className={`input ${errors.title ? 'input-error' : ''}`}
                        dir="rtl"
                      />
                      {errors.title && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          {getErrorMessage('title', errors.title.message)}
                        </p>
                      )}
                    </div>

                    {/* Property Type Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {t('fields.propertyType')} <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {PROPERTY_TYPES.map((type) => (
                          <label
                            key={type.value}
                            className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              watch('propertyType') === type.value
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg shadow-primary-500/10'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                            }`}
                          >
                            <input
                              type="radio"
                              value={type.value}
                              {...register('propertyType')}
                              className="sr-only"
                            />
                            <span className="text-2xl">{type.icon}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {type.label}
                            </span>
                            {watch('propertyType') === type.value && (
                              <div className="absolute top-2 right-2">
                                <CheckCircleIcon className="w-5 h-5 text-primary-500" />
                              </div>
                            )}
                          </label>
                        ))}
                      </div>
                      {errors.propertyType && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          {getErrorMessage('propertyType', errors.propertyType.message)}
                        </p>
                      )}
                    </div>

                    {/* Finishing Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        {t('fields.finishingType')}
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {FINISHING_TYPES.map((type) => (
                          <label
                            key={type.value}
                            className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                              watch('finishingType') === type.value
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                            }`}
                          >
                            <input
                              type="radio"
                              value={type.value}
                              {...register('finishingType')}
                              className="sr-only"
                            />
                            <span className="text-xl">{type.icon}</span>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {type.label}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.description')}
                      </label>
                      <textarea
                        {...register('description')}
                        placeholder={t('placeholders.description')}
                        rows={5}
                        className="input textarea resize-none"
                        dir="rtl"
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* City */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.city')} <span className="text-red-500">*</span>
                      </label>
                      <select
                        {...register('city')}
                        className={`input ${errors.city ? 'input-error' : ''}`}
                      >
                        <option value="">{t('placeholders.city')}</option>
                        {EGYPTIAN_CITIES.map((city) => (
                          <option key={city} value={city}>
                            {city}
                          </option>
                        ))}
                      </select>
                      {errors.city && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          {getErrorMessage('city', errors.city.message)}
                        </p>
                      )}
                    </div>

                    {/* District */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.district')}
                      </label>
                      <input
                        type="text"
                        {...register('district')}
                        placeholder={t('placeholders.district')}
                        className="input"
                        dir="rtl"
                      />
                    </div>

                    {/* Address */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.address')}
                      </label>
                      <input
                        type="text"
                        {...register('address')}
                        placeholder={t('placeholders.address')}
                        className="input"
                        dir="rtl"
                      />
                    </div>

                    {/* Floor & Unit */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('fields.floor')}
                        </label>
                        <input
                          type="number"
                          {...register('floor', { valueAsNumber: true })}
                          placeholder="0"
                          className="input"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          {t('fields.unitNumber')}
                        </label>
                        <input
                          type="text"
                          {...register('unitNumber')}
                          placeholder={t('placeholders.unitNumber')}
                          className="input"
                          dir="rtl"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Specifications */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Area */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.areaM2')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          {...register('areaM2', { valueAsNumber: true })}
                          placeholder="0"
                          className={`input pl-16 ${errors.areaM2 ? 'input-error' : ''}`}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">
                          م²
                        </span>
                      </div>
                      {errors.areaM2 && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          {getErrorMessage('areaM2', errors.areaM2.message)}
                        </p>
                      )}
                    </div>

                    {/* Rooms Counter Style */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                      {/* Bedrooms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fields.bedrooms')}
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <button
                            type="button"
                            onClick={() => setValue('bedrooms', Math.max(0, (watch('bedrooms') || 0) - 1))}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <MinusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <div className="text-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {watch('bedrooms') || 0}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">غرفة</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue('bedrooms', (watch('bedrooms') || 0) + 1)}
                            className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            <PlusIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </button>
                        </div>
                      </div>

                      {/* Bathrooms */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fields.bathrooms')}
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <button
                            type="button"
                            onClick={() => setValue('bathrooms', Math.max(0, (watch('bathrooms') || 0) - 1))}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <MinusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <div className="text-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {watch('bathrooms') || 0}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">حمام</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue('bathrooms', (watch('bathrooms') || 0) + 1)}
                            className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            <PlusIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </button>
                        </div>
                      </div>

                      {/* Parking */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          {t('fields.parking')}
                        </label>
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                          <button
                            type="button"
                            onClick={() => setValue('parking', Math.max(0, (watch('parking') || 0) - 1))}
                            className="w-10 h-10 rounded-lg bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            <MinusIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                          </button>
                          <div className="text-center">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">
                              {watch('parking') || 0}
                            </span>
                            <p className="text-xs text-gray-500 mt-1">موقف</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setValue('parking', (watch('parking') || 0) + 1)}
                            className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700 flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-900/50 transition-colors"
                          >
                            <PlusIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Price */}
                {currentStep === 4 && (
                  <div className="space-y-6 animate-fade-in">
                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.askingPrice')} <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          {...register('askingPrice', { valueAsNumber: true })}
                          placeholder="0"
                          className={`input pl-20 ${errors.askingPrice ? 'input-error' : ''}`}
                        />
                        <select
                          {...register('currency')}
                          className="absolute left-1 top-1 bottom-1 w-18 border-0 bg-transparent text-sm text-gray-500 focus:ring-0"
                        >
                          <option value="EGP">EGP</option>
                          <option value="USD">USD</option>
                          <option value="EUR">EUR</option>
                        </select>
                      </div>
                      {errors.askingPrice && (
                        <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                          <ExclamationCircleIcon className="w-4 h-4" />
                          {getErrorMessage('askingPrice', errors.askingPrice.message)}
                        </p>
                      )}
                    </div>

                    {/* Commission Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('fields.commissionRate')}
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          {...register('commissionRate', { valueAsNumber: true })}
                          placeholder="0"
                          className="input pl-8"
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                          %
                        </span>
                      </div>
                    </div>

                    {/* Toggle Options */}
                    <div className="flex flex-wrap gap-4">
                      <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          {...register('isListed')}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('fields.isListed')}
                          </span>
                          <p className="text-xs text-gray-500">سيظهر في قائمة العقارات</p>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                        <input
                          type="checkbox"
                          {...register('isOffPlan')}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {t('fields.isOffPlan')}
                          </span>
                          <p className="text-xs text-gray-500">على المخطط (تحت الإنشاء)</p>
                        </div>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Step Footer */}
              <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className="btn btn-outline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ArrowRightIcon className="w-5 h-5" />
                    السابق
                  </button>

                  {currentStep < STEPS.length ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="btn btn-primary"
                    >
                      التالي
                      <ArrowLeftIcon className="w-5 h-5" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn btn-primary min-w-[120px]"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <ArrowPathIcon className="w-5 h-5 animate-spin" />
                          جاري الحفظ...
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircleIcon className="w-5 h-5" />
                          {tCommon('save')}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-xl flex items-center gap-2">
                <ExclamationCircleIcon className="w-5 h-5 flex-shrink-0" />
                {error}
              </div>
            )}
          </form>
        </div>
      </div>
    </PermissionGate>
  );
}
