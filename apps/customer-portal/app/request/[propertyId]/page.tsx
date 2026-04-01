// ═══════════════════════════════════════════════════════════════
// Customer Portal - Property Request Page
// صفحة طلب عقار معين من رابط مشترك
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, use } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  User,
  Mail,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  Calendar,
  BedDouble,
  Bath,
  Maximize,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  customerPortalApi,
  CustomerPortalError,
  formatCurrency,
  formatDate,
  validateEgyptianPhone,
  PropertyPublic,
} from '@/lib/api';

interface PageProps {
  params: Promise<{ propertyId: string }>;
}

export default function PropertyRequestPage({ params }: PageProps) {
  const { propertyId } = use(params);
  
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: '',
    preferredDate: '',
    preferredTime: '',
  });
  
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // جلب بيانات العقار
  useEffect(() => {
    const fetchProperty = async () => {
      try {
        setLoading(true);
        const data = await customerPortalApi.getPropertyPublic(propertyId);
        setProperty(data);
        setError(null);
      } catch (err) {
        if (err instanceof CustomerPortalError) {
          setError(err.message);
        } else {
          setError('حدث خطأ في تحميل بيانات العقار');
        }
      } finally {
        setLoading(false);
      }
    };

    if (propertyId) {
      fetchProperty();
    }
  }, [propertyId]);

  // التحقق من صحة النموذج
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'الاسم مطلوب';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'الاسم يجب أن يكون 3 أحرف على الأقل';
    }

    const phoneValidation = validateEgyptianPhone(formData.phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error || 'رقم الهاتف غير صحيح';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صحيح';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // إرسال النموذج
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const result = await customerPortalApi.createViewingRequest({
        propertyId,
        name: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        message: formData.message || undefined,
        preferredDate: formData.preferredDate || undefined,
        preferredTime: formData.preferredTime || undefined,
      });

      setRequestId(result.requestId);
      setSubmitted(true);
    } catch (err) {
      if (err instanceof CustomerPortalError) {
        setFormErrors({ submit: err.message });
      } else {
        setFormErrors({ submit: 'حدث خطأ في إرسال الطلب' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // الصور
  const images = property?.images || [];
  const hasImages = images.length > 0;

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">جاري تحميل بيانات العقار...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !property) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">العقار غير موجود</h1>
          <p className="text-gray-600 mb-6">{error || 'لم نتمكن من العثور على هذا العقار'}</p>
          <a
            href="/"
            className="inline-block py-2 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">تم إرسال طلبك!</h1>
          <p className="text-gray-600 mb-2">
            سيتواصل معك فريقنا في أقرب وقت.
          </p>
          {requestId && (
            <p className="text-sm text-gray-500 mb-6">
              رقم الطلب: <span className="font-mono font-medium">{requestId.slice(0, 8).toUpperCase()}</span>
            </p>
          )}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              العقار: <span className="font-medium text-gray-900">{property.titleAr || property.title}</span>
            </p>
            <p className="text-sm text-gray-600 mt-1">
              السعر: <span className="font-medium text-blue-600">{formatCurrency(property.askingPrice, property.currency)}</span>
            </p>
          </div>
          <a
            href="/"
            className="inline-block py-2 px-6 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold">طلب معاينة عقار</h1>
          <p className="text-blue-100 mt-1">أدخل بياناتك وسنتواصل معك</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Property Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
          {/* Image Gallery */}
          <div className="relative aspect-video bg-gray-200">
            {hasImages ? (
              <>
                <img
                  src={images[currentImageIndex].url}
                  alt={property.titleAr || property.title}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setShowGallery(true)}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-6 h-6 text-white" />
                    </button>
                    <button
                      onClick={() => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-6 h-6 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                      {images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            idx === currentImageIndex ? 'bg-white' : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Building2 className="w-16 h-16 text-gray-400" />
              </div>
            )}
          </div>

          {/* Property Info */}
          <div className="p-4">
            <h2 className="text-lg font-bold text-gray-900">
              {property.titleAr || property.title}
            </h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
              <MapPin className="w-4 h-4" />
              {property.city}، {property.district || ''}
            </p>

            <div className="flex items-center gap-4 mt-3 text-sm text-gray-600">
              {property.bedrooms && (
                <span className="flex items-center gap-1">
                  <BedDouble className="w-4 h-4" />
                  {property.bedrooms} غرف
                </span>
              )}
              {property.bathrooms && (
                <span className="flex items-center gap-1">
                  <Bath className="w-4 h-4" />
                  {property.bathrooms} حمام
                </span>
              )}
              <span className="flex items-center gap-1">
                <Maximize className="w-4 h-4" />
                {property.areaM2} م²
              </span>
            </div>

            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <p className="text-xl font-bold text-blue-600">
                {formatCurrency(property.askingPrice, property.currency)}
              </p>
              {property.finishingType && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                  {property.finishingType === 'FULLY_FINISHED' ? 'تشطيب كامل' :
                   property.finishingType === 'SEMI_FINISHED' ? 'نصف تشطيب' :
                   property.finishingType === 'CORE_SHELL' ? 'على الطوب' :
                   property.finishingType === 'ULTRA_LUXURY' ? 'سوبر لوكس' : property.finishingType}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Request Form */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h3 className="font-semibold text-gray-900 mb-4">بيانات التواصل</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم الكامل <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={`w-full pr-10 pl-4 py-2 border ${formErrors.name ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
              {formErrors.name && (
                <p className="text-sm text-red-600 mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                رقم الهاتف <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full pr-10 pl-4 py-2 border ${formErrors.phone ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="+20xxxxxxxxxx"
                  dir="ltr"
                />
              </div>
              {formErrors.phone && (
                <p className="text-sm text-red-600 mt-1">{formErrors.phone}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني (اختياري)</label>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full pr-10 pl-4 py-2 border ${formErrors.email ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  placeholder="email@example.com"
                  dir="ltr"
                />
              </div>
              {formErrors.email && (
                <p className="text-sm text-red-600 mt-1">{formErrors.email}</p>
              )}
            </div>

            {/* Preferred Date & Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ المفضل</label>
                <div className="relative">
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData({ ...formData, preferredDate: e.target.value })}
                    className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الوقت المفضل</label>
                <input
                  type="time"
                  value={formData.preferredTime}
                  onChange={(e) => setFormData({ ...formData, preferredTime: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">رسالتك (اختياري)</label>
              <div className="relative">
                <MessageSquare className="absolute right-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  rows={3}
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full pr-10 pl-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  placeholder="أخبرنا عن متطلباتك..."
                />
              </div>
            </div>

            {/* Submit Error */}
            {formErrors.submit && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                {formErrors.submit}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  إرسال الطلب
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Full Screen Gallery Modal */}
      {showGallery && hasImages && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center">
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 left-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>
          
          <img
            src={images[currentImageIndex].url}
            alt={property.titleAr || property.title}
            className="max-w-full max-h-full object-contain"
          />
          
          {images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((i) => (i === 0 ? images.length - 1 : i - 1))}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronLeft className="w-8 h-8 text-white" />
              </button>
              <button
                onClick={() => setCurrentImageIndex((i) => (i === images.length - 1 ? 0 : i + 1))}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                <ChevronRight className="w-8 h-8 text-white" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
