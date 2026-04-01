'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import ActivityTimeline from '@/components/activities/ActivityTimeline';
import {
  LeadStage,
  LEAD_STAGES,
  PropertyType,
  PERMISSIONS,
} from '@realestate/shared-types';

// Types
interface Lead {
  id: string;
  stage: LeadStage;
  source: string | null;
  budget: number | null;
  budgetCurrency: string;
  preferredAreas: string[];
  propertyTypes: PropertyType[];
  minSize: number | null;
  maxSize: number | null;
  minBedrooms: number | null;
  maxBedrooms: number | null;
  notes: string | null;
  aiScore: number | null;
  expectedCloseDate: string | null;
  lostReason: string | null;
  createdAt: string;
  updatedAt: string;
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
  } | null;
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  _count: {
    activities: number;
    viewings: number;
  };
}

// Stage colors
const STAGE_COLORS: Record<LeadStage, { bg: string; border: string; text: string }> = {
  NEW: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  CONTACTED: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700' },
  QUALIFIED: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700' },
  PROPERTY_PRESENTED: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-700' },
  VIEWING_SCHEDULED: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  VIEWED: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
  NEGOTIATING: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  RESERVED: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  CONTRACT_SENT: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  CONTRACT_SIGNED: { bg: 'bg-lime-50', border: 'border-lime-200', text: 'text-lime-700' },
  CLOSED_WON: { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800' },
  CLOSED_LOST: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
};

// AI Score Badge
const AIScoreBadge = ({ score, t }: { score: number | null; t: any }) => {
  if (score === null) return null;
  
  let color = 'bg-gray-100 text-gray-600';
  let label = t('score.cold');
  
  if (score >= 70) {
    color = 'bg-red-100 text-red-700';
    label = `${t('score.hot')} 🔥`;
  } else if (score >= 40) {
    color = 'bg-yellow-100 text-yellow-700';
    label = t('score.warm');
  }
  
  return (
    <span className={`text-sm px-3 py-1 rounded-full ${color}`}>
      {label} {Math.round(score)}%
    </span>
  );
};

export default function LeadDetailsPage() {
  const t = useTranslations('leads');
  const tCommon = useTranslations('common');
  const tProperties = useTranslations('properties');
  const router = useRouter();
  const params = useParams();
  const { user } = useAuthStore();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingStage, setChangingStage] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [selectedStage, setSelectedStage] = useState<LeadStage | null>(null);
  const [lostReason, setLostReason] = useState('');

  const leadId = params.id as string;

  // Fetch lead
  const fetchLead = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/leads/${leadId}`);
      setLead(response.data.data);
    } catch (error) {
      console.error('Failed to fetch lead:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) {
      fetchLead();
    }
  }, [leadId]);

  // Change stage
  const handleChangeStage = async () => {
    if (!selectedStage || !lead) return;

    if (selectedStage === LeadStage.CLOSED_LOST && !lostReason.trim()) {
      return;
    }

    try {
      setChangingStage(true);
      await api.patch(`/leads/${leadId}/stage`, {
        stage: selectedStage,
        reason: selectedStage === LeadStage.CLOSED_LOST ? lostReason : undefined,
      });
      
      setLead({ ...lead, stage: selectedStage, lostReason: selectedStage === LeadStage.CLOSED_LOST ? lostReason : null });
      setShowStageModal(false);
      setSelectedStage(null);
      setLostReason('');
    } catch (error) {
      console.error('Failed to change stage:', error);
    } finally {
      setChangingStage(false);
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

  if (!lead) {
    return (
      <div className="p-4">
        <EmptyState
          title={t('emptyTitle')}
          description={t('emptyDescription')}
          action={{
            label: t('newLead'),
            onClick: () => router.push(`/dashboard/leads/new`),
          }}
        />
      </div>
    );
  }

  const stageColors = STAGE_COLORS[lead.stage];
  const clientName = lead.client
    ? `${lead.client.firstNameAr || lead.client.firstName} ${lead.client.lastNameAr || lead.client.lastName}`
    : t('noClient');

  return (
    <PermissionGate permissions={[PERMISSIONS.LEADS_READ]}>
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/leads')}
            className="text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-2"
          >
            <span>→</span>
            <span>{tCommon('back')}</span>
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
              <p className="text-gray-500 mt-1">{t('leadDetails')}</p>
            </div>

            <div className="flex items-center gap-2">
              {lead.aiScore !== null && <AIScoreBadge score={lead.aiScore} t={t} />}
              
              <PermissionGate permissions={[PERMISSIONS.LEADS_WRITE]}>
                <button
                  onClick={() => router.push(`/dashboard/leads/${leadId}/edit`)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  {tCommon('edit')}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>

        {/* Stage Banner */}
        <div className={`p-4 rounded-lg ${stageColors.bg} border ${stageColors.border} mb-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className={`font-medium ${stageColors.text}`}>
                {t(`stages.${lead.stage}`)}
              </span>
              {lead.client?.isVip && (
                <span className="text-amber-600 text-sm">⭐ VIP</span>
              )}
            </div>

            <PermissionGate permissions={[PERMISSIONS.LEADS_WRITE]}>
              <button
                onClick={() => setShowStageModal(true)}
                className="px-3 py-1 bg-white rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50"
              >
                {t('changeStage')}
              </button>
            </PermissionGate>
          </div>

          {lead.lostReason && (
            <p className="mt-2 text-sm text-red-600">
              {t('lostReason')}: {lead.lostReason}
            </p>
          )}
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Client Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">{t('client')}</h2>
            
            {lead.client ? (
              <div className="space-y-3">
                <div
                  className="cursor-pointer hover:text-primary-600"
                  onClick={() => router.push(`/dashboard/clients/${lead.client!.id}`)}
                >
                  <p className="font-medium">{clientName}</p>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p dir="ltr">{lead.client.phone}</p>
                  {lead.client.phone2 && <p dir="ltr">{lead.client.phone2}</p>}
                  {lead.client.email && <p>{lead.client.email}</p>}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">{t('noClient')}</p>
            )}
          </div>

          {/* Assigned To */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">{t('assignedTo')}</h2>
            
            {lead.assignedTo ? (
              <div className="flex items-center gap-3">
                {lead.assignedTo.avatarUrl ? (
                  <img
                    src={lead.assignedTo.avatarUrl}
                    alt=""
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium">
                    {lead.assignedTo.firstName[0]}
                  </div>
                )}
                <p className="font-medium">
                  {lead.assignedTo.firstName} {lead.assignedTo.lastName}
                </p>
              </div>
            ) : (
              <p className="text-gray-500">{t('unassigned')}</p>
            )}
          </div>

          {/* Budget & Preferences */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">{t('budget')}</h2>
            
            <div className="space-y-3 text-sm">
              {lead.budget && (
                <p>
                  <span className="text-gray-600">{t('budget')}: </span>
                  <span className="font-medium">
                    {lead.budget.toLocaleString('ar-EG')} {lead.budgetCurrency}
                  </span>
                </p>
              )}

              {lead.preferredAreas.length > 0 && (
                <p>
                  <span className="text-gray-600">{t('preferredAreas')}: </span>
                  <span>{lead.preferredAreas.join('، ')}</span>
                </p>
              )}

              {lead.propertyTypes.length > 0 && (
                <p>
                  <span className="text-gray-600">{t('propertyTypes')}: </span>
                  <span>
                    {lead.propertyTypes.map((pt) => tProperties(`types.${pt}`)).join('، ')}
                  </span>
                </p>
              )}

              {(lead.minSize || lead.maxSize) && (
                <p>
                  <span className="text-gray-600">{t('size')}: </span>
                  <span>
                    {lead.minSize || '?'} - {lead.maxSize || '?'} م²
                  </span>
                </p>
              )}

              {(lead.minBedrooms || lead.maxBedrooms) && (
                <p>
                  <span className="text-gray-600">{tProperties('bedrooms')}: </span>
                  <span>
                    {lead.minBedrooms || '?'} - {lead.maxBedrooms || '?'}
                  </span>
                </p>
              )}

              {lead.expectedCloseDate && (
                <p>
                  <span className="text-gray-600">{t('expectedCloseDate')}: </span>
                  <span>{new Date(lead.expectedCloseDate).toLocaleDateString('ar-EG')}</span>
                </p>
              )}
            </div>
          </div>

          {/* Source & Notes */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h2 className="font-medium text-gray-900 mb-4">{t('source')}</h2>
            
            <div className="space-y-3 text-sm">
              {lead.source && (
                <p>
                  <span className="text-gray-600">{t('source')}: </span>
                  <span>{lead.source}</span>
                </p>
              )}

              <p>
                <span className="text-gray-600">{t('createdAt')}: </span>
                <span>{new Date(lead.createdAt).toLocaleDateString('ar-EG')}</span>
              </p>

              {lead.notes && (
                <div className="pt-2">
                  <p className="text-gray-600 mb-1">{t('notes')}:</p>
                  <p className="whitespace-pre-wrap">{lead.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Activities Timeline */}
          <div className="md:col-span-2">
            <ActivityTimeline
              entityType="lead"
              entityId={leadId}
              showHeader={true}
              showAddButton={true}
              onActivityAdded={fetchLead}
            />
          </div>
        </div>

        {/* Stage Change Modal */}
        {showStageModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold mb-4">{t('changeStage')}</h3>

              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {LEAD_STAGES.map((stage) => (
                  <button
                    key={stage}
                    onClick={() => setSelectedStage(stage)}
                    className={`w-full text-right px-4 py-2 rounded-lg border ${
                      selectedStage === stage
                        ? `${STAGE_COLORS[stage].bg} ${STAGE_COLORS[stage].border} ${STAGE_COLORS[stage].text}`
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {t(`stages.${stage}`)}
                  </button>
                ))}
              </div>

              {selectedStage === LeadStage.CLOSED_LOST && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('lostReason')} *
                  </label>
                  <textarea
                    value={lostReason}
                    onChange={(e) => setLostReason(e.target.value)}
                    placeholder={t('lostReasonPlaceholder')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowStageModal(false);
                    setSelectedStage(null);
                    setLostReason('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleChangeStage}
                  disabled={!selectedStage || changingStage || (selectedStage === LeadStage.CLOSED_LOST && !lostReason.trim())}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {changingStage ? tCommon('loading') : tCommon('confirm')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
