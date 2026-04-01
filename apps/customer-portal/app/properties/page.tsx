// ═══════════════════════════════════════════════════════════════
// Customer Portal - Properties Landing Page
// صفحة العقارات المتاحة للعملاء
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Search,
  Grid3X3,
  List,
  Loader2,
  Heart,
  Share2,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import {
  customerPortalApi,
  CustomerPortalError,
  formatCurrency,
  PropertyPublic,
} from '@/lib/api';

export default function PropertiesLandingPage() {
  const [properties, setProperties] = useState<PropertyPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filters, setFilters] = useState({
    propertyType: '',
    minPrice: '',
    maxPrice: '',
    city: '',
    bedrooms: '',
  });

  // جلب العقارات
  useEffect(() => {
    const fetchProperties = async () => {
      try {
        setLoading(true);
        const data = await customerPortalApi.getPublicProperties(filters);
        setProperties(data);
        setError(null);
      } catch (err) {
        if (err instanceof CustomerPortalError) {
          setError(err.message);
        } else {
          setError('حدث خطأ في تحميل العقارات');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [filters]);

  // فلترة محلية للبحث
  const filteredProperties = properties.filter(p => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.title.toLowerCase().includes(query) ||
      p.titleAr?.toLowerCase().includes(query) ||
      p.city.toLowerCase().includes(query) ||
      p.district?.toLowerCase().includes(query)
    );
  });

  // مشاركة رابط عقار
  const shareProperty = async (property: PropertyPublic) => {
    const url = `${window.location.origin}/request/${property.id}`;
    if (navigator.share) {
      await navigator.share({
        title: property.titleAr || property.title,
        text: `عقار مميز في ${property.city}`,
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('تم نسخ الرابط!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50" dir="rtl">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-l from-blue-600 via-blue-700 to-indigo-800 text-white">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 py-16 sm:py-24">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              اكتشف عقارك المثالي
            </h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
              تصفح أفضل العقارات المتاحة في مصر مع إمكانية طلب معاينة فورية
            </p>
            
            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative bg-white rounded-2xl shadow-2xl p-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="ابحث بالاسم، المدينة، أو المنطقة..."
                      className="w-full pr-12 pl-4 py-4 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg"
                    />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-4 py-4 rounded-xl flex items-center gap-2 transition-all ${
                      showFilters ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <SlidersHorizontal className="w-5 h-5" />
                    <span className="hidden sm:inline">فلترة</span>
                  </button>
                </div>
                
                {/* Filters Panel */}
                {showFilters && (
                  <div className="p-4 border-t mt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                      <select
                        value={filters.propertyType}
                        onChange={(e) => setFilters({ ...filters, propertyType: e.target.value })}
                        className="px-3 py-2 rounded-lg border text-gray-700 text-sm"
                      >
                        <option value="">نوع العقار</option>
                        <option value="APARTMENT">شقة</option>
                        <option value="VILLA">فيلا</option>
                        <option value="DUPLEX">دوبلكس</option>
                        <option value="STUDIO">ستوديو</option>
                        <option value="OFFICE">مكتب</option>
                        <option value="SHOP">محل</option>
                      </select>
                      <input
                        type="number"
                        placeholder="أقل سعر"
                        value={filters.minPrice}
                        onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                        className="px-3 py-2 rounded-lg border text-gray-700 text-sm"
                      />
                      <input
                        type="number"
                        placeholder="أعلى سعر"
                        value={filters.maxPrice}
                        onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                        className="px-3 py-2 rounded-lg border text-gray-700 text-sm"
                      />
                      <input
                        type="text"
                        placeholder="المدينة"
                        value={filters.city}
                        onChange={(e) => setFilters({ ...filters, city: e.target.value })}
                        className="px-3 py-2 rounded-lg border text-gray-700 text-sm"
                      />
                      <select
                        value={filters.bedrooms}
                        onChange={(e) => setFilters({ ...filters, bedrooms: e.target.value })}
                        className="px-3 py-2 rounded-lg border text-gray-700 text-sm"
                      >
                        <option value="">الغرف</option>
                        <option value="1">1 غرفة</option>
                        <option value="2">2 غرفة</option>
                        <option value="3">3 غرف</option>
                        <option value="4">4 غرف</option>
                        <option value="5">5+ غرف</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Wave Decoration */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#F8FAFC"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">العقارات المتاحة</h2>
            <p className="text-gray-500 mt-1">
              {loading ? 'جاري التحميل...' : `${filteredProperties.length} عقار متاح`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">جاري تحميل العقارات...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filteredProperties.length === 0 && (
          <div className="text-center py-20">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">لا توجد عقارات</h3>
            <p className="text-gray-500">جرب تغيير معايير البحث</p>
          </div>
        )}

        {/* Properties Grid */}
        {!loading && !error && filteredProperties.length > 0 && (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
          }>
            {filteredProperties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                viewMode={viewMode}
                onShare={() => shareProperty(property)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h3 className="text-2xl font-bold mb-4">نظام تشغيل المكتب العقاري</h3>
          <p className="text-gray-400 max-w-xl mx-auto">
            منصة متكاملة لإدارة العقارات والصفقات مع امتثال كامل للقرار 578/2025
          </p>
        </div>
      </footer>
    </div>
  );
}

// Property Card Component
function PropertyCard({ 
  property, 
  viewMode,
  onShare 
}: { 
  property: PropertyPublic;
  viewMode: 'grid' | 'list';
  onShare: () => void;
}) {
  const [currentImage, setCurrentImage] = useState(0);
  const images = property.images || [];

  if (viewMode === 'list') {
    return (
      <a
        href={`/request/${property.id}`}
        className="block bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group"
      >
        <div className="flex gap-4 p-4">
          {/* Image */}
          <div className="w-48 h-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
            {images.length > 0 ? (
              <img
                src={images[0].url}
                alt={property.titleAr || property.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Building2 className="w-10 h-10 text-gray-300" />
              </div>
            )}
          </div>
          
          {/* Info */}
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                {property.titleAr || property.title}
              </h3>
              <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" />
                {property.city}، {property.district || ''}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                {property.bedrooms && (
                  <span className="flex items-center gap-1">
                    <BedDouble className="w-4 h-4" />
                    {property.bedrooms}
                  </span>
                )}
                {property.bathrooms && (
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    {property.bathrooms}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Maximize className="w-4 h-4" />
                  {property.areaM2} م²
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-3">
              <p className="text-lg font-bold text-blue-600">
                {formatCurrency(property.askingPrice, property.currency)}
              </p>
              <button
                onClick={(e) => { e.preventDefault(); onShare(); }}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </a>
    );
  }

  return (
    <div className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
        {images.length > 0 ? (
          <>
            <img
              src={images[currentImage].url}
              alt={property.titleAr || property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {images.slice(0, 5).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.preventDefault(); setCurrentImage(idx); }}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentImage ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/75'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Building2 className="w-16 h-16 text-gray-300" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          {property.status === 'AVAILABLE' && (
            <span className="px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full shadow-lg">
              متاح
            </span>
          )}
          {property.finishingType && (
            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full shadow">
              {property.finishingType === 'FULLY_FINISHED' ? 'تشطيب كامل' :
               property.finishingType === 'SEMI_FINISHED' ? 'نصف تشطيب' :
               property.finishingType === 'CORE_SHELL' ? 'على الطوب' :
               property.finishingType === 'ULTRA_LUXURY' ? 'سوبر لوكس' : property.finishingType}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="absolute top-3 left-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button
            onClick={(e) => { e.preventDefault(); onShare(); }}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <Share2 className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={(e) => e.preventDefault()}
            className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
          >
            <Heart className="w-4 h-4 text-gray-700" />
          </button>
        </div>
      </div>

      {/* Content */}
      <a href={`/request/${property.id}`} className="block p-5">
        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1 mb-2">
          {property.titleAr || property.title}
        </h3>
        
        <p className="text-sm text-gray-500 flex items-center gap-1 mb-3">
          <MapPin className="w-4 h-4 flex-shrink-0" />
          <span className="line-clamp-1">{property.city}، {property.district || ''}</span>
        </p>

        {/* Features */}
        <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
          {property.bedrooms && (
            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <BedDouble className="w-4 h-4" />
              {property.bedrooms}
            </span>
          )}
          {property.bathrooms && (
            <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
              <Bath className="w-4 h-4" />
              {property.bathrooms}
            </span>
          )}
          <span className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded">
            <Maximize className="w-4 h-4" />
            {property.areaM2} م²
          </span>
        </div>

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            <p className="text-xs text-gray-500">السعر</p>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(property.askingPrice, property.currency)}
            </p>
          </div>
          <span className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg group-hover:bg-blue-700 transition-colors flex items-center gap-1">
            <Eye className="w-4 h-4" />
            طلب معاينة
          </span>
        </div>
      </a>
    </div>
  );
}
