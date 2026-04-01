'use client';

// ═══════════════════════════════════════════════════════════════
// Properties Page - صفحة قائمة العقارات
// World-Class UI/UX Design
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  Squares2X2Icon,
  ListBulletIcon,
  HomeIcon,
  MapPinIcon,
  AdjustmentsHorizontalIcon,
  HeartIcon,
  EllipsisHorizontalIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  CubeIcon,
  SparklesIcon,
  FunnelIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { BedIcon, BathIcon } from '@/components/icons/CustomIcons';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import EmptyState from '@/components/shared/EmptyState';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS, PropertyType, PropertyStatus } from '@realestate/shared-types';

interface Property {
  id: string;
  title: string;
  titleAr?: string;
  description?: string;
  propertyType: PropertyType;
  status: PropertyStatus;
  finishingType?: string;
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
  createdAt: string;
  updatedAt: string;
  lock?: {
    id: string;
    dealId: string;
    lockType: string;
    expiresAt?: string;
  } | null;
  isFavorite?: boolean;
  viewCount?: number;
}

interface PropertiesResponse {
  data: Property[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

type ViewMode = 'grid' | 'list';

// ═══════════════════════════════════════════════════════════════
// Property Card Component - World-Class Design
// ═══════════════════════════════════════════════════════════════
interface PropertyCardProps {
  property: Property;
  viewMode: ViewMode;
  index: number;
  onView: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  formatPrice: (price: number, currency: string) => string;
  formatArea: (area: number) => string;
  getStatusColor: (status: PropertyStatus) => string;
  getPropertyType: (type: PropertyType) => string;
  getPropertyStatus: (status: PropertyStatus) => string;
}

function PropertyCard({
  property,
  viewMode,
  index,
  onView,
  onToggleFavorite,
  formatPrice,
  formatArea,
  getStatusColor,
  getPropertyType,
  getPropertyStatus,
}: PropertyCardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showActions, setShowActions] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.images.length > 1) {
      setCurrentImageIndex((prev) => (prev + 1) % property.images.length);
    }
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (property.images.length > 1) {
      setCurrentImageIndex((prev) => (prev - 1 + property.images.length) % property.images.length);
    }
  };

  // Staggered entrance animation
  const animationDelay = `${Math.min(index * 50, 300)}ms`;

  if (viewMode === 'list') {
    return (
      <div
        ref={cardRef}
        onClick={() => onView(property.id)}
        className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-black/30 transition-all duration-300 cursor-pointer flex gap-4 animate-fade-in"
        style={{ animationDelay }}
      >
        {/* Image Section */}
        <div className="relative w-40 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton" />
          )}
          {property.images.length > 0 ? (
            <img
              src={property.images[currentImageIndex]?.url || property.images[0].url}
              alt={property.title}
              className={`w-full h-full object-cover transition-all duration-500 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              } group-hover:scale-110`}
              onLoad={() => setImageLoaded(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <BuildingOfficeIcon className="w-12 h-12 text-gray-300 dark:text-gray-600" />
            </div>
          )}

          {/* Image Navigation Dots */}
          {property.images.length > 1 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              {property.images.slice(0, 4).map((_, idx) => (
                <div
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-200 ${
                    idx === currentImageIndex ? 'bg-white w-3' : 'bg-white/50'
                  }`}
                />
              ))}
              {property.images.length > 4 && (
                <span className="text-[10px] text-white font-medium">+{property.images.length - 4}</span>
              )}
            </div>
          )}

          {/* Lock Badge */}
          {property.lock && (
            <div className="absolute top-2 left-2 px-2 py-1 bg-red-500/90 backdrop-blur-sm text-white rounded-lg text-xs font-medium flex items-center gap-1">
              🔒
            </div>
          )}

          {/* Favorite Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(property.id);
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 transition-all duration-200 hover:scale-110"
          >
            {property.isFavorite ? (
              <HeartSolidIcon className="w-4 h-4 text-red-500" />
            ) : (
              <HeartIcon className="w-4 h-4 text-gray-500 hover:text-red-400 transition-colors" />
            )}
          </button>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1 group-hover:text-primary-500 transition-colors">
                {property.titleAr || property.title}
              </h3>
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mt-1">
                <MapPinIcon className="w-4 h-4 flex-shrink-0" />
                <span className="line-clamp-1">
                  {property.district ? `${property.district}، ` : ''}{property.city}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(property.status)}`}>
                {getPropertyStatus(property.status)}
              </span>
            </div>
          </div>

          {/* Features */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 dark:text-gray-300 mb-3">
            <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
              <BuildingOfficeIcon className="w-4 h-4" />
              {getPropertyType(property.propertyType)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CubeIcon className="w-4 h-4 text-primary-500" />
              {formatArea(property.areaM2)}
            </span>
            {property.bedrooms !== undefined && property.bedrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <BedIcon className="w-4 h-4 text-primary-500" />
                {property.bedrooms}
              </span>
            )}
            {property.bathrooms !== undefined && property.bathrooms > 0 && (
              <span className="inline-flex items-center gap-1">
                <BathIcon className="w-4 h-4 text-primary-500" />
                {property.bathrooms}
              </span>
            )}
            {property.floor !== undefined && (
              <span className="text-gray-500 dark:text-gray-400">
                الدور {property.floor}
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {formatPrice(property.askingPrice, property.currency)}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <EyeIcon className="w-4 h-4" />
              {property.viewCount || 0}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid View Card
  return (
    <div
      ref={cardRef}
      onClick={() => onView(property.id)}
      className="group bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-gray-200/50 dark:hover:shadow-black/30 transition-all duration-300 cursor-pointer animate-fade-in"
      style={{ animationDelay }}
    >
      {/* Image Section */}
      <div className="relative h-56 bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        {property.images.length > 0 ? (
          <img
            src={property.images[currentImageIndex]?.url || property.images[0].url}
            alt={property.title}
            className={`w-full h-full object-cover transition-all duration-700 ${
              imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
            } group-hover:scale-110`}
            onLoad={() => setImageLoaded(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
            <BuildingOfficeIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Image Navigation */}
        {property.images.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-900 hover:scale-110 shadow-lg"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
            <button
              onClick={nextImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-white dark:hover:bg-gray-900 hover:scale-110 shadow-lg"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
          </>
        )}

        {/* Top Badges Row */}
        <div className="absolute top-3 right-3 left-3 flex items-start justify-between gap-2">
          {/* Status Badge */}
          <span className={`px-3 py-1.5 rounded-xl text-xs font-bold backdrop-blur-md border ${getStatusColor(property.status)}`}>
            {getPropertyStatus(property.status)}
          </span>

          {/* Property Type Badge */}
          <span className="px-3 py-1.5 rounded-xl text-xs font-medium bg-black/40 backdrop-blur-md text-white border border-white/10">
            {getPropertyType(property.propertyType)}
          </span>
        </div>

        {/* Lock Badge */}
        {property.lock && (
          <div className="absolute top-14 right-3 px-2.5 py-1.5 bg-red-500/90 backdrop-blur-sm text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <span>🔒</span>
            <span>محجوز</span>
          </div>
        )}

        {/* Favorite Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(property.id);
          }}
          className="absolute top-3 left-3 p-2 rounded-xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-900 transition-all duration-200 hover:scale-110 shadow-lg opacity-0 group-hover:opacity-100"
        >
          {property.isFavorite ? (
            <HeartSolidIcon className="w-5 h-5 text-red-500" />
          ) : (
            <HeartIcon className="w-5 h-5 text-gray-500 hover:text-red-400 transition-colors" />
          )}
        </button>

        {/* Image Counter */}
        {property.images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-full text-xs font-medium flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <span>{currentImageIndex + 1}</span>
            <span className="text-white/50">/</span>
            <span>{property.images.length}</span>
          </div>
        )}

        {/* Image Dots */}
        {property.images.length > 1 && property.images.length <= 5 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {property.images.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  idx === currentImageIndex 
                    ? 'bg-white w-4' 
                    : 'bg-white/50 hover:bg-white/70 w-1.5'
                }`}
              />
            ))}
          </div>
        )}

        {/* Quick Actions Menu */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowActions(!showActions);
              }}
              className="p-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-xl hover:bg-white dark:hover:bg-gray-900 transition-all shadow-lg"
            >
              <EllipsisHorizontalIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>
            
            {showActions && (
              <div 
                className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1 min-w-[140px] animate-fade-in"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onView(property.id);
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <EyeIcon className="w-4 h-4" />
                  عرض التفاصيل
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Edit action
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <PencilIcon className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    // Delete action
                    setShowActions(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  حذف
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Off-Plan Badge */}
        {property.isOffPlan && (
          <div className="absolute top-14 left-3 px-2.5 py-1 bg-secondary-500/90 backdrop-blur-sm text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-lg">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Off-Plan</span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 dark:text-white text-lg line-clamp-1 mb-1 group-hover:text-primary-500 transition-colors">
          {property.titleAr || property.title}
        </h3>

        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-3">
          <MapPinIcon className="w-4 h-4 flex-shrink-0 text-primary-400" />
          <span className="line-clamp-1">
            {property.district ? `${property.district}، ` : ''}{property.city}
          </span>
        </div>

        {/* Features Row */}
        <div className="flex items-center gap-2 mb-4 text-sm">
          <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
            <CubeIcon className="w-4 h-4 text-primary-500" />
            <span>{formatArea(property.areaM2)}</span>
          </div>
          
          {property.bedrooms !== undefined && property.bedrooms > 0 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
              <BedIcon className="w-4 h-4 text-primary-500" />
              <span>{property.bedrooms}</span>
            </div>
          )}
          
          {property.bathrooms !== undefined && property.bathrooms > 0 && (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 px-2 py-1 rounded-lg">
              <BathIcon className="w-4 h-4 text-primary-500" />
              <span>{property.bathrooms}</span>
            </div>
          )}
        </div>

        {/* Price & Actions Row */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
          <div>
            <div className="text-xl font-bold text-primary-600 dark:text-primary-400">
              {formatPrice(property.askingPrice, property.currency)}
            </div>
            {property.commissionRate !== undefined && property.commissionRate > 0 && (
              <div className="text-xs text-gray-400 mt-0.5">
                عمولة {property.commissionRate}%
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <ClockIcon className="w-3.5 h-3.5" />
            <span>{new Date(property.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Skeleton Loader for Properties Grid
// ═══════════════════════════════════════════════════════════════
function PropertySkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex gap-4">
            <div className="w-40 h-32 skeleton rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-6 skeleton rounded-lg w-3/4" />
              <div className="h-4 skeleton rounded-lg w-1/2" />
              <div className="flex gap-2">
                <div className="h-6 skeleton rounded-lg w-20" />
                <div className="h-6 skeleton rounded-lg w-16" />
                <div className="h-6 skeleton rounded-lg w-16" />
              </div>
              <div className="h-5 skeleton rounded-lg w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden">
          <div className="h-56 skeleton" />
          <div className="p-4 space-y-3">
            <div className="h-5 skeleton rounded-lg w-3/4" />
            <div className="h-4 skeleton rounded-lg w-1/2" />
            <div className="flex gap-2">
              <div className="h-6 skeleton rounded-lg w-16" />
              <div className="h-6 skeleton rounded-lg w-12" />
              <div className="h-6 skeleton rounded-lg w-12" />
            </div>
            <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="h-6 skeleton rounded-lg w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Main Properties Page Component
// ═══════════════════════════════════════════════════════════════
export default function PropertiesPage() {
  const t = useTranslations('properties');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { user } = useAuth();

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [areaRange, setAreaRange] = useState({ min: '', max: '' });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'price_asc' | 'price_desc'>('newest');

  // Favorites state (local for demo)
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Fetch Properties
  const fetchProperties = useCallback(async (reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('propertyType', typeFilter);
      if (priceRange.min) params.append('minPrice', priceRange.min);
      if (priceRange.max) params.append('maxPrice', priceRange.max);
      if (areaRange.min) params.append('minArea', areaRange.min);
      if (areaRange.max) params.append('maxArea', areaRange.max);
      params.append('sortBy', sortBy);
      params.append('page', reset ? '1' : String(page));
      params.append('limit', '20');

      const response = await api.get<PropertiesResponse>(`/properties?${params.toString()}`);

      if (reset) {
        setProperties(response.data.data);
      } else {
        setProperties((prev) => [...prev, ...response.data.data]);
      }
      setTotal(response.data.meta.total);
      setHasMore(response.data.meta.hasMore);
    } catch (err: any) {
      setError(err.response?.data?.error?.messageAr || tCommon('error'));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter, priceRange, areaRange, page, sortBy, tCommon]);

  useEffect(() => {
    fetchProperties(true);
  }, [statusFilter, typeFilter, sortBy]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchProperties(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, priceRange, areaRange]);

  useEffect(() => {
    if (page > 1) {
      fetchProperties(false);
    }
  }, [page]);

  // Toggle Favorite
  const toggleFavorite = useCallback((propertyId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(propertyId)) {
        newFavorites.delete(propertyId);
      } else {
        newFavorites.add(propertyId);
      }
      return newFavorites;
    });
  }, []);

  // Format Price
  const formatPrice = (price: number, currency: string = 'EGP') => {
    return new Intl.NumberFormat('ar-EG', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Format Area
  const formatArea = (area: number) => {
    return `${area.toLocaleString('ar-EG')} م²`;
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

  // Get Property Type Label
  const getPropertyType = (type: PropertyType) => {
    return t(`types.${type}` as any);
  };

  // Get Property Status Label
  const getPropertyStatus = (status: PropertyStatus) => {
    return t(`statuses.${status}` as any);
  };

  // Handle Search
  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Load More
  const loadMore = () => {
    if (hasMore && !loading) {
      setPage((prev) => prev + 1);
    }
  };

  // View Property
  const viewProperty = (id: string) => {
    router.push(`/dashboard/properties/${id}`);
  };

  // Add Property
  const addProperty = () => {
    router.push('/dashboard/properties/new');
  };

  // Active Filters Count
  const activeFiltersCount = [
    statusFilter !== 'all' ? 1 : 0,
    typeFilter !== 'all' ? 1 : 0,
    priceRange.min || priceRange.max ? 1 : 0,
    areaRange.min || areaRange.max ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Clear All Filters
  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setPriceRange({ min: '', max: '' });
    setAreaRange({ min: '', max: '' });
    setSearch('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* ═══════════════════════════════════════════════════════════════
          Header Section
          ═══════════════════════════════════════════════════════════════ */}
      <div className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 md:px-6 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Title & Stats */}
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {t('title')}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-semibold text-primary-600 dark:text-primary-400">{total}</span> {t('stats.total')}
                </p>
              </div>
            </div>

            {/* Actions Row */}
            <div className="flex items-center gap-3">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'grid' 
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  title={t('grid')}
                >
                  <Squares2X2Icon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'list' 
                      ? 'bg-white dark:bg-gray-700 text-primary-600 dark:text-primary-400 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
                  title={t('list')}
                >
                  <ListBulletIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Add Property Button */}
              <PermissionGate permissions={[PERMISSIONS.PROPERTIES_WRITE]}>
                <button
                  onClick={addProperty}
                  className="btn btn-primary flex items-center gap-2"
                >
                  <PlusIcon className="w-5 h-5" />
                  <span className="hidden sm:inline">{t('newProperty')}</span>
                </button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-6">
        {/* ═══════════════════════════════════════════════════════════════
            Search & Filters Section
            ═══════════════════════════════════════════════════════════════ */}
        <div className="mb-6 space-y-4">
          {/* Search Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="input pr-11 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                dir="rtl"
              />
              {search && (
                <button
                  onClick={() => handleSearch('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <XMarkIcon className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-w-[130px]"
              >
                <option value="all">{t('filters.all')}</option>
                <option value="AVAILABLE">{t('filters.available')}</option>
                <option value="RESERVED_TEMP">{t('filters.reserved')}</option>
                <option value="RESERVED_CONFIRMED">{t('filters.reserved')}</option>
                <option value="SOLD">{t('filters.sold')}</option>
                <option value="RENTED">{t('filters.rented')}</option>
              </select>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-w-[130px]"
              >
                <option value="all">{t('filters.all')}</option>
                {Object.values(PropertyType).map((type) => (
                  <option key={type} value={type}>
                    {t(`types.${type}` as any)}
                  </option>
                ))}
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="input bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 min-w-[140px]"
              >
                <option value="newest">الأحدث أولاً</option>
                <option value="oldest">الأقدم أولاً</option>
                <option value="price_asc">السعر: الأقل</option>
                <option value="price_desc">السعر: الأعلى</option>
              </select>

              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`btn btn-outline flex items-center gap-2 ${
                  showFilters || activeFiltersCount > 2
                    ? 'border-primary-300 text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : ''
                }`}
              >
                <AdjustmentsHorizontalIcon className="w-5 h-5" />
                <span className="hidden sm:inline">{t('advancedFilters')}</span>
                {activeFiltersCount > 2 && (
                  <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center">
                    {activeFiltersCount - 2}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300 ${
              showFilters ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none absolute'
            }`}
          >
            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('priceRange')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={priceRange.min}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, min: e.target.value }))}
                  placeholder={t('minPrice')}
                  className="input text-sm"
                />
                <span className="text-gray-300 dark:text-gray-600">—</span>
                <input
                  type="number"
                  value={priceRange.max}
                  onChange={(e) => setPriceRange((prev) => ({ ...prev, max: e.target.value }))}
                  placeholder={t('maxPrice')}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Area Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('areaRange')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={areaRange.min}
                  onChange={(e) => setAreaRange((prev) => ({ ...prev, min: e.target.value }))}
                  placeholder={t('minArea')}
                  className="input text-sm"
                />
                <span className="text-gray-300 dark:text-gray-600">—</span>
                <input
                  type="number"
                  value={areaRange.max}
                  onChange={(e) => setAreaRange((prev) => ({ ...prev, max: e.target.value }))}
                  placeholder={t('maxArea')}
                  className="input text-sm"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn btn-ghost text-sm text-gray-500 hover:text-red-500"
              >
                <XMarkIcon className="w-4 h-4 ml-1" />
                مسح الفلاتر
              </button>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            Properties Grid/List
            ═══════════════════════════════════════════════════════════════ */}
        {loading && properties.length === 0 ? (
          <PropertySkeleton viewMode={viewMode} />
        ) : error ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
              <XMarkIcon className="w-8 h-8 text-red-500" />
            </div>
            <p className="text-red-500 mb-4">{error}</p>
            <button
              onClick={() => fetchProperties(true)}
              className="btn btn-primary"
            >
              {tCommon('retry') || 'إعادة المحاولة'}
            </button>
          </div>
        ) : properties.length === 0 ? (
          <EmptyState
            title={t('emptyTitle')}
            description={t('emptyDescription')}
            actionLabel={t('emptyAddButton')}
            onAction={addProperty}
            icon={<BuildingOfficeIcon className="w-16 h-16 text-gray-300 dark:text-gray-600" />}
          />
        ) : (
          <>
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6 gap-5">
                {properties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={{
                      ...property,
                      isFavorite: favorites.has(property.id),
                    }}
                    viewMode={viewMode}
                    index={index}
                    onView={viewProperty}
                    onToggleFavorite={toggleFavorite}
                    formatPrice={formatPrice}
                    formatArea={formatArea}
                    getStatusColor={getStatusColor}
                    getPropertyType={getPropertyType}
                    getPropertyStatus={getPropertyStatus}
                  />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((property, index) => (
                  <PropertyCard
                    key={property.id}
                    property={{
                      ...property,
                      isFavorite: favorites.has(property.id),
                    }}
                    viewMode={viewMode}
                    index={index}
                    onView={viewProperty}
                    onToggleFavorite={toggleFavorite}
                    formatPrice={formatPrice}
                    formatArea={formatArea}
                    getStatusColor={getStatusColor}
                    getPropertyType={getPropertyType}
                    getPropertyStatus={getPropertyStatus}
                  />
                ))}
              </div>
            )}

            {/* Load More */}
            {hasMore && (
              <div className="flex justify-center pt-8">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="btn btn-outline min-w-[200px]"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {tCommon('loading')}
                    </span>
                  ) : (
                    tCommon('next')
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
