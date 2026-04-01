'use client';

// ═══════════════════════════════════════════════════════════════
// Client Details Page - صفحة تفاصيل العميل
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  PhoneIcon,
  EnvelopeIcon,
  BuildingOfficeIcon,
  TagIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
} from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ActivityTimeline from '@/components/activities/ActivityTimeline';
import { PERMISSIONS } from '@realestate/shared-types';

interface ClientDetails {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  nationality: string;
  clientType: string;
  companyName?: string;
  taxId?: string;
  source?: string;
  tags: string[];
  notes?: string;
  isVip: boolean;
  createdAt: string;
  updatedAt: string;
  leads: Array<{
    id: string;
    stage: string;
    aiScore?: number;
    createdAt: string;
  }>;
  deals: Array<{
    id: string;
    stage: string;
    dealType: string;
    agreedPrice?: number;
    createdAt: string;
  }>;
}

export default function ClientDetailsPage() {
  const t = useTranslations('clients');
  const tCommon = useTranslations('common');
  const tDeals = useTranslations('deals');
  const tLeads = useTranslations('leads');
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;

  const [client, setClient] = useState<ClientDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchClient();
  }, [clientId]);

  const fetchClient = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clients/${clientId}`);
      setClient(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'العميل غير موجود');
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async () => {
    try {
      setDeleting(true);
      await api.delete(`/clients/${clientId}`);
      router.push('/clients');
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || 'حدث خطأ');
      setShowDeleteConfirm(false);
    } finally {
      setDeleting(false);
    }
  };

  // عرض اسم العميل
  const getClientName = () => {
    if (!client) return '';
    if (client.firstNameAr && client.lastNameAr) {
      return `${client.firstNameAr} ${client.lastNameAr}`;
    }
    return `${client.firstName} ${client.lastName}`;
  };

  // عرض مرحلة الـ lead
  const getLeadStage = (stage: string) => {
    return tLeads(`stages.${stage}`) || stage;
  };

  // عرض مرحلة الصفقة
  const getDealStage = (stage: string) => {
    return tDeals(`stages.${stage}`) || stage;
  };

  // عرض نوع الصفقة
  const getDealType = (type: string) => {
    return tDeals(`types.${type}`) || type;
  };

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <SkeletonLoader type="detail" />
      </div>
    );
  }

  if (error && !client) {
    return (
      <div className="p-4 md:p-6 text-center">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.push('/clients')}
          className="mt-4 text-blue-600 hover:underline"
        >
          العودة للقائمة
        </button>
      </div>
    );
  }

  if (!client) return null;

  return (
    <div className="p-4 md:p-6">
      {/* العنوان والإجراءات */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/clients')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowRightIcon className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{getClientName()}</h1>
              {client.isVip && (
                <StarIcon className="w-5 h-5 text-yellow-500" />
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {client.clientType === 'company' ? t('types.company') : t('types.individual')}
              {client.companyName && ` • ${client.companyName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PermissionGate permissions={[PERMISSIONS.CLIENTS_WRITE]}>
            <button
              onClick={() => router.push(`/dashboard/clients/${clientId}/edit`)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              <PencilIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('actions.edit')}</span>
            </button>
          </PermissionGate>

          <PermissionGate permissions={[PERMISSIONS.CLIENTS_DELETE]}>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 px-3 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm"
            >
              <TrashIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{t('actions.delete')}</span>
            </button>
          </PermissionGate>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* المعلومات الأساسية */}
        <div className="lg:col-span-2 space-y-6">
          {/* بطاقة التواصل */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4">معلومات التواصل</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <a
                href={`tel:${client.phone}`}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <PhoneIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-xs text-gray-500">الهاتف</p>
                  <p className="font-medium" dir="ltr">{client.phone}</p>
                </div>
              </a>

              {client.phone2 && (
                <a
                  href={`tel:${client.phone2}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <PhoneIcon className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">هاتف إضافي</p>
                    <p className="font-medium" dir="ltr">{client.phone2}</p>
                  </div>
                </a>
              )}

              {client.email && (
                <a
                  href={`mailto:${client.email}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <EnvelopeIcon className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-xs text-gray-500">البريد الإلكتروني</p>
                    <p className="font-medium" dir="ltr">{client.email}</p>
                  </div>
                </a>
              )}

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <BuildingOfficeIcon className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">الجنسية</p>
                  <p className="font-medium">
                    {client.nationality === 'EG' ? 'مصري' : client.nationality}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* الوسوم */}
          {client.tags.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TagIcon className="w-5 h-5" />
                الوسوم
              </h2>
              <div className="flex flex-wrap gap-2">
                {client.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* الملاحظات */}
          {client.notes && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <h2 className="font-semibold text-gray-900 mb-3">ملاحظات</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{client.notes}</p>
            </div>
          )}

          {/* الأنشطة */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <ActivityTimeline
              entityType="client"
              entityId={clientId}
              showHeader={true}
              showAddButton={true}
              onActivityAdded={fetchClient}
            />
          </div>

          {/* الصفقات */}
          {client.deals.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">الصفقات</h2>
                <span className="text-sm text-gray-500">{client.deals.length} صفقة</span>
              </div>
              <div className="space-y-3">
                {client.deals.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium">
                        {getDealType(deal.dealType)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {getDealStage(deal.stage)}
                      </p>
                    </div>
                    <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* العملاء المحتملين */}
          {client.leads.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">العملاء المحتملين</h2>
                <span className="text-sm text-gray-500">{client.leads.length} سجل</span>
              </div>
              <div className="space-y-3">
                {client.leads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                  >
                    <div>
                      <p className="font-medium">{getLeadStage(lead.stage)}</p>
                      {lead.aiScore !== null && (
                        <p className="text-sm text-gray-500">
                          AI Score: {lead.aiScore?.toFixed(0)}
                        </p>
                      )}
                    </div>
                    <ChevronLeftIcon className="w-5 h-5 text-gray-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* الشريط الجانبي */}
        <div className="space-y-6">
          {/* معلومات الإنشاء */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              معلومات النظام
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">{t('createdAt')}</span>
                <span className="font-medium">
                  {new Date(client.createdAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">آخر تحديث</span>
                <span className="font-medium">
                  {new Date(client.updatedAt).toLocaleDateString('ar-EG', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {client.source && (
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('source')}</span>
                  <span className="font-medium">{t(`sources.${client.source}` as any)}</span>
                </div>
              )}
            </div>
          </div>

          {/* إحصائيات */}
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
            <h2 className="font-semibold mb-4">إحصائيات</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-blue-100">الصفقات</span>
                <span className="text-2xl font-bold">{client.deals.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-blue-100">العملاء المحتملين</span>
                <span className="text-2xl font-bold">{client.leads.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* تأكيد الحذف */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
              <h3 className="text-lg font-bold">تأكيد الحذف</h3>
            </div>
            <p className="text-gray-600 mb-6">{t('confirmDelete')}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
                disabled={deleting}
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={deleteClient}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                disabled={deleting}
              >
                {deleting ? 'جاري الحذف...' : tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
