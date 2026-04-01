'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import ActivityTimeline from '@/components/activities/ActivityTimeline';
import { 
  DealStage, 
  PERMISSIONS 
} from '@realestate/shared-types';

// Deal Stages Array for iteration
const DEAL_STAGES: DealStage[] = [
  DealStage.LEAD,
  DealStage.VIEWING,
  DealStage.NEGOTIATION,
  DealStage.RESERVATION,
  DealStage.CONTRACT_PREPARATION,
  DealStage.CONTRACT_SIGNED,
  DealStage.PAYMENT_ACTIVE,
  DealStage.HANDOVER_PENDING,
  DealStage.CLOSED,
];

// Deal Stage Names in Arabic
const DEAL_STAGE_NAMES_AR: Record<DealStage, string> = {
  [DealStage.LEAD]: 'عميل محتمل',
  [DealStage.VIEWING]: 'معاينة',
  [DealStage.NEGOTIATION]: 'تفاوض',
  [DealStage.RESERVATION]: 'حجز',
  [DealStage.CONTRACT_PREPARATION]: 'إعداد العقد',
  [DealStage.CONTRACT_SIGNED]: 'تم توقيع العقد',
  [DealStage.PAYMENT_ACTIVE]: 'سداد نشط',
  [DealStage.HANDOVER_PENDING]: 'في انتظار التسليم',
  [DealStage.CLOSED]: 'مغلق',
  [DealStage.CANCELLED]: 'ملغي',
};

// Types
interface Deal {
  id: string;
  stage: DealStage;
  dealType: 'sale' | 'rent' | 'management';
  agreedPrice: number | null;
  currency: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  closedReason: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    phone: string;
    phone2: string | null;
    email: string | null;
    isVip: boolean;
    clientType: string;
  } | null;
  property: {
    id: string;
    title: string;
    titleAr: string | null;
    city: string;
    district: string | null;
    address: string | null;
    askingPrice: number;
    currency: string;
    propertyType: string;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    status: string;
  } | null;
  assignedBroker: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    phone: string | null;
    email: string;
    avatarUrl: string | null;
  } | null;
  reservation: {
    id: string;
    depositAmount: number;
    depositMethod: string;
    depositPaidAt: string | null;
    expiresAt: string;
    notes: string | null;
  } | null;
  contract: {
    id: string;
    contractNumber: string | null;
    contractDate: string | null;
    signedByClient: boolean;
    signedByOffice: boolean;
    signedAt: string | null;
    fileUrl: string | null;
  } | null;
  paymentSchedule: {
    id: string;
    totalAmount: number;
    currency: string;
    installments: {
      id: string;
      installmentNumber: number;
      type: string;
      amount: number;
      dueDate: string;
      status: string;
    }[];
  } | null;
  commissions: {
    id: string;
    commissionType: string;
    amount: number;
    vatAmount: number;
    totalAmount: number;
    currency: string;
    status: string;
    user: {
      firstName: string;
      lastName: string;
    } | null;
  }[];
  documents: {
    id: string;
    title: string;
    documentType: string;
    fileUrl: string;
    status: string;
    createdAt: string;
  }[];
}

// Stage colors
const STAGE_COLORS: Record<DealStage, { bg: string; border: string; text: string }> = {
  LEAD: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  VIEWING: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  NEGOTIATION: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  RESERVATION: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  CONTRACT_PREPARATION: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
  CONTRACT_SIGNED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  PAYMENT_ACTIVE: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  HANDOVER_PENDING: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
  CLOSED: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
  CANCELLED: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

// Payment method labels
const PAYMENT_METHODS: Record<string, string> = {
  CASH: 'نقدي',
  CHECK: 'شيك',
  BANK_TRANSFER: 'تحويل بنكي',
  INSTAPAY: 'InstaPay',
  FAWRY: 'فوري',
  PAYMOB_CARD: 'بطاقة Paymob',
  PAYMOB_WALLET: 'محفظة Paymob',
  PAYMOB_BNPL: 'الآن اشتري لاحقاً',
};

// Commission type labels
const COMMISSION_TYPES: Record<string, string> = {
  broker: 'سمسار',
  manager: 'مدير',
  company: 'شركة',
  external: ' outside',
};

export default function DealDetailsPage() {
  const t = useTranslations('deals');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const dealId = params.id as string;
  
  const [deal, setDeal] = useState<Deal | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<DealStage | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Fetch deal
  const fetchDeal = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/deals/${dealId}`);
      setDeal(response.data.data);
    } catch (error) {
      console.error('Failed to fetch deal:', error);
    } finally {
      setLoading(false);
    }
  }, [dealId]);
  
  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);
  
  // Change stage
  const handleChangeStage = async () => {
    if (!selectedStage || !deal) return;
    
    try {
      setUpdating(true);
      await api.patch(`/deals/${deal.id}/stage`, {
        stage: selectedStage,
      });
      setDeal({ ...deal, stage: selectedStage });
      setShowStageModal(false);
    } catch (error) {
      console.error('Failed to change stage:', error);
    } finally {
      setUpdating(false);
    }
  };
  
  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  // Calculate total paid
  const calculatePaidAmount = () => {
    if (!deal?.paymentSchedule) return 0;
    return deal.paymentSchedule.installments
      .filter(i => i.status === 'paid')
      .reduce((sum, i) => sum + i.amount, 0);
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <SkeletonCard />
      </div>
    );
  }
  
  if (!deal) {
    return (
      <div className="p-4 text-center text-gray-500">
        {t('emptyTitle')}
      </div>
    );
  }
  
  const clientName = deal.client
    ? `${deal.client.firstNameAr || deal.client.firstName} ${deal.client.lastNameAr || deal.client.lastName}`
    : t('noClient');
    
  const propertyName = deal.property
    ? deal.property.titleAr || deal.property.title
    : t('noProperty');
  
  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_READ]}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/deals')}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                →
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">{t('dealDetails')}</h1>
                <p className="text-sm text-gray-500">{clientName}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Stage Badge */}
              <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${STAGE_COLORS[deal.stage].bg} ${STAGE_COLORS[deal.stage].text}`}>
                {t(`stages.${deal.stage}`)}
              </span>
              
              {/* Deal Type Badge */}
              <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700">
                {t(`types.${deal.dealType}`)}
              </span>
              
              {/* Actions */}
              <PermissionGate permissions={[PERMISSIONS.DEALS_WRITE]}>
                <button
                  onClick={() => setShowStageModal(true)}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50"
                >
                  {t('changeStage')}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-4">
              {/* Client Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('fields.client')}</h2>
                {deal.client ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{clientName}</p>
                        {deal.client.isVip && (
                          <span className="text-xs text-amber-600">⭐ VIP</span>
                        )}
                      </div>
                      <button
                        onClick={() => router.push(`/dashboard/clients/${deal.client!.id}`)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        عرض الملف
                      </button>
                    </div>
                    <p className="text-sm text-gray-500" dir="ltr">{deal.client.phone}</p>
                    {deal.client.email && (
                      <p className="text-sm text-gray-500">{deal.client.email}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">{t('noClient')}</p>
                )}
              </div>
              
              {/* Property Info */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('fields.property')}</h2>
                {deal.property ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900">{propertyName}</p>
                      <button
                        onClick={() => router.push(`/dashboard/properties/${deal.property!.id}`)}
                        className="text-primary-600 hover:text-primary-700 text-sm"
                      >
                        عرض العقار
                      </button>
                    </div>
                    <p className="text-sm text-gray-500">
                      📍 {deal.property.city}{deal.property.district ? `، ${deal.property.district}` : ''}
                    </p>
                    <div className="flex gap-4 text-sm text-gray-600">
                      <span>📐 {deal.property.areaM2} م²</span>
                      {deal.property.bedrooms && <span>🛏️ {deal.property.bedrooms} غرف</span>}
                      {deal.property.bathrooms && <span>🚿 {deal.property.bathrooms} حمام</span>}
                    </div>
                    <p className="text-sm font-medium text-green-700">
                      السعر المطلوب: {deal.property.askingPrice.toLocaleString('ar-EG')} {deal.property.currency}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-400">{t('noProperty')}</p>
                )}
              </div>
              
              {/* Amounts & Commissions */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('amounts.title')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">{t('amounts.agreedPrice')}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {deal.agreedPrice ? `${deal.agreedPrice.toLocaleString('ar-EG')} ${deal.currency}` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('amounts.paidAmount')}</p>
                    <p className="text-lg font-semibold text-green-700">
                      {calculatePaidAmount().toLocaleString('ar-EG')} {deal.currency}
                    </p>
                  </div>
                </div>
                
                {/* Commissions */}
                {deal.commissions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-700 mb-2">العمولات</p>
                    <div className="space-y-2">
                      {deal.commissions.map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between text-sm">
                          <div>
                            <span className="text-gray-600">{COMMISSION_TYPES[commission.commissionType] || commission.commissionType}</span>
                            {commission.user && (
                              <span className="text-gray-400 mr-1">({commission.user.firstName} {commission.user.lastName})</span>
                            )}
                          </div>
                          <span className="font-medium">{commission.totalAmount.toLocaleString('ar-EG')} {commission.currency}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Payment Schedule */}
              {deal.paymentSchedule && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">جدول الدفعات</h2>
                  <div className="space-y-2">
                    {deal.paymentSchedule.installments.map((installment) => (
                      <div 
                        key={installment.id}
                        className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            الدفعة {installment.installmentNumber} - {installment.type}
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(installment.dueDate)}</p>
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium">{installment.amount.toLocaleString('ar-EG')} {deal.paymentSchedule!.currency}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            installment.status === 'paid' ? 'bg-green-100 text-green-700' :
                            installment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {installment.status === 'paid' ? 'مدفوعة' : installment.status === 'overdue' ? 'متأخرة' : 'معلقة'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Activities Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <ActivityTimeline 
                  entityType="deal" 
                  entityId={deal.id} 
                />
              </div>
            </div>
            
            {/* Side Column */}
            <div className="space-y-4">
              {/* Assigned Broker */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('fields.assignedBroker')}</h2>
                {deal.assignedBroker ? (
                  <div className="flex items-center gap-3">
                    {deal.assignedBroker.avatarUrl ? (
                      <img 
                        src={deal.assignedBroker.avatarUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                        {deal.assignedBroker.firstName[0]}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900">
                        {deal.assignedBroker.firstNameAr || deal.assignedBroker.firstName} {deal.assignedBroker.lastNameAr || deal.assignedBroker.lastName}
                      </p>
                      <p className="text-sm text-gray-500">{deal.assignedBroker.email}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">{t('unassigned')}</p>
                )}
              </div>
              
              {/* Reservation Info */}
              {deal.reservation && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">معلومات الحجز</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">مبلغ العربون</span>
                      <span className="font-medium">{deal.reservation.depositAmount.toLocaleString('ar-EG')} {deal.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">طريقة الدفع</span>
                      <span className="font-medium">{PAYMENT_METHODS[deal.reservation.depositMethod] || deal.reservation.depositMethod}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">تاريخ الانتهاء</span>
                      <span className="font-medium">{formatDate(deal.reservation.expiresAt)}</span>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Contract Info */}
              {deal.contract && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">معلومات العقد</h2>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">رقم العقد</span>
                      <span className="font-medium">{deal.contract.contractNumber || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">تاريخ العقد</span>
                      <span className="font-medium">{formatDate(deal.contract.contractDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">توقيع العميل</span>
                      <span className={`font-medium ${deal.contract.signedByClient ? 'text-green-600' : 'text-yellow-600'}`}>
                        {deal.contract.signedByClient ? '✓ موقّع' : 'في الانتظار'}
                      </span>
                    </div>
                    {deal.contract.fileUrl && (
                      <a 
                        href={deal.contract.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full text-center py-2 bg-primary-50 text-primary-700 rounded-lg text-sm hover:bg-primary-100"
                      >
                        عرض العقد
                      </a>
                    )}
                  </div>
                </div>
              )}
              
              {/* Documents */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('documents.title')}</h2>
                {deal.documents.length > 0 ? (
                  <div className="space-y-2">
                    {deal.documents.map((doc) => (
                      <a
                        key={doc.id}
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        <span className="text-xl">📄</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
                          <p className="text-xs text-gray-500">{formatDate(doc.createdAt)}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 text-sm">{t('documents.empty')}</p>
                )}
              </div>
              
              {/* Notes */}
              {deal.notes && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <h2 className="font-semibold text-gray-900 mb-3">{t('fields.notes')}</h2>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.notes}</p>
                </div>
              )}
              
              {/* Timeline */}
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <h2 className="font-semibold text-gray-900 mb-3">{t('timeline.title')}</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('fields.createdAt')}</span>
                    <span className="font-medium">{formatDate(deal.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('fields.updatedAt')}</span>
                    <span className="font-medium">{formatDate(deal.updatedAt)}</span>
                  </div>
                  {deal.closedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('fields.closedAt')}</span>
                      <span className="font-medium">{formatDate(deal.closedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Change Stage Modal */}
        {showStageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('changeStage')}</h3>
              
              <div className="space-y-2 mb-6">
                {DEAL_STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={`w-full text-right px-4 py-2 rounded-lg border transition-colors ${
                      selectedStage === stage 
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full ml-2 ${STAGE_COLORS[stage].bg}`}></span>
                    {DEAL_STAGE_NAMES_AR[stage]}
                  </button>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowStageModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleChangeStage}
                  disabled={!selectedStage || updating}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? tCommon('loading') : tCommon('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
