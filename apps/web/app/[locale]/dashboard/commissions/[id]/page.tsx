'use client';

// ═══════════════════════════════════════════════════════════════
// Commission Details Page - صفحة تفاصيل العمولة
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRightIcon,
  BanknotesIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';

interface Commission {
  id: string;
  dealId: string;
  brokerId: string;
  baseAmount: number;
  vatAmount: number;
  totalAmount: number;
  status: string;
  calculatedAt: string;
  approvedAt?: string;
  settledAt?: string;
  paidAt?: string;
  notes?: string;
  deal?: {
    id: string;
    title?: string;
    dealValue: number;
    dealType: string;
    client?: {
      id: string;
      firstName: string;
      lastName: string;
      firstNameAr?: string;
      lastNameAr?: string;
    };
    property?: {
      id: string;
      title: string;
      titleAr?: string;
      city: string;
    };
  };
  broker?: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr?: string;
    lastNameAr?: string;
    email?: string;
    phone?: string;
  };
  distribution?: {
    brokerShare: number;
    brokerPercentage: number;
    companyShare: number;
    companyPercentage: number;
  };
}

export default function CommissionDetailsPage() {
  const t = useTranslations('commissions');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();

  const [commission, setCommission] = useState<Commission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState<string | null>(null);

  // جلب تفاصيل العمولة
  useEffect(() => {
    const fetchCommission = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/commissions/${params.id}`);
        setCommission(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.messageAr || 'حدث خطأ في تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchCommission();
    }
  }, [params.id]);

  // تنسيق المبلغ
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: 'EGP',
    }).format(amount);
  };

  // عرض حالة العمولة
  const getStatusLabel = (status: string) => {
    return t(`statuses.${status}` as any) || status;
  };

  // عرض لون الحالة
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CALCULATED: 'bg-blue-100 text-blue-800 border-blue-200',
      APPROVED: 'bg-green-100 text-green-800 border-green-200',
      SETTLED: 'bg-purple-100 text-purple-800 border-purple-200',
      PAID: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      DISPUTED: 'bg-red-100 text-red-800 border-red-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  // عرض اسم الشخص
  const getPersonName = (
    person?: { firstName: string; lastName: string; firstNameAr?: string; lastNameAr?: string }
  ) => {
    if (!person) return '-';
    if (person.firstNameAr && person.lastNameAr) {
      return `${person.firstNameAr} ${person.lastNameAr}`;
    }
    return `${person.firstName} ${person.lastName}`;
  };

  // تنفيذ إجراء
  const handleAction = async (action: string) => {
    try {
      setActionLoading(action);

      switch (action) {
        case 'approve':
          await api.post(`/commissions/${params.id}/approve`);
          break;
        case 'settle':
          await api.post(`/commissions/${params.id}/settle`);
          break;
        case 'pay':
          await api.post(`/commissions/${params.id}/pay`, {
            method: 'BANK_TRANSFER',
            paidAt: new Date().toISOString(),
          });
          break;
        case 'dispute':
          await api.post(`/commissions/${params.id}/dispute`, {
            reason: 'نزاع على العمولة',
          });
          break;
      }

      // إعادة تحميل البيانات
      const response = await api.get(`/commissions/${params.id}`);
      setCommission(response.data.data);
      setShowConfirmModal(null);
    } catch (err: any) {
      console.error(`Failed to ${action} commission:`, err);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <SkeletonLoader type="detail" count={5} />;
  }

  if (error || !commission) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error || 'العمولة غير موجودة'}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 text-blue-600 hover:underline"
        >
          {tCommon('back')}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {/* العنوان */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowRightIcon className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{t('commissionDetails')}</h1>
          <p className="text-sm text-gray-500">{t('subtitle')}</p>
        </div>
        <span
          className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(commission.status)}`}
        >
          {getStatusLabel(commission.status)}
        </span>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* القسم الرئيسي */}
        <div className="md:col-span-2 space-y-6">
          {/* بطاقة المبلغ */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                %
              </div>
              <div>
                <p className="text-sm text-gray-500">{t('fields.totalAmount')}</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatAmount(commission.totalAmount)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">{t('fields.baseAmount')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatAmount(commission.baseAmount)}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">{t('fields.vatAmount')}</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatAmount(commission.vatAmount)}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('vatInfo')}</p>
              </div>
            </div>
          </div>

          {/* بطاقة توزيع العمولة */}
          {commission.distribution && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-gray-400" />
                {t('distribution.title')}
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('distribution.broker')}</p>
                    <p className="font-bold text-blue-700">
                      {formatAmount(commission.distribution.brokerShare)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-blue-600">
                      {commission.distribution.brokerPercentage}%
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">{t('distribution.company')}</p>
                    <p className="font-bold text-green-700">
                      {formatAmount(commission.distribution.companyShare)}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-green-600">
                      {commission.distribution.companyPercentage}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* بطاقة الصفقة */}
          {commission.deal && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                {t('fields.deal')}
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">{t('table.client')}</span>
                  <span className="font-medium text-gray-900">
                    {getPersonName(commission.deal.client)}
                  </span>
                </div>

                {commission.deal.property && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-gray-500">{t('table.deal')}</span>
                    <span className="font-medium text-gray-900">
                      {commission.deal.property.titleAr || commission.deal.property.title}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-500">قيمة الصفقة</span>
                  <span className="font-medium text-gray-900">
                    {formatAmount(commission.deal.dealValue)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-500">نوع الصفقة</span>
                  <span className="font-medium text-gray-900">
                    {commission.deal.dealType === 'SALE' ? 'بيع' : 'إيجار'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => router.push(`/dashboard/deals/${commission.deal?.id}`)}
                className="w-full mt-4 py-2 text-blue-600 hover:text-blue-700 text-sm font-medium border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
              >
                عرض الصفقة
              </button>
            </div>
          )}
        </div>

        {/* القسم الجانبي */}
        <div className="space-y-6">
          {/* بطاقة الوسيط */}
          {commission.broker && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <UserIcon className="w-5 h-5 text-gray-400" />
                الوسيط
              </h2>

              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
                  {commission.broker.firstName.charAt(0)}
                  {commission.broker.lastName.charAt(0)}
                </div>
                <p className="font-bold text-gray-900">{getPersonName(commission.broker)}</p>
              </div>

              <div className="space-y-2 text-sm">
                {commission.broker.email && (
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">البريد: </span>
                    {commission.broker.email}
                  </p>
                )}
                {commission.broker.phone && (
                  <p className="text-gray-500">
                    <span className="font-medium text-gray-700">الهاتف: </span>
                    <span dir="ltr">{commission.broker.phone}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* بطاقة التواريخ */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">التواريخ</h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-500">تم الحساب:</span>
                <span className="text-gray-900">
                  {new Date(commission.calculatedAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                </span>
              </div>

              {commission.approvedAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  <span className="text-gray-500">تمت الموافقة:</span>
                  <span className="text-gray-900">
                    {new Date(commission.approvedAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                  </span>
                </div>
              )}

              {commission.settledAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                  <span className="text-gray-500">تم التسوية:</span>
                  <span className="text-gray-900">
                    {new Date(commission.settledAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                  </span>
                </div>
              )}

              {commission.paidAt && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <span className="text-gray-500">تم الدفع:</span>
                  <span className="text-gray-900">
                    {new Date(commission.paidAt).toLocaleDateString('ar-EG', {year:'numeric',month:'long',day:'numeric'})}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <h2 className="font-semibold text-gray-900 mb-4">الإجراءات</h2>

            <div className="space-y-2">
              {commission.status === 'CALCULATED' && (
                <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_APPROVE]}>
                  <button
                    onClick={() => setShowConfirmModal('approve')}
                    disabled={actionLoading !== null}
                    className="w-full py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <CheckCircleIcon className="w-5 h-5" />
                    {actionLoading === 'approve' ? tCommon('loading') : t('actions.approve')}
                  </button>
                </PermissionGate>
              )}

              {commission.status === 'APPROVED' && (
                <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_SETTLE]}>
                  <button
                    onClick={() => setShowConfirmModal('settle')}
                    disabled={actionLoading !== null}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <BanknotesIcon className="w-5 h-5" />
                    {actionLoading === 'settle' ? tCommon('loading') : t('actions.settle')}
                  </button>
                </PermissionGate>
              )}

              {commission.status === 'SETTLED' && (
                <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_PAY]}>
                  <button
                    onClick={() => setShowConfirmModal('pay')}
                    disabled={actionLoading !== null}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <BanknotesIcon className="w-5 h-5" />
                    {actionLoading === 'pay' ? tCommon('loading') : t('actions.pay')}
                  </button>
                </PermissionGate>
              )}

              {['CALCULATED', 'APPROVED'].includes(commission.status) && (
                <PermissionGate permissions={[PERMISSIONS.COMMISSIONS_APPROVE]}>
                  <button
                    onClick={() => setShowConfirmModal('dispute')}
                    disabled={actionLoading !== null}
                    className="w-full py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <ExclamationTriangleIcon className="w-5 h-5" />
                    {t('actions.dispute')}
                  </button>
                </PermissionGate>
              )}
            </div>
          </div>

          {/* ملاحظات */}
          {commission.notes && (
            <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <h2 className="font-semibold text-gray-900 mb-2">{t('fields.notes')}</h2>
              <p className="text-gray-600 text-sm">{commission.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal التأكيد */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">تأكيد الإجراء</h3>
            <p className="text-gray-600 mb-6">{t(`messages.confirm${showConfirmModal.charAt(0).toUpperCase() + showConfirmModal.slice(1)}` as any)}</p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(null)}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={() => handleAction(showConfirmModal)}
                disabled={actionLoading !== null}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? tCommon('loading') : tCommon('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
