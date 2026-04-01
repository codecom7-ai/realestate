'use client';

// ═══════════════════════════════════════════════════════════════
// Settings Page - إعدادات النظام
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';
import IntegrationsSettings from '@/components/settings/IntegrationsSettings';
import {
  Building2,
  Users,
  Bell,
  Shield,
  Palette,
  Globe,
  ChevronLeft,
  Save,
  Loader2,
  Check,
  Server,
} from 'lucide-react';

// Types
interface Organization {
  id: string;
  name: string;
  nameAr: string;
  slug: string;
  taxId: string;
  brokerLicenseNo: string;
  classification: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  logoUrl?: string;
  settings: {
    defaultCurrency: string;
    defaultLanguage: string;
    timezone: string;
    commissionDefaults: {
      brokerRate: number;
      managerRate: number;
      companyRate: number;
    };
    notifications: {
      emailEnabled: boolean;
      smsEnabled: boolean;
      whatsappEnabled: boolean;
    };
  };
}

// Settings Navigation
const settingsNav = [
  { key: 'organization', icon: Building2, label: 'بيانات المكتب', href: '/dashboard/settings' },
  { key: 'branches', icon: Building2, label: 'الفروع', href: '/dashboard/settings/branches' },
  { key: 'users', icon: Users, label: 'المستخدمين', href: '/dashboard/settings/users' },
  { key: 'integrations', icon: Server, label: 'التكاملات', href: '#integrations' },
  { key: 'appearance', icon: Palette, label: 'المظهر', href: '#appearance' },
  { key: 'language', icon: Globe, label: 'اللغة', href: '#language' },
  { key: 'notifications', icon: Bell, label: 'الإشعارات', href: '#notifications' },
  { key: 'security', icon: Shield, label: 'الأمان', href: '#security' },
];

// Languages
const LANGUAGES = [
  { code: 'ar', name: 'العربية', direction: 'rtl' },
  { code: 'en', name: 'English', direction: 'ltr' },
];

// Themes
const THEMES = [
  { value: 'light', label: 'فاتح', icon: '☀️' },
  { value: 'dark', label: 'داكن', icon: '🌙' },
  { value: 'system', label: 'تلقائي', icon: '💻' },
];

// Currencies
const CURRENCIES = [
  { code: 'EGP', name: 'جنيه مصري', symbol: 'ج.م' },
  { code: 'USD', name: 'دولار أمريكي', symbol: '$' },
  { code: 'SAR', name: 'ريال سعودي', symbol: 'ر.س' },
  { code: 'AED', name: 'درهم إماراتي', symbol: 'د.إ' },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [activeSection, setActiveSection] = useState('organization');
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    nameAr: '',
    taxId: '',
    brokerLicenseNo: '',
    classification: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    defaultCurrency: 'EGP',
    defaultLanguage: 'ar',
    timezone: 'Africa/Cairo',
    brokerRate: 30,
    managerRate: 5,
    companyRate: 65,
    emailNotifications: true,
    smsNotifications: false,
    whatsappNotifications: true,
  });

  // Theme state
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('ar');

  // Fetch organization
  useEffect(() => {
    const fetchOrganization = async () => {
      try {
        const response = await api.get('/organization');
        const org = response.data.data;
        setOrganization(org);
        setFormData({
          name: org.name || '',
          nameAr: org.nameAr || '',
          taxId: org.taxId || '',
          brokerLicenseNo: org.brokerLicenseNo || '',
          classification: org.classification || '',
          phone: org.phone || '',
          email: org.email || '',
          address: org.address || '',
          city: org.city || '',
          defaultCurrency: org.settings?.defaultCurrency || 'EGP',
          defaultLanguage: org.settings?.defaultLanguage || 'ar',
          timezone: org.settings?.timezone || 'Africa/Cairo',
          brokerRate: org.settings?.commissionDefaults?.brokerRate || 30,
          managerRate: org.settings?.commissionDefaults?.managerRate || 5,
          companyRate: org.settings?.commissionDefaults?.companyRate || 65,
          emailNotifications: org.settings?.notifications?.emailEnabled ?? true,
          smsNotifications: org.settings?.notifications?.smsEnabled ?? false,
          whatsappNotifications: org.settings?.notifications?.whatsappEnabled ?? true,
        });
      } catch (error) {
        console.error('Failed to fetch organization:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, []);

  // Handle form change
  const handleChange = (field: string, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  // Save settings
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch('/organization', {
        name: formData.name,
        nameAr: formData.nameAr,
        taxId: formData.taxId,
        brokerLicenseNo: formData.brokerLicenseNo,
        classification: formData.classification,
        phone: formData.phone,
        email: formData.email,
        address: formData.address,
        city: formData.city,
      });

      await api.patch('/organization/settings', {
        defaultCurrency: formData.defaultCurrency,
        defaultLanguage: formData.defaultLanguage,
        timezone: formData.timezone,
        commissionDefaults: {
          brokerRate: formData.brokerRate,
          managerRate: formData.managerRate,
          companyRate: formData.companyRate,
        },
        notifications: {
          emailEnabled: formData.emailNotifications,
          smsEnabled: formData.smsNotifications,
          whatsappEnabled: formData.whatsappNotifications,
        },
      });

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.ORG_SETTINGS_READ]}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">الإعدادات</h1>
            <p className="text-gray-500 mt-1">إدارة إعدادات النظام والمكتب</p>
          </div>
          {activeSection !== 'integrations' && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <Check className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? 'جاري الحفظ...' : saved ? 'تم الحفظ' : 'حفظ التغييرات'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="card p-2">
              <nav className="space-y-1">
                {settingsNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.key;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      onClick={() => setActiveSection(item.key)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                        ${isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-gray-600 hover:bg-gray-100'
                        }
                      `}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                      {item.key !== 'organization' && item.key !== 'integrations' && (
                        <ChevronLeft className="w-4 h-4 mr-auto" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Integrations Section */}
            {activeSection === 'integrations' ? (
              <IntegrationsSettings />
            ) : (
              <>
                {/* Organization Settings */}
                <div className="card" id="organization">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    بيانات المكتب
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        اسم المكتب (EN)
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="input"
                        placeholder="Office Name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        اسم المكتب (AR)
                      </label>
                      <input
                        type="text"
                        value={formData.nameAr}
                        onChange={(e) => handleChange('nameAr', e.target.value)}
                        className="input"
                        placeholder="اسم المكتب"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        الرقم الضريبي (RIN)
                      </label>
                      <input
                        type="text"
                        value={formData.taxId}
                        onChange={(e) => handleChange('taxId', e.target.value)}
                        className="input"
                        placeholder="123456789"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم ترخيص السمسرة
                      </label>
                      <input
                        type="text"
                        value={formData.brokerLicenseNo}
                        onChange={(e) => handleChange('brokerLicenseNo', e.target.value)}
                        className="input"
                        placeholder="BR-12345"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        التصنيف
                      </label>
                      <select
                        value={formData.classification}
                        onChange={(e) => handleChange('classification', e.target.value)}
                        className="input"
                      >
                        <option value="">اختر التصنيف</option>
                        <option value="A">درجة أ</option>
                        <option value="B">درجة ب</option>
                        <option value="C">درجة ج</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        رقم الهاتف
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="input"
                        placeholder="+20 123 456 7890"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        البريد الإلكتروني
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="input"
                        placeholder="info@company.com"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المدينة
                      </label>
                      <select
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="input"
                      >
                        <option value="">اختر المدينة</option>
                        <option value="القاهرة">القاهرة</option>
                        <option value="الجيزة">الجيزة</option>
                        <option value="الإسكندرية">الإسكندرية</option>
                        <option value="المنصورة">المنصورة</option>
                        <option value="طنطا">طنطا</option>
                        <option value="المنيا">المنيا</option>
                        <option value="أسيوط">أسيوط</option>
                        <option value="أسوان">أسوان</option>
                        <option value="الأقصر">الأقصر</option>
                        <option value="شرم الشيخ">شرم الشيخ</option>
                        <option value="الغردقة">الغردقة</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        العنوان
                      </label>
                      <textarea
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        className="input"
                        rows={2}
                        placeholder="العنوان التفصيلي..."
                      />
                    </div>
                  </div>
                </div>

                {/* Theme Settings */}
                <div className="card" id="appearance">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-primary" />
                    المظهر
                  </h2>
                  <div className="grid grid-cols-3 gap-4">
                    {THEMES.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTheme(t.value)}
                        className={`
                          p-4 rounded-lg border-2 transition-all text-center
                          ${theme === t.value
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <span className="text-2xl">{t.icon}</span>
                        <p className="mt-2 font-medium">{t.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Language Settings */}
                <div className="card" id="language">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    اللغة
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`
                          p-4 rounded-lg border-2 transition-all text-center
                          ${language === lang.code
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-gray-300'
                          }
                        `}
                      >
                        <p className="font-medium text-lg">{lang.name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {lang.direction === 'rtl' ? 'من اليمين لليسار' : 'من اليسار لليمين'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Regional Settings */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-primary" />
                    الإعدادات الإقليمية
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        العملة الافتراضية
                      </label>
                      <select
                        value={formData.defaultCurrency}
                        onChange={(e) => handleChange('defaultCurrency', e.target.value)}
                        className="input"
                      >
                        {CURRENCIES.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.name} ({c.symbol})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        المنطقة الزمنية
                      </label>
                      <select
                        value={formData.timezone}
                        onChange={(e) => handleChange('timezone', e.target.value)}
                        className="input"
                      >
                        <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                        <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                        <option value="Asia/Dubai">دبي (GMT+4)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Commission Settings */}
                <div className="card">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    إعدادات العمولة
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        نسبة السمسار (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.brokerRate}
                        onChange={(e) => handleChange('brokerRate', parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        نسبة المدير (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.managerRate}
                        onChange={(e) => handleChange('managerRate', parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        نسبة الشركة (%)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.companyRate}
                        onChange={(e) => handleChange('companyRate', parseFloat(e.target.value) || 0)}
                        className="input"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    إجمالي النسب: {formData.brokerRate + formData.managerRate + formData.companyRate}%
                    {formData.brokerRate + formData.managerRate + formData.companyRate !== 100 && (
                      <span className="text-red-500 mr-2">(يجب أن يكون المجموع 100%)</span>
                    )}
                  </p>
                </div>

                {/* Notification Settings */}
                <div className="card" id="notifications">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    إعدادات الإشعارات
                  </h2>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">إشعارات البريد الإلكتروني</p>
                        <p className="text-sm text-gray-500">استلام الإشعارات عبر البريد</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.emailNotifications}
                        onChange={(e) => handleChange('emailNotifications', e.target.checked)}
                        className="w-5 h-5 accent-primary"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">إشعارات SMS</p>
                        <p className="text-sm text-gray-500">استلام الإشعارات عبر الرسائل القصيرة</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.smsNotifications}
                        onChange={(e) => handleChange('smsNotifications', e.target.checked)}
                        className="w-5 h-5 accent-primary"
                      />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">إشعارات واتساب</p>
                        <p className="text-sm text-gray-500">استلام الإشعارات عبر واتساب</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={formData.whatsappNotifications}
                        onChange={(e) => handleChange('whatsappNotifications', e.target.checked)}
                        className="w-5 h-5 accent-primary"
                      />
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
