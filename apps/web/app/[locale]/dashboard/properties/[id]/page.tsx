'use client';

// ═══════════════════════════════════════════════════════════════
// Property Details Page - صفحة تفاصيل العقار
// World-Class UI/UX Design
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowRightIcon,
  PencilIcon,
  TrashIcon,
  LockClosedIcon,
  LockOpenIcon,
  MapPinIcon,
  HomeIcon,
  ShareIcon,
  DocumentDuplicateIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  BuildingOfficeIcon,
  CubeIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ChevronDownIcon,
  XMarkIcon,
  ArrowsPointingOutIcon,
  HeartIcon,
  EyeIcon,
  SparklesIcon,
  CheckBadgeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  DocumentTextIcon,
  MapIcon,
  HomeModernIcon,
} from '@heroicons/react/24/outline';
import { BedIcon, BathIcon } from '@/components/icons/CustomIcons';
import { HeartIcon as HeartSolidIcon, CheckCircleIcon } from '@heroicons/react/24/solid';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import ActivityTimeline from '@/components/activities/ActivityTimeline';
import AddActivityForm from '@/components/activities/AddActivityForm';
import { PERMISSIONS, PropertyType, PropertyStatus, FinishingType } from '@realestate/shared-types';

interface Property {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  finishingType?: FinishingType;
  city: string;
  district?: string;
  address?: string;
  floor?: number;
  unitNumber?: string;
  areaM2: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  askingPrice: number;
  currency: string;
  commissionRate?: number;
  isListed: boolean;
  isOffPlan: boolean;
  images: { id: string; url: string; isPrimary: boolean }[];
  priceHistory: { id: string; oldPrice: number; newPrice: number; changedAt: string }[];
  createdAt: string;
  updatedAt: string;
  viewCount?: number;
  lock?: {
    id: string;
    dealId: string;
    lockType: string;
    expiresAt?: string;
    deal?: {
      id: string;
      title: string;
    };
  } | null;
}

// ═══════════════════════════════════════════════════════════════
// Fullscreen Gallery Modal
// ═══════════════════════════════════════════════════════════════
interface GalleryModalProps {
  images: { id: string; url: string; isPrimary: boolean }[];
  initialIndex: number;
  onClose: () => void;
}

function GalleryModal({ images, initialIndex, onClose }: GalleryModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [scale, setScale] = useState(1);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setScale(1);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setScale(1);
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.5, 3));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.5, 1));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') prevImage();
      if (e.key === 'ArrowLeft') nextImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center animate-fade-in">
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 left-4 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
      >
        <XMarkIcon className="w-6 h-6 text-white" />
      </button>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        <button
          onClick={zoomOut}
          disabled={scale <= 1}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-white font-bold">−</span>
        </button>
        <span className="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
        <button
          onClick={zoomIn}
          disabled={scale >= 3}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="text-white font-bold">+</span>
        </button>
      </div>

      {/* Image Counter */}
      <div className="absolute bottom-4 right-4 z-10 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm font-medium">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Navigation Arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
          >
            <ChevronRightIcon className="w-8 h-8 text-white" />
          </button>
          <button
            onClick={nextImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all duration-200 hover:scale-110"
          >
            <ChevronLeftIcon className="w-8 h-8 text-white" />
          </button>
        </>
      )}

      {/* Main Image */}
      <div className="w-full h-full flex items-center justify-center p-16 overflow-hidden">
        <img
          src={images[currentIndex]?.url}
          alt=""
          className="max-w-full max-h-full object-contain transition-transform duration-300"
          style={{ transform: `scale(${scale})` }}
        />
      </div>

      {/* Thumbnails Strip */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-2 max-w-[80vw] overflow-x-auto pb-2">
        {images.map((image, idx) => (
          <button
            key={image.id}
            onClick={() => setCurrentIndex(idx)}
            className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all duration-200 ${
              idx === currentIndex
                ? 'border-white scale-110 shadow-lg'
                : 'border-transparent opacity-50 hover:opacity-100'
            }`}
          >
            <img src={image.url} alt="" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Status Timeline Component
// ═══════════════════════════════════════════════════════════════
interface StatusTimelineProps {
  currentStatus: PropertyStatus;
  createdAt: string;
  lock?: Property['lock'];
}

function StatusTimeline({ currentStatus, createdAt, lock }: StatusTimelineProps) {
  const statusSteps = [
    { key: 'CREATED', label: 'تم الإضافة', icon: HomeIcon },
    { key: 'AVAILABLE', label: 'متاح', icon: CheckBadgeIcon },
    { key: 'RESERVED', label: 'محجوز', icon: LockClosedIcon },
    { key: 'SOLD', label: 'مباع', icon: CheckCircleIcon },
  ];

  const getStepStatus = (stepKey: string) => {
    if (stepKey === 'CREATED') return 'completed';
    if (stepKey === 'AVAILABLE' && currentStatus === 'AVAILABLE') return 'current';
    if (stepKey === 'AVAILABLE' && ['RESERVED_TEMP', 'RESERVED_CONFIRMED', 'SOLD', 'RENTED'].includes(currentStatus)) return 'completed';
    if (stepKey === 'RESERVED' && ['RESERVED_TEMP', 'RESERVED_CONFIRMED'].includes(currentStatus)) return 'current';
    if (stepKey === 'RESERVED' && ['SOLD', 'RENTED'].includes(currentStatus)) return 'completed';
    if (stepKey === 'SOLD' && currentStatus === 'SOLD') return 'current';
    return 'pending';
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between">
        {statusSteps.map((step, index) => {
          const stepStatus = getStepStatus(step.key);
          const Icon = step.icon;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              {/* Step Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    stepStatus === 'completed'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : stepStatus === 'current'
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 animate-pulse'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    stepStatus === 'completed'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : stepStatus === 'current'
                      ? 'text-primary-600 dark:text-primary-400'
                      : 'text-gray-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < statusSteps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${
                    getStepStatus(statusSteps[index + 1].key) !== 'pending'
                      ? 'bg-emerald-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Price History Chart Component
// ═══════════════════════════════════════════════════════════════
interface PriceHistoryChartProps {
  priceHistory: Property['priceHistory'];
  currentPrice: number;
  currency: string;
  formatPrice: (price: number, currency: string) => string;
}

function PriceHistoryChart({ priceHistory, currentPrice, currency, formatPrice }: PriceHistoryChartProps) {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>لا يوجد سجل للأسعار</p>
      </div>
    );
  }

  const allPrices = [...priceHistory.map(h => h.oldPrice), ...priceHistory.map(h => h.newPrice), currentPrice];
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  return (
    <div className="space-y-4">
      {priceHistory.map((history, index) => {
        const changePercent = ((history.newPrice - history.oldPrice) / history.oldPrice * 100).toFixed(1);
        const isIncrease = history.newPrice > history.oldPrice;

        return (
          <div
            key={history.id}
            className="relative p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700"
          >
            {/* Visual Bar */}
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                  style={{ width: `${((history.oldPrice - minPrice) / priceRange) * 100}%` }}
                />
              </div>
              <span className={`flex items-center text-sm font-semibold ${isIncrease ? 'text-red-500' : 'text-emerald-500'}`}>
                {isIncrease ? <ArrowRightIcon className="w-4 h-4 rotate-180" /> : <ArrowRightIcon className="w-4 h-4" />}
                {changePercent}%
              </span>
              <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${((history.newPrice - minPrice) / priceRange) * 100}%` }}
                />
              </div>
            </div>

            {/* Price Details */}
            <div className="flex items-center justify-between text-sm">
              <div className="text-gray-500 dark:text-gray-400">
                <span className="line-through">{formatPrice(history.oldPrice, currency)}</span>
              </div>
              <div className="flex items-center gap-1 text-gray-400">
                <CalendarDaysIcon className="w-4 h-4" />
                {new Date(history.changedAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
              <div className="font-bold text-primary-600 dark:text-primary-400">
                {formatPrice(history.newPrice, currency)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Property Details Component
// ═══════════════════════════════════════════════════════════════
export default function PropertyDetailsPage() {
  const t = useTranslations('properties');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const params = useParams();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [activeSection, setActiveSection] = useState<'overview' | 'price' | 'location' | 'documents' | 'history'>('overview');

  // Fetch Property Details
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.get(`/properties/${propertyId}`);
        setProperty(response.data.data);
      } catch (err: any) {
        setError(err.response?.data?.error?.messageAr || tCommon('error'));
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId, tCommon]);

  // Format Price
  const formatPrice = (price: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format Date
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Get Status Color
  const getStatusColor = (status: PropertyStatus) => {
    const colors: Record<PropertyStatus, string> = {
      AVAILABLE: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700',
      RESERVED_TEMP: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
      RESERVED_CONFIRMED: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-700',
      SOLD: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
      RENTED: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
      SUSPENDED: 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-700',
      UNDER_MAINTENANCE: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700',
    };
    return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  // Delete Property
  const handleDelete = async () => {
    if (!property) return;
    try {
      setActionLoading(true);
      await api.delete(`/properties/${property.id}`);
      router.push('/properties');
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setActionLoading(false);
      setShowDeleteModal(false);
    }
  };

  // Navigate Images
  const nextImage = () => {
    if (!property || property.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
  };

  const prevImage = () => {
    if (!property || property.images.length === 0) return;
    setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
  };

  // Copy Link
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    // Show toast notification
  };

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4 md:p-6">
        <div className="animate-pulse space-y-6">
          {/* Back Button Skeleton */}
          <div className="h-8 w-32 skeleton rounded-lg" />
          
          {/* Main Content Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Gallery Skeleton */}
            <div className="lg:col-span-2">
              <div className="h-96 skeleton rounded-2xl" />
            </div>
            {/* Sidebar Skeleton */}
            <div className="space-y-4">
              <div className="h-48 skeleton rounded-2xl" />
              <div className="h-32 skeleton rounded-2xl" />
              <div className="h-32 skeleton rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !property) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">خطأ في التحميل</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error || t('emptyTitle')}</p>
          <button
            onClick={() => router.push('/properties')}
            className="btn btn-primary"
          >
            <ArrowRightIcon className="w-5 h-5" />
            {tCommon('back')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══════════════════════════════════════════════════════════════
          Header Section
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Back & Title */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/properties')}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <ArrowRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">
                  {property.titleAr || property.title}
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(property.status)}`}>
                    {t(`statuses.${property.status}` as any)}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t(`types.${property.propertyType}` as any)}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View Count */}
              <div className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm text-gray-600 dark:text-gray-300">
                <EyeIcon className="w-4 h-4" />
                <span>{property.viewCount || 0}</span>
              </div>

              {/* Favorite */}
              <button
                onClick={() => setIsFavorite(!isFavorite)}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {isFavorite ? (
                  <HeartSolidIcon className="w-5 h-5 text-red-500" />
                ) : (
                  <HeartIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                )}
              </button>

              {/* Copy Link */}
              <button
                onClick={copyLink}
                className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <DocumentDuplicateIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              </button>

              {/* Lock/Unlock */}
              <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
                {property.lock ? (
                  <button
                    onClick={() => setShowUnlockModal(true)}
                    className="btn btn-ghost text-orange-600 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  >
                    <LockOpenIcon className="w-5 h-5" />
                    <span className="hidden sm:inline">{t('unlock')}</span>
                  </button>
                ) : (
                  property.status === PropertyStatus.AVAILABLE && (
                    <button
                      onClick={() => setShowLockModal(true)}
                      className="btn btn-ghost text-amber-600 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                    >
                      <LockClosedIcon className="w-5 h-5" />
                      <span className="hidden sm:inline">{t('lock')}</span>
                    </button>
                  )
                )}
              </PermissionGate>

              {/* Edit */}
              <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
                <button
                  onClick={() => router.push(`/dashboard/properties/${property.id}/edit`)}
                  className="btn btn-primary"
                >
                  <PencilIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">{tCommon('edit')}</span>
                </button>
              </PermissionGate>

              {/* Delete */}
              <PermissionGate permissions={[PERMISSIONS.PROPERTIES_DELETE]}>
                <button
                  onClick={() => setShowDeleteModal(true)}
                  disabled={!!property.lock}
                  className="btn btn-ghost text-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══════════════════════════════════════════════════════════════
              Main Content - Left Column
              ═══════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hero Gallery */}
            <div className="relative bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
              {/* Main Image */}
              <div
                className="relative h-80 md:h-[480px] bg-gray-100 dark:bg-gray-800 cursor-pointer group"
                onClick={() => setShowGallery(true)}
              >
                {property.images.length > 0 ? (
                  <img
                    src={property.images[currentImageIndex]?.url}
                    alt={property.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                    <BuildingOfficeIcon className="w-24 h-24 text-gray-300 dark:text-gray-600" />
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-xl text-sm font-medium">
                    <ArrowsPointingOutIcon className="w-5 h-5" />
                    عرض بملء الشاشة
                  </div>
                </div>

                {/* Navigation Arrows */}
                {property.images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-900 hover:scale-110 shadow-lg"
                    >
                      <ChevronRightIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-900 hover:scale-110 shadow-lg"
                    >
                      <ChevronLeftIcon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                  </>
                )}

                {/* Image Counter */}
                {property.images.length > 1 && (
                  <div className="absolute bottom-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full text-sm font-medium">
                    {currentImageIndex + 1} / {property.images.length}
                  </div>
                )}

                {/* Lock Badge */}
                {property.lock && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 px-4 py-2 bg-red-500/90 backdrop-blur-sm text-white rounded-xl text-sm font-semibold shadow-lg">
                    <LockClosedIcon className="w-5 h-5" />
                    <span>محجوز</span>
                  </div>
                )}

                {/* Off-Plan Badge */}
                {property.isOffPlan && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-secondary-500/90 backdrop-blur-sm text-white rounded-xl text-sm font-semibold shadow-lg">
                    <SparklesIcon className="w-4 h-4" />
                    <span>Off-Plan</span>
                  </div>
                )}
              </div>

              {/* Thumbnails */}
              {property.images.length > 1 && (
                <div className="p-4 flex gap-3 overflow-x-auto bg-gray-50 dark:bg-gray-800/50">
                  {property.images.map((image, index) => (
                    <button
                      key={image.id}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                        index === currentImageIndex
                          ? 'border-primary-500 scale-105 shadow-lg'
                          : 'border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <img src={image.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Status Timeline */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">المراحل</h3>
              <StatusTimeline
                currentStatus={property.status}
                createdAt={property.createdAt}
                lock={property.lock}
              />
            </div>

            {/* Lock Info */}
            {property.lock && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <LockClosedIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <h3 className="font-bold text-orange-800 dark:text-orange-300 text-lg">معلومات الحجز</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3 text-orange-700 dark:text-orange-300">
                    <span className="text-orange-500">نوع الحجز:</span>
                    <span className="font-medium">
                      {t(`lockType.${property.lock.lockType}` as any)}
                    </span>
                  </div>
                  {property.lock.expiresAt && (
                    <div className="flex items-center gap-3 text-orange-700 dark:text-orange-300">
                      <ClockIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500">ينتهي في:</span>
                      <span className="font-medium">{formatDate(property.lock.expiresAt)}</span>
                    </div>
                  )}
                  {property.lock.deal && (
                    <div className="flex items-center gap-3 text-orange-700 dark:text-orange-300">
                      <UserIcon className="w-4 h-4 text-orange-500" />
                      <span className="text-orange-500">مرتبط بصفقة:</span>
                      <button
                        onClick={() => router.push(`/dashboard/deals/${property.lock!.deal!.id}`)}
                        className="text-primary-600 dark:text-primary-400 hover:underline font-medium"
                      >
                        {property.lock.deal.title}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Description */}
            {property.description && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-primary-500" />
                  وصف العقار
                </h3>
                <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {/* Specifications */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <HomeModernIcon className="w-5 h-5 text-primary-500" />
                المواصفات
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {/* Area */}
                <div className="bg-gradient-to-br from-primary-50 to-primary-100/50 dark:from-primary-900/20 dark:to-primary-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                  <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <CubeIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="block text-2xl font-bold text-primary-600 dark:text-primary-400">
                    {property.areaM2.toLocaleString('ar-EG')}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{t('m2')}</span>
                </div>

                {/* Bedrooms */}
                {property.bedrooms !== undefined && property.bedrooms > 0 && (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BedIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="block text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {property.bedrooms}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('bedrooms')}</span>
                  </div>
                )}

                {/* Bathrooms */}
                {property.bathrooms !== undefined && property.bathrooms > 0 && (
                  <div className="bg-gradient-to-br from-sky-50 to-sky-100/50 dark:from-sky-900/20 dark:to-sky-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BathIcon className="w-6 h-6 text-sky-600 dark:text-sky-400" />
                    </div>
                    <span className="block text-2xl font-bold text-sky-600 dark:text-sky-400">
                      {property.bathrooms}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('bathrooms')}</span>
                  </div>
                )}

                {/* Floor */}
                {property.floor !== undefined && (
                  <div className="bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <BuildingOfficeIcon className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <span className="block text-2xl font-bold text-violet-600 dark:text-violet-400">
                      {property.floor}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('floor')}</span>
                  </div>
                )}

                {/* Parking */}
                {property.parking !== undefined && property.parking > 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <span className="text-2xl">🚗</span>
                    </div>
                    <span className="block text-2xl font-bold text-amber-600 dark:text-amber-400">
                      {property.parking}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('fields.parking')}</span>
                  </div>
                )}

                {/* Finishing Type */}
                {property.finishingType && (
                  <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 rounded-xl p-4 text-center group hover:shadow-lg transition-all duration-300">
                    <div className="w-12 h-12 mx-auto mb-2 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <SparklesIcon className="w-6 h-6 text-rose-600 dark:text-rose-400" />
                    </div>
                    <span className="block text-lg font-bold text-rose-600 dark:text-rose-400">
                      {t(`finishingTypes.${property.finishingType}` as any)}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{t('fields.finishingType')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Activities */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ClockIcon className="w-5 h-5 text-primary-500" />
                  {t('activities')}
                </h3>
                <AddActivityForm
                  entityType="property"
                  entityId={property.id}
                  onActivityAdded={() => {}}
                />
              </div>
              <ActivityTimeline entityType="property" entityId={property.id} />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              Sidebar - Right Column
              ═══════════════════════════════════════════════════════════════ */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-2xl p-6 text-white shadow-xl shadow-primary-500/20">
              <div className="text-sm text-primary-100 mb-1">{t('price')}</div>
              <div className="text-3xl font-bold mb-3">
                {formatPrice(property.askingPrice, property.currency)}
              </div>
              {property.commissionRate !== undefined && property.commissionRate > 0 && (
                <div className="flex items-center gap-2 text-primary-100 text-sm">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  <span>عمولة {property.commissionRate}%</span>
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-primary-400/30">
                <div className="flex items-center gap-2 text-primary-100 text-sm">
                  <CalendarDaysIcon className="w-4 h-4" />
                  <span>أُضيف {formatDate(property.createdAt)}</span>
                </div>
              </div>
            </div>

            {/* Location Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <MapPinIcon className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white">{t('city')}</h3>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-gray-900 dark:text-white text-lg">{property.city}</p>
                {property.district && (
                  <p className="text-gray-600 dark:text-gray-300">{property.district}</p>
                )}
                {property.address && (
                  <p className="text-gray-500 dark:text-gray-400">{property.address}</p>
                )}
                {property.unitNumber && (
                  <p className="text-gray-500 dark:text-gray-400 text-xs">
                    {t('fields.unitNumber')}: {property.unitNumber}
                  </p>
                )}
              </div>
            </div>

            {/* Price History Card */}
            {property.priceHistory && property.priceHistory.length > 0 && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <ChartBarIcon className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{t('priceHistory')}</h3>
                </div>
                <PriceHistoryChart
                  priceHistory={property.priceHistory}
                  currentPrice={property.askingPrice}
                  currency={property.currency}
                  formatPrice={formatPrice}
                />
              </div>
            )}

            {/* Additional Info Card */}
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4">{tCommon('info')}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">{t('table.createdAt')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatDate(property.createdAt)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">{tCommon('status')}</span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${getStatusColor(property.status)}`}>
                    {t(`statuses.${property.status}` as any)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                  <span className="text-gray-500 dark:text-gray-400">{t('fields.isListed')}</span>
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${property.isListed ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-400'}`}>
                    {property.isListed ? tCommon('yes') : tCommon('no')}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-500 dark:text-gray-400">نوع العقار</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t(`types.${property.propertyType}` as any)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          Modals
          ═══════════════════════════════════════════════════════════════ */}
      
      {/* Gallery Modal */}
      {showGallery && property.images.length > 0 && (
        <GalleryModal
          images={property.images}
          initialIndex={currentImageIndex}
          onClose={() => setShowGallery(false)}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal-backdrop">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{tCommon('delete')}</h3>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300">{t('confirmDelete')}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn btn-outline"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading}
                className="btn btn-danger"
              >
                {actionLoading ? tCommon('loading') : tCommon('delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="modal-backdrop">
          <div className="modal max-w-md">
            <div className="modal-header">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('unlock')}</h3>
            </div>
            <div className="modal-body">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                  <LockOpenIcon className="w-6 h-6 text-orange-500" />
                </div>
                <p className="text-gray-600 dark:text-gray-300">{t('confirmUnlock')}</p>
              </div>
            </div>
            <div className="modal-footer">
              <button
                onClick={() => setShowUnlockModal(false)}
                className="btn btn-outline"
              >
                {tCommon('cancel')}
              </button>
              <button
                onClick={async () => {
                  if (!property?.lock) return;
                  try {
                    setActionLoading(true);
                    await api.delete(`/properties/${property.id}/lock?dealId=${property.lock.dealId}`);
                    setProperty({ ...property, lock: null, status: PropertyStatus.AVAILABLE });
                    setShowUnlockModal(false);
                  } catch (err: any) {
                    setError(err.response?.data?.error?.messageAr || tCommon('error'));
                  } finally {
                    setActionLoading(false);
                  }
                }}
                disabled={actionLoading}
                className="btn btn-ghost text-orange-600 bg-orange-50 dark:bg-orange-900/20"
              >
                {actionLoading ? tCommon('loading') : t('unlock')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
