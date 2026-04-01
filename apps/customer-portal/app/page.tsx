// ═══════════════════════════════════════════════════════════════
// Customer Portal Main Page
// الصفحة الرئيسية لبوابة العملاء
// ═══════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  Building2,
  Calendar,
  FileText,
  CreditCard,
  Bell,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  MessageCircle,
  Share2,
  Heart,
  Search,
  RefreshCw,
  X,
} from 'lucide-react';
import {
  customerPortalApi,
  CustomerPortalError,
  formatCurrency,
  formatDate,
  formatDateTime,
  validateEgyptianPhone,
  getDealStageName,
  getViewingStatusName,
  getPaymentStatusName,
  getPaymentStatusColor,
  ClientData,
  ClientByPhone,
} from '@/lib/api';

export default function CustomerPortalPage() {
  const [activeTab, setActiveTab] = useState<'home' | 'viewings' | 'deals' | 'payments'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [client, setClient] = useState<ClientByPhone | null>(null);
  
  // Phone search state
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // البحث عن العميل
  const handleSearchClient = async () => {
    const validation = validateEgyptianPhone(phoneInput);
    if (!validation.valid) {
      setPhoneError(validation.error || 'رقم الهاتف غير صحيح');
      return;
    }

    setPhoneError(null);
    setSearching(true);
    setError(null);

    try {
      const formattedPhone = validation.formatted!;
      
      // البحث عن العميل
      const clientResult = await customerPortalApi.getClientByPhone(formattedPhone);
      setClient(clientResult);
      
      // جلب البيانات الكاملة
      const data = await customerPortalApi.getClientData(formattedPhone);
      setClientData(data);
      setShowPhoneModal(false);
    } catch (err) {
      if (err instanceof CustomerPortalError) {
        if (err.code === 'CLIENT_NOT_FOUND') {
          setPhoneError('لم يتم العثور على حساب بهذا الرقم');
        } else {
          setError(err.message);
        }
      } else {
        setError('حدث خطأ في البحث');
      }
    } finally {
      setSearching(false);
    }
  };

  // تحديث البيانات
  const refreshData = async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      const data = await customerPortalApi.getClientData(client.phone);
      setClientData(data);
    } catch (err) {
      if (err instanceof CustomerPortalError) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // تنسيق الأرقام
  const formatPrice = (amount: number, currency: string) => {
    return formatCurrency(amount, currency);
  };

  // If no client is logged in, show phone search
  if (!clientData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {/* Header */}
        <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-6 sticky top-0 z-50 shadow-lg">
          <div className="max-w-lg mx-auto">
            <h1 className="text-xl font-bold">بوابة العميل</h1>
            <p className="text-blue-100 text-sm">تتبع طلباتك العقارية بسهولة</p>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">مرحباً بك</h2>
              <p className="text-gray-600 mt-2">
                أدخل رقم هاتفك للوصول إلى حسابك
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setPhoneError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchClient()}
                  className={`w-full px-4 py-3 border ${phoneError ? 'border-red-500' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg`}
                  placeholder="+20xxxxxxxxxx"
                  dir="ltr"
                />
                {phoneError && (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {phoneError}
                  </p>
                )}
              </div>

              <button
                onClick={handleSearchClient}
                disabled={searching || !phoneInput}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {searching ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري البحث...
                  </>
                ) : (
                  <>
                    <Search className="w-5 h-5" />
                    بحث
                  </>
                )}
              </button>
            </div>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-gray-500 text-center">
                لديك طلب معاينة؟{' '}
                <span className="text-blue-600">تواصل معنا للمتابعة</span>
              </p>
            </div>
          </div>

          {/* Features */}
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <Calendar className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">تتبع المعاينات</p>
              <p className="text-xs text-gray-500 mt-1">اعرف مواعيد معايناتك</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <FileText className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">متابعة الصفقات</p>
              <p className="text-xs text-gray-500 mt-1">تابع تقدم صفقاتك</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <CreditCard className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">المدفوعات</p>
              <p className="text-xs text-gray-500 mt-1">عرض جدول السداد</p>
            </div>
            <div className="bg-white rounded-xl p-4 text-center shadow-sm">
              <Bell className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-gray-900">التنبيهات</p>
              <p className="text-xs text-gray-500 mt-1">ابق على اطلاع</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Main dashboard
  return (
    <div className="min-h-screen pb-20 bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-4 sticky top-0 z-50 shadow-lg">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold">بوابة العميل</h1>
              <p className="text-blue-100 text-sm">مرحباً، {clientData.name}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={refreshData}
                disabled={loading}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => {
                  setClientData(null);
                  setClient(null);
                }}
                className="text-sm text-blue-100 hover:text-white"
              >
                خروج
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <span className="text-red-700 text-sm">{error}</span>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="max-w-lg mx-auto px-4 py-6">
        {activeTab === 'home' && (
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">
                      {clientData.viewings.filter(v => v.status === 'scheduled').length}
                    </p>
                    <p className="text-xs text-gray-500">معاينات قادمة</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{clientData.deals.length}</p>
                    <p className="text-xs text-gray-500">صفقات نشطة</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Upcoming Viewing */}
            {clientData.viewings.filter(v => v.status === 'scheduled').length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
                  <h2 className="font-semibold text-blue-800">المعاينة القادمة</h2>
                </div>
                <div className="p-4">
                  {(() => {
                    const nextViewing = clientData.viewings
                      .filter(v => v.status === 'scheduled')
                      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
                    
                    if (!nextViewing) return null;
                    
                    return (
                      <>
                        <div className="flex items-start gap-3">
                          <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {nextViewing.property.titleAr || nextViewing.property.title}
                            </p>
                            <p className="text-sm text-gray-500">
                              {nextViewing.property.city}، {nextViewing.property.district}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-3">
                          <Clock className="w-5 h-5 text-gray-400" />
                          <p className="text-sm text-gray-600">
                            {formatDateTime(nextViewing.scheduledAt)}
                          </p>
                        </div>
                        <button className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                          تأكيد الحضور
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Active Deals */}
            {clientData.deals.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-green-50 border-b border-green-100">
                  <h2 className="font-semibold text-green-800">صفقاتك النشطة</h2>
                </div>
                <div className="divide-y">
                  {clientData.deals.slice(0, 2).map((deal) => (
                    <div key={deal.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">
                            {deal.property.titleAr || deal.property.title}
                          </p>
                          <p className="text-sm text-gray-500">
                            {deal.property.city}، {deal.property.district}
                          </p>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          {getDealStageName(deal.stage)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <p className="font-bold text-blue-600">
                          {formatPrice(deal.agreedPrice, deal.currency)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                {clientData.deals.length > 2 && (
                  <button
                    onClick={() => setActiveTab('deals')}
                    className="w-full py-3 text-blue-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    عرض الكل ({clientData.deals.length})
                  </button>
                )}
              </div>
            )}

            {/* Payments Summary */}
            {clientData.payments.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100">
                  <h2 className="font-semibold text-purple-800">المدفوعات القادمة</h2>
                </div>
                <div className="divide-y">
                  {clientData.payments
                    .filter(p => p.status === 'pending')
                    .slice(0, 2)
                    .map((payment) => (
                      <div key={payment.id} className="p-4 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-gray-900">
                            {formatPrice(payment.amount, payment.currency)}
                          </p>
                          <p className="text-sm text-gray-500">
                            استحقاق: {formatDate(payment.dueDate)}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm ${getPaymentStatusColor(payment.status)}`}>
                          {getPaymentStatusName(payment.status)}
                        </span>
                      </div>
                    ))}
                </div>
                {clientData.payments.filter(p => p.status === 'pending').length > 2 && (
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="w-full py-3 text-purple-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    عرض الكل ({clientData.payments.filter(p => p.status === 'pending').length})
                  </button>
                )}
              </div>
            )}

            {/* Empty State */}
            {clientData.viewings.length === 0 && clientData.deals.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900">لا توجد بيانات</h3>
                <p className="text-sm text-gray-500 mt-1">
                  لم يتم العثور على معاينات أو صفقات مرتبطة بحسابك
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'viewings' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">المعاينات</h2>
              <span className="text-sm text-gray-500">
                {clientData.viewings.length} معاينة
              </span>
            </div>
            
            {clientData.viewings.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد معاينات</p>
              </div>
            ) : (
              clientData.viewings.map((viewing) => (
                <div key={viewing.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {viewing.property.titleAr || viewing.property.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {viewing.property.city}، {viewing.property.district}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      viewing.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                      viewing.status === 'completed' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {getViewingStatusName(viewing.status)}
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {formatDateTime(viewing.scheduledAt)}
                  </div>
                  {viewing.feedback && (
                    <p className="mt-2 text-sm text-gray-600 bg-gray-50 rounded p-2">
                      {viewing.feedback}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">صفقاتي</h2>
              <span className="text-sm text-gray-500">
                {clientData.deals.length} صفقة
              </span>
            </div>
            
            {clientData.deals.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد صفقات</p>
              </div>
            ) : (
              clientData.deals.map((deal) => (
                <div key={deal.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {deal.property.titleAr || deal.property.title}
                      </h3>
                      <p className="text-lg font-bold text-blue-600 mt-1">
                        {formatPrice(deal.agreedPrice, deal.currency)}
                      </p>
                    </div>
                    <CheckCircle className="w-6 h-6 text-green-500" />
                  </div>
                  <div className="mt-4">
                    <p className="text-xs text-gray-500 mb-2">مرحلة الصفقة</p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                        {getDealStageName(deal.stage)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3">
                    تاريخ الإنشاء: {formatDate(deal.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">المدفوعات</h2>
              <span className="text-sm text-gray-500">
                {clientData.payments.length} قسط
              </span>
            </div>
            
            {clientData.payments.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm p-8 text-center">
                <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد مدفوعات</p>
              </div>
            ) : (
              clientData.payments.map((payment) => (
                <div key={payment.id} className="bg-white rounded-xl shadow-sm p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        {formatPrice(payment.amount, payment.currency)}
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        استحقاق: {formatDate(payment.dueDate)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm ${getPaymentStatusColor(payment.status)}`}>
                      {getPaymentStatusName(payment.status)}
                    </span>
                  </div>
                  {payment.paidAt && (
                    <p className="text-xs text-green-600 mt-2">
                      تم الدفع: {formatDate(payment.paidAt)}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="max-w-lg mx-auto flex justify-around py-2">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'home' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs mt-1">الرئيسية</span>
          </button>
          <button
            onClick={() => setActiveTab('viewings')}
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'viewings' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs mt-1">معاينات</span>
          </button>
          <button
            onClick={() => setActiveTab('deals')}
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'deals' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <FileText className="w-5 h-5" />
            <span className="text-xs mt-1">صفقات</span>
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`flex flex-col items-center py-2 px-4 ${activeTab === 'payments' ? 'text-blue-600' : 'text-gray-500'}`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-xs mt-1">مدفوعات</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
