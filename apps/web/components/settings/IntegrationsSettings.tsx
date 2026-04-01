'use client';

// ═══════════════════════════════════════════════════════════════
// Integrations Settings - إعدادات التكاملات
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { PERMISSIONS } from '@realestate/shared-types';
import { api } from '@/lib/api';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  TestTube,
  Save,
  Server,
  Bot,
  CreditCard,
  Cloud,
  MessageCircle,
  Flame,
} from 'lucide-react';

// Types
interface SettingItem {
  id: string;
  category: string;
  key: string;
  value?: string;
  isSecret: boolean;
  maskedValue?: string;
  verificationStatus?: string;
  lastVerifiedAt?: string;
  verificationError?: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingCategory {
  category: string;
  categoryAr: string;
  settings: SettingItem[];
  configuredCount: number;
  totalCount: number;
}

interface AllSettings {
  categories: SettingCategory[];
}

// Icons per category
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  eta: Server,
  ai: Bot,
  payments: CreditCard,
  storage: Cloud,
  whatsapp: MessageCircle,
  firebase: Flame,
};

// Colors per category
const CATEGORY_COLORS: Record<string, string> = {
  eta: 'text-blue-600 bg-blue-50',
  ai: 'text-purple-600 bg-purple-50',
  payments: 'text-green-600 bg-green-50',
  storage: 'text-orange-600 bg-orange-50',
  whatsapp: 'text-emerald-600 bg-emerald-50',
  firebase: 'text-amber-600 bg-amber-50',
};

export default function IntegrationsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [visibleValues, setVisibleValues] = useState<Set<string>>(new Set());
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message?: string; error?: string }>>({});

  // Fetch settings
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/settings');
      setSettings(response.data.data);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle value visibility
  const toggleVisibility = (key: string) => {
    const newVisible = new Set(visibleValues);
    if (newVisible.has(key)) {
      newVisible.delete(key);
    } else {
      newVisible.add(key);
    }
    setVisibleValues(newVisible);
  };

  // Handle edit value change
  const handleEditChange = (category: string, key: string, value: string) => {
    setEditValues(prev => ({
      ...prev,
      [`${category}_${key}`]: value,
    }));
  };

  // Save setting
  const saveSetting = async (category: string, key: string) => {
    const value = editValues[`${category}_${key}`];
    if (value === undefined) return;

    setSaving(`${category}_${key}`);
    try {
      await api.patch(`/settings/${category}/${key}`, { value });
      await fetchSettings();
      // Clear edit value after save
      setEditValues(prev => {
        const newValues = { ...prev };
        delete newValues[`${category}_${key}`];
        return newValues;
      });
    } catch (error) {
      console.error('Failed to save setting:', error);
    } finally {
      setSaving(null);
    }
  };

  // Save all category settings
  const saveCategorySettings = async (category: string) => {
    const settingsToSave = Object.entries(editValues)
      .filter(([key]) => key.startsWith(`${category}_`))
      .map(([key, value]) => ({
        key: key.replace(`${category}_`, ''),
        value,
      }));

    if (settingsToSave.length === 0) return;

    setSaving(category);
    try {
      await api.patch(`/settings/${category}`, { settings: settingsToSave });
      await fetchSettings();
      // Clear edit values for this category
      setEditValues(prev => {
        const newValues = { ...prev };
        Object.keys(newValues).forEach(key => {
          if (key.startsWith(`${category}_`)) {
            delete newValues[key];
          }
        });
        return newValues;
      });
    } catch (error) {
      console.error('Failed to save category settings:', error);
    } finally {
      setSaving(null);
    }
  };

  // Test connection
  const testConnection = async (category: string) => {
    setTesting(category);
    setTestResults(prev => ({ ...prev, [category]: { success: false } }));
    try {
      const response = await api.post(`/settings/test/${category}`);
      const result = response.data.data;
      setTestResults(prev => ({
        ...prev,
        [category]: {
          success: result.success,
          message: result.message,
          error: result.error,
        },
      }));
    } catch (error: any) {
      setTestResults(prev => ({
        ...prev,
        [category]: {
          success: false,
          error: error.response?.data?.error?.message || 'فشل الاتصال',
        },
      }));
    } finally {
      setTesting(null);
    }
  };

  // Get current value (edited or original)
  const getCurrentValue = (setting: SettingItem): string => {
    const editKey = `${setting.category}_${setting.key}`;
    return editValues[editKey] !== undefined ? editValues[editKey] : (setting.maskedValue || '');
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (category: string): boolean => {
    return Object.keys(editValues).some(key => key.startsWith(`${category}_`));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.INTEGRATIONS_READ]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Server className="w-6 h-6 text-primary" />
              التكاملات والإعدادات المتقدمة
            </h2>
            <p className="text-gray-500 mt-1">
              إدارة مفاتيح API وإعدادات التكامل مع الخدمات الخارجية
            </p>
          </div>
          <button
            onClick={fetchSettings}
            className="btn btn-outline flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            تحديث
          </button>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          {settings?.categories.map((category) => {
            const Icon = CATEGORY_ICONS[category.category] || Server;
            const colorClass = CATEGORY_COLORS[category.category] || 'text-gray-600 bg-gray-50';
            const isExpanded = expandedCategory === category.category;
            const testResult = testResults[category.category];

            return (
              <div key={category.category} className="card overflow-hidden">
                {/* Category Header */}
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : category.category)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="text-right">
                      <h3 className="font-semibold text-gray-900">{category.categoryAr}</h3>
                      <p className="text-sm text-gray-500">
                        {category.configuredCount} / {category.totalCount} مُكوَّن
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {hasUnsavedChanges(category.category) && (
                      <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                        تغييرات غير محفوظة
                      </span>
                    )}
                    <div className="w-3 h-3 rounded-full bg-gray-200" />
                  </div>
                </button>

                {/* Category Content */}
                {isExpanded && (
                  <div className="border-t p-4 space-y-4">
                    {/* Settings Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.settings.map((setting) => (
                        <div key={setting.key} className="space-y-1">
                          <label className="block text-sm font-medium text-gray-700">
                            {setting.key}
                            {setting.isSecret && (
                              <span className="mr-1 text-xs text-red-500">(سري)</span>
                            )}
                          </label>
                          <div className="relative">
                            <input
                              type={setting.isSecret && !visibleValues.has(`${setting.category}_${setting.key}`) ? 'password' : 'text'}
                              value={getCurrentValue(setting)}
                              onChange={(e) => handleEditChange(setting.category, setting.key, e.target.value)}
                              className="input pl-10 pr-10"
                              placeholder={`أدخل ${setting.key}`}
                              dir="ltr"
                            />
                            {setting.isSecret && (
                              <button
                                type="button"
                                onClick={() => toggleVisibility(`${setting.category}_${setting.key}`)}
                                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                              >
                                {visibleValues.has(`${setting.category}_${setting.key}`) ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                          {setting.verificationStatus && setting.verificationStatus !== 'untested' && (
                            <div className={`flex items-center gap-1 text-xs ${
                              setting.verificationStatus === 'success' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {setting.verificationStatus === 'success' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              <span>
                                {setting.verificationStatus === 'success'
                                  ? 'تم التحقق'
                                  : setting.verificationError || 'فشل التحقق'}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        {testResult && (
                          <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                            testResult.success
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {testResult.success ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span>{testResult.success ? testResult.message : testResult.error}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <PermissionGate permissions={[PERMISSIONS.INTEGRATIONS_WRITE]}>
                          <button
                            onClick={() => testConnection(category.category)}
                            disabled={testing === category.category}
                            className="btn btn-outline flex items-center gap-2"
                          >
                            {testing === category.category ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <TestTube className="w-4 h-4" />
                            )}
                            اختبار الاتصال
                          </button>
                          <button
                            onClick={() => saveCategorySettings(category.category)}
                            disabled={saving === category.category || !hasUnsavedChanges(category.category)}
                            className="btn btn-primary flex items-center gap-2"
                          >
                            {saving === category.category ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4" />
                            )}
                            حفظ التغييرات
                          </button>
                        </PermissionGate>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Security Notice */}
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="p-4 flex items-start gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Server className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <h4 className="font-medium text-yellow-800">تنبيه أمني</h4>
              <p className="text-sm text-yellow-700 mt-1">
                جميع المفاتيح الحساسة مشفرة بتقنية AES-256-GCM.
                يُنصح بعدم مشاركة هذه المفاتيح مع أي شخص غير مخول.
                فقط المالك والمدير العام يمكنهم الوصول لهذه الإعدادات.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PermissionGate>
  );
}
