'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '@/lib/api';
import { Check, Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Helper to set cookie
const setCookie = (name: string, value: string, maxAge: number = 365 * 24 * 60 * 60) => {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Lax${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
};

const setupSchema = z.object({
  // Step 1: Office Info
  officeName: z.string().min(3, 'اسم المكتب مطلوب'),
  officeNameAr: z.string().optional(),
  taxId: z.string().min(1, 'الرقم الضريبي مطلوب'),
  brokerLicenseNo: z.string().optional(),
  classification: z.enum(['A', 'B', 'C']).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().optional(),
  city: z.string().optional(),
  
  // Step 2: Owner Account
  ownerName: z.string().min(3, 'اسم المالك مطلوب'),
  ownerEmail: z.string().email('البريد الإلكتروني غير صحيح'),
  ownerPassword: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  ownerPhone: z.string().optional(),
  
  // Step 3: ETA POS (optional)
  etaPosSerial: z.string().optional(),
  etaPosOsVersion: z.string().optional(),
  
  // Step 4: WhatsApp (optional)
  whatsappToken: z.string().optional(),
  whatsappPhoneId: z.string().optional(),
});

type SetupFormData = z.infer<typeof setupSchema>;

const steps = [
  { id: 1, title: 'بيانات المكتب' },
  { id: 2, title: 'حساب المالك' },
  { id: 3, title: 'جهاز POS' },
  { id: 4, title: 'واتساب' },
  { id: 5, title: 'تأكيد' },
];

export default function SetupPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSetup, setIsCheckingSetup] = useState(true);
  const [setupAlreadyComplete, setSetupAlreadyComplete] = useState(false);

  // Check if setup is already complete on mount
  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const response = await apiClient.getSetupStatus();
        if (response.data?.data?.isComplete) {
          setSetupAlreadyComplete(true);
          setCookie('setup_complete', 'true');
          router.push('/login');
        }
      } catch (error) {
        // Setup not complete, continue with setup
        console.log('Setup required');
      } finally {
        setIsCheckingSetup(false);
      }
    };
    
    checkSetupStatus();
  }, [router]);

  const {
    register,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
  } = useForm<SetupFormData>({
    resolver: zodResolver(setupSchema),
    defaultValues: {
      classification: 'B',
    },
  });

  const formValues = watch();

  const nextStep = async () => {
    let fieldsToValidate: (keyof SetupFormData)[] = [];

    switch (currentStep) {
      case 1:
        fieldsToValidate = ['officeName', 'taxId'];
        break;
      case 2:
        fieldsToValidate = ['ownerName', 'ownerEmail', 'ownerPassword'];
        break;
      case 3:
      case 4:
        // Optional steps
        setCurrentStep(currentStep + 1);
        return;
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const onSubmit = async (data: SetupFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.initializeSetup(data);
      
      // Set setup_complete cookie on success
      setCookie('setup_complete', 'true');
      
      // Small delay to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 100));
      
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'حدث خطأ أثناء الإعداد');
    } finally {
      setIsLoading(false);
    }
  };

  // Show loading while checking setup status
  if (isCheckingSetup) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-gray-600">جاري التحقق...</span>
        </div>
      </div>
    );
  }

  // Don't render setup form if already complete
  if (setupAlreadyComplete) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-primary">عقارات</h1>
          <p className="text-gray-500 mt-2">إعداد النظام - خطوة واحدة فقط</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep > step.id
                    ? 'bg-green-500 text-white'
                    : currentStep === step.id
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-500'
                  }
                `}
              >
                {currentStep > step.id ? <Check className="w-5 h-5" /> : step.id}
              </div>
              <span className="hidden sm:block mr-2 text-sm text-gray-600">
                {step.title}
              </span>
              {index < steps.length - 1 && (
                <div className="w-8 sm:w-16 h-0.5 bg-gray-200 mx-2" />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <form onSubmit={handleSubmit(onSubmit)} className="card">
          <h2 className="text-xl font-semibold mb-6">
            {steps[currentStep - 1].title}
          </h2>

          {/* Step 1: Office Info */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المكتب <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('officeName')}
                  className="input"
                  placeholder="مكتب النيل للعقارات"
                />
                {errors.officeName && (
                  <p className="text-sm text-red-500 mt-1">{errors.officeName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الرقم الضريبي (RIN) <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('taxId')}
                  className="input"
                  placeholder="123456789"
                  dir="ltr"
                />
                {errors.taxId && (
                  <p className="text-sm text-red-500 mt-1">{errors.taxId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم ترخيص السمسرة (578)
                </label>
                <input
                  {...register('brokerLicenseNo')}
                  className="input"
                  placeholder="12345"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  التصنيف
                </label>
                <select {...register('classification')} className="input">
                  <option value="A">أ (A)</option>
                  <option value="B">ب (B)</option>
                  <option value="C">ج (C)</option>
                </select>
              </div>
            </div>
          )}

          {/* Step 2: Owner Account */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  اسم المالك <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('ownerName')}
                  className="input"
                  placeholder="أحمد محمد"
                />
                {errors.ownerName && (
                  <p className="text-sm text-red-500 mt-1">{errors.ownerName.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  البريد الإلكتروني <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  {...register('ownerEmail')}
                  className="input"
                  placeholder="ahmed@office.com"
                  dir="ltr"
                />
                {errors.ownerEmail && (
                  <p className="text-sm text-red-500 mt-1">{errors.ownerEmail.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  كلمة المرور <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  {...register('ownerPassword')}
                  className="input"
                  placeholder="••••••••"
                  dir="ltr"
                />
                {errors.ownerPassword && (
                  <p className="text-sm text-red-500 mt-1">{errors.ownerPassword.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الهاتف
                </label>
                <input
                  {...register('ownerPhone')}
                  className="input"
                  placeholder="01012345678"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Step 3: ETA POS */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm mb-4">
                يمكنك إعداد جهاز POS لاحقاً من الإعدادات
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الرقم التسلسلي للجهاز
                </label>
                <input
                  {...register('etaPosSerial')}
                  className="input"
                  placeholder="POS-001"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  إصدار نظام التشغيل
                </label>
                <input
                  {...register('etaPosOsVersion')}
                  className="input"
                  placeholder="Android 14"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Step 4: WhatsApp */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <p className="text-gray-500 text-sm mb-4">
                يمكنك إعداد واتساب لاحقاً من الإعدادات
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Business API Token
                </label>
                <input
                  {...register('whatsappToken')}
                  className="input"
                  placeholder="EAAxxxxx..."
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  معرف رقم الهاتف
                </label>
                <input
                  {...register('whatsappPhoneId')}
                  className="input"
                  placeholder="123456789"
                  dir="ltr"
                />
              </div>
            </div>
          )}

          {/* Step 5: Confirmation */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">بيانات المكتب</h3>
                <p className="text-sm text-gray-600">
                  الاسم: {formValues.officeName}<br />
                  الرقم الضريبي: {formValues.taxId}<br />
                  التصنيف: {formValues.classification}
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">حساب المالك</h3>
                <p className="text-sm text-gray-600">
                  الاسم: {formValues.ownerName}<br />
                  البريد: {formValues.ownerEmail}
                </p>
              </div>

              <p className="text-sm text-gray-500 text-center">
                بالضغط على "إتمام الإعداد" سيتم إنشاء حساب المالك وإعداد النظام
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm mt-4">
              {error}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="btn btn-ghost"
              >
                <ChevronLeft className="w-4 h-4 ml-1" />
                السابق
              </button>
            ) : (
              <div />
            )}

            {currentStep < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="btn btn-primary"
              >
                التالي
              </button>
            ) : (
              <button
                type="submit"
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'إتمام الإعداد'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
