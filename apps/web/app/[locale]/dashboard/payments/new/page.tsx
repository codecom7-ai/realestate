'use client';

// ═══════════════════════════════════════════════════════════════
// New Payment Page - صفحة تسجيل دفعة جديدة
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ArrowRightIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Deal {
  id: string;
  title?: string;
  dealValue: number;
  client?: {
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
  };
  property?: {
    title: string;
    titleAr?: string;
  };
  installments?: Installment[];
}

interface Installment {
  id: string;
  installmentNumber: number;
  amount: number;
  dueDate: string;
  status: string;
  paidAmount: number;
}

const paymentMethods = [
  'CASH',
  'BANK_TRANSFER',
  'CHECK',
  'INSTAPAY',
  'FAWRY',
  'PAYMOB_CARD',
  'PAYMOB_WALLET',
  'PAYMOB_BNPL',
];

// Schema للتحقق
const paymentSchema = z.object({
  dealId: z.string().min(1, 'الصفقة مطلوبة'),
  installmentId: z.string().optional(),
  amount: z.number().min(0.01, 'المبلغ يجب أن يكون أكبر من صفر'),
  method: z.string().min(1, 'طريقة الدفع مطلوبة'),
  reference: z.string().optional(),
  receiptNumber: z.string().optional(),
  bankName: z.string().optional(),
  checkNumber: z.string().optional(),
  checkDueDate: z.string().optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormData = z.infer<typeof paymentSchema>;

export default function NewPaymentPage() {
  const t = useTranslations('payments');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [deals, setDeals] = useState<Deal[]>([]);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [availableInstallments, setAvailableInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingDeals, setLoadingDeals] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dealSearch, setDealSearch] = useState('');
  const [showDealDropdown, setShowDealDropdown] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<PaymentFormData>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: 0,
      method: '',
      paidAt: new Date().toISOString().split('T')[0],
    },
  });

  const selectedMethod = watch('method');
  const selectedDealId = watch('dealId');
  const selectedInstallmentId = watch('installmentId');

  // جلب الصفقات
  useEffect(() => {
    const fetchDeals = async () => {
      try {
        setLoadingDeals(true);
        const response = await api.get('/deals', {
          params: {
            status: 'PAYMENT_ACTIVE,CONTRACT_SIGNED',
            limit: 50,
          },
        });
        setDeals(response.data.data || []);
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoadingDeals(false);
      }
    };

    fetchDeals();
  }, []);

  // تحديث الأقساط عند اختيار صفقة
  useEffect(() => {
    if (selectedDealId) {
      const deal = deals.find((d) => d.id === selectedDealId);
      setSelectedDeal(deal || null);

      if (deal?.installments) {
        const unpaid = deal.installments.filter(
          (inst) => inst.status === 'PENDING' || inst.status === 'OVERDUE'
        );
        setAvailableInstallments(unpaid);
      } else {
        setAvailableInstallments([]);
      }
    } else {
      setSelectedDeal(null);
      setAvailableInstallments([]);
    }
  }, [selectedDealId, deals]);

  // تحديث المبلغ عند اختيار قسط
  useEffect(() => {
    if (selectedInstallmentId) {
      const installment = availableInstallments.find(
        (inst) => inst.id === selectedInstallmentId
      );
      if (installment) {
        const remaining = installment.amount - installment.paidAmount;
        setValue('amount', remaining);
      }
    }
  }, [selectedInstallmentId, availableInstallments, setValue]);

  // إرسال النموذج
  const onSubmit = async (data: PaymentFormData) => {
    try {
      setLoading(true);
      setError(null);

      const payload = {
        ...data,
        paidAt: data.paidAt || new Date().toISOString(),
      };

      await api.post('/payments', payload);
      setSuccess(true);

      setTimeout(() => {
        router.push('/payments');
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'حدث خطأ أثناء تسجيل الدفعة');
    } finally {
      setLoading(false);
    }
  };

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // عرض اسم العميل
  const getClientName = (deal: Deal) => {
    if (deal.client) {
      const { firstName, lastName, firstNameAr, lastNameAr } = deal.client;
      if (firstNameAr && lastNameAr) {
        return `${firstNameAr} ${lastNameAr}`;
      }
      return `${firstName} ${lastName}`;
    }
    return '-';
  };

  // فلترة الصفقات حسب البحث
  const filteredDeals = deals.filter((deal) => {
    if (!dealSearch) return true;
    const search = dealSearch.toLowerCase();
    const clientName = getClientName(deal).toLowerCase();
    const propertyTitle = (deal.property?.titleAr || deal.property?.title || '').toLowerCase();
    return clientName.includes(search) || propertyTitle.includes(search);
  });

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t('messages.createSuccess')}</h2>
          <p className="text-gray-500">جاري التحويل لصفحة المدفوعات...</p>
        </div>
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.PAYMENTS_WRITE]}>
      <div className="max-w-2xl mx-auto p-4 md:p-6">
        {/* العنوان */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('recordPayment')}</h1>
            <p className="text-sm text-gray-500">{t('subtitle')}</p>
          </div>
        </div>

        {/* النموذج */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* اختيار الصفقة */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-400" />
              {t('fields.deal')}
            </h2>

            <div className="relative">
              <input
                type="text"
                value={dealSearch}
                onChange={(e) => {
                  setDealSearch(e.target.value);
                  setShowDealDropdown(true);
                }}
                onFocus={() => setShowDealDropdown(true)}
                placeholder={t('placeholders.selectDeal')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                dir="rtl"
              />

              {showDealDropdown && filteredDeals.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingDeals ? (
                    <div className="p-4 text-center text-gray-500">{tCommon('loading')}</div>
                  ) : (
                    filteredDeals.map((deal) => (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => {
                          setValue('dealId', deal.id);
                          setValue('installmentId', '');
                          setDealSearch(getClientName(deal));
                          setShowDealDropdown(false);
                        }}
                        className="w-full px-4 py-3 text-right hover:bg-gray-50 border-b border-gray-100 last:border-0"
                      >
                        <div className="font-medium text-gray-900">{getClientName(deal)}</div>
                        <div className="text-sm text-gray-500">
                          {deal.property?.titleAr || deal.property?.title} •{' '}
                          {formatAmount(deal.dealValue)}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}

              <input type="hidden" {...register('dealId')} />
              {errors.dealId && (
                <p className="text-red-500 text-sm mt-1">{t('validation.dealRequired')}</p>
              )}
            </div>
          </div>

          {/* اختيار القسط (اختياري) */}
          {selectedDeal && availableInstallments.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">{t('availableInstallments')}</h2>

              <div className="grid gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="installmentOption"
                    value=""
                    checked={!selectedInstallmentId}
                    onChange={() => setValue('installmentId', '')}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm text-gray-600">دفعة غير مرتبطة بقسط</span>
                </label>

                {availableInstallments.map((inst) => (
                  <label
                    key={inst.id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="installmentOption"
                        value={inst.id}
                        checked={selectedInstallmentId === inst.id}
                        onChange={() => setValue('installmentId', inst.id)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div>
                        <span className="font-medium text-gray-900">
                          {t('installmentNumber')} {inst.installmentNumber}
                        </span>
                        <div className="text-sm text-gray-500">
                          {formatAmount(inst.amount - inst.paidAmount)} متبقي •{' '}
                          {new Date(inst.dueDate).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                    </div>
                    {inst.status === 'OVERDUE' && (
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                        {t('alerts.overdue')}
                      </span>
                    )}
                  </label>
                ))}
              </div>

              <input type="hidden" {...register('installmentId')} />
            </div>
          )}

          {/* تفاصيل الدفعة */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CurrencyDollarIcon className="w-5 h-5 text-gray-400" />
              {t('paymentFor')}
            </h2>

            {/* المبلغ */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.amount')} *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{t('validation.amountRequired')}</p>
              )}
            </div>

            {/* طريقة الدفع */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.method')} *
              </label>
              <select
                {...register('method')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="">{t('placeholders.selectMethod')}</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {t(`methods.${method}` as any)}
                  </option>
                ))}
              </select>
              {errors.method && (
                <p className="text-red-500 text-sm mt-1">{t('validation.methodRequired')}</p>
              )}
            </div>

            {/* حقول إضافية حسب طريقة الدفع */}
            {(selectedMethod === 'BANK_TRANSFER' || selectedMethod === 'INSTAPAY') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('fields.bankName')}
                </label>
                <input
                  type="text"
                  {...register('bankName')}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="اسم البنك"
                />
              </div>
            )}

            {selectedMethod === 'CHECK' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.checkNumber')}
                  </label>
                  <input
                    type="text"
                    {...register('checkNumber')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="رقم الشيك"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('fields.checkDueDate')}
                  </label>
                  <input
                    type="date"
                    {...register('checkDueDate')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* الرقم المرجعي */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.reference')}
              </label>
              <input
                type="text"
                {...register('reference')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('placeholders.reference')}
              />
            </div>

            {/* رقم الإيصال */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.receiptNumber')}
              </label>
              <input
                type="text"
                {...register('receiptNumber')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={t('placeholders.receiptNumber')}
              />
            </div>
          </div>

          {/* التاريخ والملاحظات */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-gray-400" />
              {t('fields.paidAt')}
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.paidAt')}
              </label>
              <input
                type="date"
                {...register('paidAt')}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('fields.notes')}
              </label>
              <textarea
                {...register('notes')}
                rows={3}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder={t('placeholders.notes')}
              />
            </div>
          </div>

          {/* رسالة الخطأ */}
          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg text-center">{error}</div>
          )}

          {/* أزرار الإجراءات */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 py-3 px-4 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? tCommon('loading') : t('recordPayment')}
            </button>
          </div>
        </form>
      </div>
    </PermissionGate>
  );
}
