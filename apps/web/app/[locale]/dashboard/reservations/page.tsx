'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { EmptyState } from '@/components/shared/EmptyState';
import { PERMISSIONS } from '@realestate/shared-types';

// Types
interface Reservation {
  id: string;
  depositAmount: number;
  depositMethod: string;
  depositPaidAt: string | null;
  expiresAt: string;
  notes: string | null;
  createdAt: string;
  deal: {
    id: string;
    dealType: string;
    stage: string;
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
    } | null;
    assignedBroker: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  };
  propertyLock: {
    id: string;
    lockType: string;
    lockedAt: string;
    expiresAt: string | null;
  } | null;
}

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

// Countdown Timer Component
const CountdownTimer = ({ expiresAt, t }: { expiresAt: string; t: any }) => {
  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft(expiresAt));
  
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(expiresAt));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [expiresAt]);
  
  function calculateTimeLeft(expiresAt: string) {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const difference = expiry - now;
    
    if (difference <= 0) {
      return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    
    return {
      expired: false,
      days: Math.floor(difference / (1000 * 60 * 60 * 24)),
      hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((difference % (1000 * 60)) / 1000),
    };
  }
  
  if (timeLeft.expired) {
    return (
      <span className="text-red-600 font-medium">{t('countdown.expired')}</span>
    );
  }
  
  return (
    <div className="flex items-center gap-1 text-sm">
      <span className="text-gray-500">{t('countdown.expiresIn')}:</span>
      <div className="flex gap-1 font-mono" dir="ltr">
        {timeLeft.days > 0 && (
          <span className="bg-gray-100 px-2 py-0.5 rounded">
            {timeLeft.days} {t('countdown.days')}
          </span>
        )}
        <span className="bg-gray-100 px-2 py-0.5 rounded">
          {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
        </span>
      </div>
    </div>
  );
};

// Status Badge
const StatusBadge = ({ reservation, t }: { reservation: Reservation; t: any }) => {
  const now = new Date().getTime();
  const expiry = new Date(reservation.expiresAt).getTime();
  const isExpired = expiry <= now;
  
  let status = 'active';
  let color = 'bg-green-100 text-green-800';
  
  if (isExpired) {
    status = 'expired';
    color = 'bg-gray-100 text-gray-800';
  } else if (reservation.deal.stage === 'CONTRACT_SIGNED' || reservation.deal.stage === 'PAYMENT_ACTIVE') {
    status = 'converted';
    color = 'bg-blue-100 text-blue-800';
  }
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${color}`}>
      {t(`statuses.${status}`)}
    </span>
  );
};

// Lock Type Badge
const LockTypeBadge = ({ lockType, t }: { lockType: string | null; t: any }) => {
  if (!lockType) return null;
  
  const colors: Record<string, string> = {
    temporary: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
  };
  
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[lockType] || 'bg-gray-100 text-gray-800'}`}>
      {t(`lockTypes.${lockType}`)}
    </span>
  );
};

export default function ReservationsPage() {
  const t = useTranslations('reservations');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'temporary' | 'confirmed'>('all');
  
  // Fetch reservations
  const fetchReservations = useCallback(async () => {
    try {
      setLoading(true);
      // We'll get reservations through the deals endpoint with stage filter
      const response = await api.get('/deals', {
        params: {
          stage: 'RESERVATION',
          limit: 100,
        },
      });
      
      // Transform deals with reservations
      const dealsWithReservations = (response.data.data || [])
        .filter((deal: any) => deal.reservation)
        .map((deal: any) => ({
          ...deal.reservation,
          deal: deal,
          propertyLock: deal.property?.lock || null,
        }));
      
      setReservations(dealsWithReservations);
    } catch (error) {
      console.error('Failed to fetch reservations:', error);
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchReservations();
  }, [fetchReservations]);
  
  // Filter reservations
  const filteredReservations = reservations.filter((r) => {
    // Search filter
    if (search) {
      const clientName = r.deal.client 
        ? `${r.deal.client.firstNameAr || r.deal.client.firstName} ${r.deal.client.lastNameAr || r.deal.client.lastName}`
        : '';
      const propertyName = r.deal.property 
        ? r.deal.property.titleAr || r.deal.property.title
        : '';
      
      if (!clientName.includes(search) && !propertyName.includes(search)) {
        return false;
      }
    }
    
    // Status filter
    if (statusFilter !== 'all') {
      const now = new Date().getTime();
      const expiry = new Date(r.expiresAt).getTime();
      const isExpired = expiry <= now;
      
      if (statusFilter === 'active' && isExpired) return false;
      if (statusFilter === 'expired' && !isExpired) return false;
      if (statusFilter === 'temporary' && r.propertyLock?.lockType !== 'temporary') return false;
      if (statusFilter === 'confirmed' && r.propertyLock?.lockType !== 'confirmed') return false;
    }
    
    return true;
  });
  
  // Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  
  // Stats
  const stats = {
    total: reservations.length,
    active: reservations.filter((r) => new Date(r.expiresAt).getTime() > Date.now()).length,
    expired: reservations.filter((r) => new Date(r.expiresAt).getTime() <= Date.now()).length,
    totalDeposit: reservations.reduce((sum, r) => sum + r.depositAmount, 0),
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
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="active">{t('filters.active')}</option>
                <option value="expired">{t('filters.expired')}</option>
                <option value="temporary">{t('filters.temporary')}</option>
                <option value="confirmed">{t('filters.confirmed')}</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{t('stats.total')}</p>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{t('stats.active')}</p>
            <p className="text-2xl font-bold text-green-700">{stats.active}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{t('stats.expired')}</p>
            <p className="text-2xl font-bold text-gray-600">{stats.expired}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{t('stats.totalDeposit')}</p>
            <p className="text-2xl font-bold text-primary-700">{stats.totalDeposit.toLocaleString('ar-EG')} ج.م</p>
          </div>
        </div>
        
        {/* Reservations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredReservations.length === 0 ? (
            <EmptyState
              title={t('emptyTitle')}
              description={t('emptyDescription')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReservations.map((reservation) => {
                const clientName = reservation.deal.client
                  ? `${reservation.deal.client.firstNameAr || reservation.deal.client.firstName} ${reservation.deal.client.lastNameAr || reservation.deal.client.lastName}`
                  : t('noClient');
                  
                const propertyName = reservation.deal.property
                  ? reservation.deal.property.titleAr || reservation.deal.property.title
                  : t('noProperty');
                  
                const isExpired = new Date(reservation.expiresAt).getTime() <= Date.now();
                
                return (
                  <div
                    key={reservation.id}
                    onClick={() => router.push(`/dashboard/deals/${reservation.deal.id}`)}
                    className={`bg-white rounded-lg border p-4 cursor-pointer hover:shadow-md transition-shadow ${
                      isExpired ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{clientName}</h3>
                        {reservation.deal.client?.isVip && (
                          <span className="text-xs text-amber-600">⭐ VIP</span>
                        )}
                      </div>
                      <StatusBadge reservation={reservation} t={t} />
                    </div>
                    
                    {/* Property */}
                    <p className="text-sm text-gray-500 mb-2 truncate">
                      🏠 {propertyName}
                    </p>
                    
                    {/* Location */}
                    {reservation.deal.property && (
                      <p className="text-xs text-gray-400 mb-3">
                        📍 {reservation.deal.property.city}
                        {reservation.deal.property.district && `، ${reservation.deal.property.district}`}
                      </p>
                    )}
                    
                    {/* Deposit & Lock Type */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs text-gray-500">{t('fields.depositAmount')}</p>
                        <p className="font-semibold text-gray-900">
                          {reservation.depositAmount.toLocaleString('ar-EG')} ج.م
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-gray-500">{t('fields.depositMethod')}</p>
                        <p className="text-sm text-gray-700">
                          {PAYMENT_METHODS[reservation.depositMethod] || reservation.depositMethod}
                        </p>
                      </div>
                    </div>
                    
                    {/* Lock Type */}
                    {reservation.propertyLock && (
                      <div className="mb-3">
                        <LockTypeBadge lockType={reservation.propertyLock.lockType} t={t} />
                      </div>
                    )}
                    
                    {/* Countdown */}
                    {!isExpired && (
                      <div className="pt-3 border-t border-gray-100">
                        <CountdownTimer expiresAt={reservation.expiresAt} t={t} />
                      </div>
                    )}
                    
                    {/* Expiry Info */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                      <div>
                        <span>تاريخ الحجز: </span>
                        <span>{formatDate(reservation.createdAt)}</span>
                      </div>
                      <div className="text-left">
                        <span>ينتهي: </span>
                        <span className={isExpired ? 'text-red-600' : ''}>{formatDate(reservation.expiresAt)}</span>
                      </div>
                    </div>
                    
                    {/* Assigned Broker */}
                    {reservation.deal.assignedBroker && (
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs text-primary-700">
                          {reservation.deal.assignedBroker.firstName[0]}
                        </div>
                        <span className="text-xs text-gray-500">
                          {reservation.deal.assignedBroker.firstName} {reservation.deal.assignedBroker.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PermissionGate>
  );
}
