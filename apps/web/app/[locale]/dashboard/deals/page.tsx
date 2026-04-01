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
  client: {
    id: string;
    firstName: string;
    lastName: string;
    firstNameAr: string | null;
    lastNameAr: string | null;
    phone: string;
    isVip: boolean;
  } | null;
  property: {
    id: string;
    title: string;
    titleAr: string | null;
    city: string;
    district: string | null;
    askingPrice: number;
    currency: string;
    propertyType: string;
  } | null;
  assignedBroker: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
  } | null;
  reservation: {
    id: string;
    depositAmount: number;
    expiresAt: string;
  } | null;
  _count: {
    activities: number;
    documents: number;
  };
}

interface DealsByStage {
  [key: string]: Deal[];
}

// Stage colors (RTL-friendly)
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

// Deal Type Badge
const DealTypeBadge = ({ type, t }: { type: string; t: any }) => {
  const colors: Record<string, string> = {
    sale: 'bg-green-100 text-green-700',
    rent: 'bg-blue-100 text-blue-700',
    management: 'bg-purple-100 text-purple-700',
  };
  
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[type] || 'bg-gray-100 text-gray-700'}`}>
      {t(`types.${type}`)}
    </span>
  );
};

// Deal Card Component
const DealCard = ({ deal, onDragStart }: { deal: Deal; onDragStart: (e: React.DragEvent, deal: Deal) => void }) => {
  const t = useTranslations('deals');
  const router = useRouter();
  
  const clientName = deal.client
    ? (deal.client.firstNameAr || deal.client.firstName) + ' ' + (deal.client.lastNameAr || deal.client.lastName)
    : t('noClient');
    
  const propertyTitle = deal.property
    ? deal.property.titleAr || deal.property.title
    : t('noProperty');
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, deal)}
      onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
      className="bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{clientName}</h3>
          {deal.client?.isVip && (
            <span className="text-xs text-amber-600">⭐ VIP</span>
          )}
        </div>
        <DealTypeBadge type={deal.dealType} t={t} />
      </div>
      
      {/* Property */}
      <p className="text-sm text-gray-500 mb-2 truncate">
        🏠 {propertyTitle}
      </p>
      
      {/* Price */}
      {deal.agreedPrice && (
        <p className="text-sm font-semibold text-green-700 mb-2">
          💰 {deal.agreedPrice.toLocaleString('ar-EG')} {deal.currency}
        </p>
      )}
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
        {deal.assignedBroker ? (
          <div className="flex items-center gap-1">
            {deal.assignedBroker.avatarUrl ? (
              <img 
                src={deal.assignedBroker.avatarUrl} 
                alt="" 
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-700">
                {deal.assignedBroker.firstName[0]}
              </div>
            )}
            <span className="text-xs text-gray-500">
              {deal.assignedBroker.firstName}
            </span>
          </div>
        ) : (
          <span className="text-xs text-gray-400">{t('unassigned')}</span>
        )}
        <span className="text-xs text-gray-400">
          📎 {deal._count.documents}
        </span>
      </div>
    </div>
  );
};

// Stage Column Component
const StageColumn = ({ 
  stage, 
  deals, 
  onDragStart, 
  onDragOver, 
  onDrop,
  isOver 
}: { 
  stage: DealStage;
  deals: Deal[];
  onDragStart: (e: React.DragEvent, deal: Deal) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stage: DealStage) => void;
  isOver: boolean;
}) => {
  const tStages = useTranslations('deals.stages');
  const tDeals = useTranslations('deals');
  const colors = STAGE_COLORS[stage];
  
  // Calculate total value for this stage
  const totalValue = deals.reduce((sum, d) => sum + (d.agreedPrice || 0), 0);
  
  return (
    <div 
      className={`flex-shrink-0 w-[280px] md:w-[300px] ${colors.bg} rounded-lg ${isOver ? 'ring-2 ring-primary-400' : ''}`}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage)}
    >
      {/* Stage Header */}
      <div className={`px-3 py-2 border-b ${colors.border} flex items-center justify-between`}>
        <h3 className={`font-medium ${colors.text}`}>
          {tStages(stage)}
        </h3>
        <div className="flex items-center gap-2">
          <span className={`text-sm ${colors.text} bg-white px-2 py-0.5 rounded-full`}>
            {deals.length}
          </span>
        </div>
      </div>
      
      {/* Total Value */}
      {totalValue > 0 && (
        <div className={`px-3 py-1.5 text-xs ${colors.text} border-b ${colors.border}`}>
          إجمالي: {totalValue.toLocaleString('ar-EG')} ج.م
        </div>
      )}
      
      {/* Deals List */}
      <div className="p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-340px)] overflow-y-auto">
        {deals.map((deal) => (
          <DealCard 
            key={deal.id} 
            deal={deal} 
            onDragStart={onDragStart}
          />
        ))}
        {deals.length === 0 && (
          <div className="text-center text-gray-400 py-8 text-sm">
            {tDeals('emptyTitle')}
          </div>
        )}
      </div>
    </div>
  );
};

export default function DealsPage() {
  const t = useTranslations('deals');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedDeal, setDraggedDeal] = useState<Deal | null>(null);
  const [overStage, setOverStage] = useState<DealStage | null>(null);
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  
  // Fetch deals
  const fetchDeals = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (stageFilter !== 'all') params.set('stage', stageFilter);
      if (typeFilter !== 'all') params.set('dealType', typeFilter);
      params.set('limit', '100');
      
      const response = await api.get(`/deals?${params.toString()}`);
      setDeals(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch deals:', error);
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, typeFilter]);
  
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);
  
  // Group deals by stage
  const dealsByStage: DealsByStage = DEAL_STAGES.reduce((acc, stage) => {
    acc[stage] = deals.filter((deal) => deal.stage === stage);
    return acc;
  }, {} as DealsByStage);
  
  // Drag handlers
  const handleDragStart = (e: React.DragEvent, deal: Deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  
  const handleDragEnter = (stage: DealStage) => {
    setOverStage(stage);
  };
  
  const handleDragLeave = () => {
    setOverStage(null);
  };
  
  const handleDrop = async (e: React.DragEvent, newStage: DealStage) => {
    e.preventDefault();
    setOverStage(null);
    
    if (!draggedDeal || draggedDeal.stage === newStage) {
      setDraggedDeal(null);
      return;
    }
    
    // Optimistic update
    const oldStage = draggedDeal.stage;
    setDeals((prev) => 
      prev.map((d) => 
        d.id === draggedDeal.id ? { ...d, stage: newStage } : d
      )
    );
    
    try {
      await api.patch(`/deals/${draggedDeal.id}/stage`, {
        stage: newStage,
      });
    } catch (error: any) {
      // Revert on error
      setDeals((prev) => 
        prev.map((d) => 
          d.id === draggedDeal.id ? { ...d, stage: oldStage } : d
        )
      );
      console.error('Failed to update stage:', error);
    }
    
    setDraggedDeal(null);
  };
  
  if (loading) {
    return (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }
  
  return (
    <PermissionGate permissions={[PERMISSIONS.DEALS_READ]}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('title')}</h1>
              <p className="text-sm text-gray-500">{t('subtitle')}</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              {/* Search */}
              <input
                type="text"
                placeholder={t('searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent w-48"
              />
              
              {/* Stage Filter */}
              <select
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('filters.all')}</option>
                {DEAL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {DEAL_STAGE_NAMES_AR[stage]}
                  </option>
                ))}
              </select>
              
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="sale">{t('types.sale')}</option>
                <option value="rent">{t('types.rent')}</option>
                <option value="management">{t('types.management')}</option>
              </select>
              
              {/* View Toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setView('kanban')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view === 'kanban' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
                  }`}
                >
                  {t('kanban')}
                </button>
                <button
                  onClick={() => setView('list')}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    view === 'list' ? 'bg-white shadow text-primary-700' : 'text-gray-600'
                  }`}
                >
                  {t('list')}
                </button>
              </div>
              
              {/* New Deal Button */}
              <PermissionGate permissions={[PERMISSIONS.DEALS_WRITE]}>
                <button
                  onClick={() => router.push('/dashboard/deals/new')}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                >
                  + {t('newDeal')}
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
        
        {/* Kanban Board */}
        {view === 'kanban' && (
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-4 p-4 h-full min-w-max">
              {DEAL_STAGES.map((stage) => (
                <div
                  key={stage}
                  onDragEnter={() => handleDragEnter(stage)}
                  onDragLeave={handleDragLeave}
                >
                  <StageColumn
                    stage={stage}
                    deals={dealsByStage[stage] || []}
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
        
        {/* List View */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto p-4">
            {deals.length === 0 ? (
              <EmptyState
                title={t('emptyTitle')}
                description={t('emptyDescription')}
                action={{
                  label: t('newDeal'),
                  onClick: () => router.push('/dashboard/deals/new'),
                }}
              />
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.client')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.property')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.type')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.stage')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.price')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.broker')}</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deals.map((deal) => (
                      <tr 
                        key={deal.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">
                              {deal.client 
                                ? `${deal.client.firstNameAr || deal.client.firstName} ${deal.client.lastNameAr || deal.client.lastName}`
                                : t('noClient')
                              }
                            </p>
                            {deal.client && (
                              <p className="text-sm text-gray-500" dir="ltr">{deal.client.phone}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-gray-600 truncate max-w-[200px]">
                            {deal.property ? (deal.property.titleAr || deal.property.title) : t('noProperty')}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <DealTypeBadge type={deal.dealType} t={t} />
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${STAGE_COLORS[deal.stage].bg} ${STAGE_COLORS[deal.stage].text}`}>
                            {t(`stages.${deal.stage}`)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {deal.agreedPrice ? `${deal.agreedPrice.toLocaleString('ar-EG')} ${deal.currency}` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {deal.assignedBroker ? `${deal.assignedBroker.firstName} ${deal.assignedBroker.lastName}` : t('unassigned')}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/dashboard/deals/${deal.id}`)}
                              className="text-primary-600 hover:text-primary-700 text-sm"
                            >
                              {t('actions.view')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
