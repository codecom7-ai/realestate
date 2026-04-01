'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { 
  LeadStage, 
  LEAD_STAGES, 
  LEAD_STAGE_NAMES_AR,
  PERMISSIONS 
} from '@realestate/shared-types';

// Types
interface Lead {
  id: string;
  stage: LeadStage;
  source: string | null;
  budget: number | null;
  budgetCurrency: string;
  preferredAreas: string[];
  propertyTypes: string[];
  aiScore: number | null;
  createdAt: string;
  updatedAt: string;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    phone: string;
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

interface LeadsByStage {
  [key: string]: Lead[];
}

// Stage colors (RTL-friendly)
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
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {label} {Math.round(score)}%
    </span>
  );
};

// Lead Card Component - Responsive Design
const LeadCard = ({ lead, onDragStart }: { lead: Lead; onDragStart: (e: React.DragEvent, lead: Lead) => void }) => {
  const t = useTranslations('leads');
  const router = useRouter();
  
  const clientName = lead.client
    ? (lead.client.firstNameAr || lead.client.firstName) + ' ' + (lead.client.lastNameAr || lead.client.lastName)
    : t('noClient');
    
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
      className="bg-white rounded-lg border border-gray-200 p-2.5 xs:p-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98] min-h-[44px] touch-manipulation"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5 xs:gap-2 mb-1.5 xs:mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate text-xs xs:text-sm">{clientName}</h3>
          {lead.client?.isVip && (
            <span className="text-[10px] xs:text-xs text-amber-600">⭐ VIP</span>
          )}
        </div>
        {lead.aiScore !== null && (
          <AIScoreBadge score={lead.aiScore} t={t} />
        )}
      </div>
      
      {/* Client Phone */}
      {lead.client && (
        <p className="text-[10px] xs:text-sm text-gray-500 mb-1.5 xs:mb-2" dir="ltr">{lead.client.phone}</p>
      )}
      
      {/* Budget & Areas */}
      <div className="space-y-0.5 xs:space-y-1 text-[10px] xs:text-sm">
        {lead.budget && (
          <p className="text-gray-600">
            💰 {lead.budget.toLocaleString('ar-EG')} {lead.budgetCurrency}
          </p>
        )}
        {lead.preferredAreas.length > 0 && (
          <p className="text-gray-600 text-[10px] truncate">
            📍 {lead.preferredAreas.slice(0, 2).join('، ')}
          </p>
        )}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-2 xs:mt-3 pt-1.5 xs:pt-2 border-t border-gray-100">
        {lead.assignedTo ? (
          <div className="flex items-center gap-1">
            {lead.assignedTo.avatarUrl ? (
              <img 
                src={lead.assignedTo.avatarUrl} 
                alt="" 
                className="w-4 h-4 xs:w-5 xs:h-5 rounded-full"
              />
            ) : (
              <div className="w-4 h-4 xs:w-5 xs:h-5 rounded-full bg-primary-100 flex items-center justify-center text-[8px] xs:text-xs text-primary-700">
                {lead.assignedTo.firstName[0]}
              </div>
            )}
            <span className="text-[10px] xs:text-xs text-gray-500">
              {lead.assignedTo.firstName}
            </span>
          </div>
        ) : (
          <span className="text-[10px] xs:text-xs text-gray-400">{t('unassigned')}</span>
        )}
        <span className="text-[10px] xs:text-xs text-gray-400">
          {lead._count.activities + lead._count.viewings} {t('activities')}
        </span>
      </div>
    </div>
  );
};

// Stage Column Component - Responsive Design
const StageColumn = ({ 
  stage, 
  leads, 
  onDragStart, 
  onDragOver, 
  onDrop,
  isOver 
}: { 
  stage: LeadStage;
  leads: Lead[];
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: LeadStage) => void;
  isOver: boolean;
}) => {
  const tStages = useTranslations('leads.stages');
  const tLeads = useTranslations('leads');
  const colors = STAGE_COLORS[stage];
  
  return (
    <div 
      className={`flex-shrink-0 w-[260px] xs:w-[280px] md:w-[300px] ${colors.bg} rounded-lg ${isOver ? 'ring-2 ring-primary-400' : ''}`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      {/* Stage Header */}
      <div className={`px-2.5 xs:px-3 py-1.5 xs:py-2 border-b ${colors.border} flex items-center justify-between`}>
        <h3 className={`font-medium text-xs xs:text-sm ${colors.text}`}>
          {tStages(stage)}
        </h3>
        <span className={`text-[10px] xs:text-sm ${colors.text} bg-white px-1.5 xs:px-2 py-0.5 rounded-full`}>
          {leads.length}
        </span>
      </div>
      
      {/* Leads List */}
      <div className="p-1.5 xs:p-2 space-y-1.5 xs:space-y-2 min-h-[150px] xs:min-h-[200px] max-h-[calc(100vh-260px)] md:max-h-[calc(100vh-280px)] overflow-y-auto">
        {leads.map((lead) => (
          <LeadCard 
            key={lead.id} 
            lead={lead} 
            onDragStart={onDragStart}
          />
        ))}
        {leads.length === 0 && (
          <div className="text-center text-gray-400 py-6 xs:py-8 text-[10px] xs:text-sm">
            {tLeads('emptyTitle')}
          </div>
        )}
      </div>
    </div>
  );
};

export default function LeadsPage() {
  const t = useTranslations('leads');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null);
  const [overStage, setOverStage] = useState<LeadStage | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  
  // Fetch leads
  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', '100');
      
      const response = await api.get(`/leads?${params.toString()}`);
      setLeads(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);
  
  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);
  
  // Group leads by stage
  const leadsByStage: LeadsByStage = LEAD_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter((lead) => lead.stage === stage);
    return acc;
  }, {} as LeadsByStage);
  
  // Drag handlers
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDragEnter = (stage: LeadStage) => {
    setOverStage(stage);
  };
  
  const handleDragLeave = () => {
    setOverStage(null);
  };
  
  const handleDrop = async (e: React.DragEvent, newStage: LeadStage) => {
    e.preventDefault();
    setOverStage(null);
    
    if (!draggedLead || draggedLead.stage === newStage) {
      setDraggedLead(null);
      return;
    }
    
    // Optimistic update
    const oldStage = draggedLead.stage;
    setLeads((prev) => 
      prev.map((l) => 
        l.id === draggedLead.id ? { ...l, stage: newStage } : l
      )
    );
    
    try {
      await api.patch(`/leads/${draggedLead.id}/stage`, {
        stage: newStage,
      });
    } catch (error: any) {
      // Revert on error
      setLeads((prev) => 
        prev.map((l) => 
          l.id === draggedLead.id ? { ...l, stage: oldStage } : l
        )
      );
      console.error('Failed to update stage:', error);
    }
    
    setDraggedLead(null);
  };
  
  if (loading) {
    return (
      <div className="p-3 xs:p-4">
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 gap-3 xs:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <PermissionGate permissions={[PERMISSIONS.LEADS_READ]}>
      <div className="h-full flex flex-col">
        {/* Header - Responsive */}
        <div className="bg-white border-b border-gray-200 px-3 xs:px-4 py-2 xs:py-3">
          <div className="flex flex-col gap-2 xs:gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-base xs:text-lg sm:text-xl font-bold text-gray-900">{t('title')}</h1>
            
            <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-2 xs:gap-2">
              {/* Search */}
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-2.5 xs:px-3 py-2 border border-gray-200 rounded-lg text-xs xs:text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full xs:w-40 sm:w-48 md:w-64 min-h-[44px]"
              />
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 xs:p-1">
                <button
                  onClick={() => setView('kanban')}
                  className={`flex-1 xs:flex-none px-2 xs:px-3 py-1.5 xs:py-1 text-[10px] xs:text-sm rounded-md transition-colors min-h-[36px] xs:min-h-[auto] ${
                    view === 'kanban' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
                  }`}
                >
                  {t('pipeline')}
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`flex-1 xs:flex-none px-2 xs:px-3 py-1.5 xs:py-1 text-[10px] xs:text-sm rounded-md transition-colors min-h-[36px] xs:min-h-[auto] ${
                    view === 'list' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
                  }`}
                >
                  {t('list')}
                </button>
              </div>
              
              {/* New Lead Button */}
              <PermissionGate permissions={[PERMISSIONS.LEADS_WRITE]}>
                <button
                  onClick={() => router.push(`/dashboard/leads/new`)}
                  className="px-3 xs:px-4 py-2 bg-primary-600 text-white rounded-lg text-xs xs:text-sm font-medium hover:bg-primary-700 transition-colors min-h-[44px]"
                >
                  + {t('newLead')}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
        
        {/* Kanban Board */}
        {view === 'kanban' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-2 xs:gap-3 md:gap-4 p-2 xs:p-3 md:p-4 h-full min-w-max">
              {LEAD_STAGES.map((stage) => (
                <div
                  key={stage}
                  onDragEnter={() => handleDragEnter(stage)}
                  onDragLeave={handleDragLeave}
                >
                  <StageColumn
                    stage={stage}
                    leads={leadsByStage[stage] || []}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    isOver={overStage === stage}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* List View - Responsive */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-2 xs:p-3 md:p-4">
            {leads.length === 0 ? (
              <EmptyState
                title={t('emptyTitle')}
                description={t('emptyDescription')}
                action={{
                  label: t('newLead'),
                  onClick: () => router.push(`/dashboard/leads/new`),
                }}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Mobile Card View */}
                <div className="sm:hidden divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <div 
                      key={lead.id}
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                      className="p-3 hover:bg-gray-50 cursor-pointer active:bg-gray-100"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {lead.client 
                              ? `${lead.client.firstNameAr || lead.client.firstName} ${lead.client.lastNameAr || lead.client.lastName}`
                              : t('noClient')
                            }
                          </p>
                          {lead.client && (
                            <p className="text-xs text-gray-500" dir="ltr">{lead.client.phone}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${STAGE_COLORS[lead.stage].bg} ${STAGE_COLORS[lead.stage].text}`}>
                          {t(`stages.${lead.stage}`)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {lead.budget && (
                          <span>{lead.budget.toLocaleString('ar-EG')} {lead.budgetCurrency}</span>
                        )}
                        {lead.aiScore !== null && <AIScoreBadge score={lead.aiScore} t={t} />}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.client')}</th>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.stage')}</th>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.budget')}</th>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.assignedTo')}</th>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.aiScore')}</th>
                        <th className="text-right px-3 md:px-4 py-2.5 md:py-3 text-xs font-medium text-gray-600">{t('table.activities')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {leads.map((lead) => (
                        <tr 
                          key={lead.id}
                          onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                          className="hover:bg-gray-50 cursor-pointer"
                        >
                          <td className="px-3 md:px-4 py-2.5 md:py-3">
                            <div>
                              <p className="font-medium text-gray-900 text-xs md:text-sm">
                                {lead.client 
                                  ? `${lead.client.firstNameAr || lead.client.firstName} ${lead.client.lastNameAr || lead.client.lastName}`
                                  : t('noClient')
                                }
                              </p>
                              {lead.client && (
                                <p className="text-xs text-gray-500" dir="ltr">{lead.client.phone}</p>
                              )}
                            </div>
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs ${STAGE_COLORS[lead.stage].bg} ${STAGE_COLORS[lead.stage].text}`}>
                              {t(`stages.${lead.stage}`)}
                            </span>
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">
                            {lead.budget ? `${lead.budget.toLocaleString('ar-EG')} ${lead.budgetCurrency}` : '-'}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">
                            {lead.assignedTo ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}` : t('unassigned')}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3">
                            {lead.aiScore !== null && <AIScoreBadge score={lead.aiScore} t={t} />}
                          </td>
                          <td className="px-3 md:px-4 py-2.5 md:py-3 text-xs md:text-sm text-gray-600">
                            {lead._count.activities + lead._count.viewings}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
