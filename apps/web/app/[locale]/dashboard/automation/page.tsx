'use client';

// ═══════════════════════════════════════════════════════════════
// Automation Page - قواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { PERMISSIONS } from '@realestate/shared-types';
import {
  Zap,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Filter,
  RefreshCw,
} from 'lucide-react';

// Import automation components
import RuleBuilder, { AutomationRule } from '@/components/automation/RuleBuilder';
import RulesList from '@/components/automation/RulesList';

// Stats interface
interface AutomationStats {
  totalRules: number;
  activeRules: number;
  totalRuns: number;
  successRate?: number;
}

// Notification interface
interface Notification {
  type: 'success' | 'error' | 'info';
  message: string;
}

export default function AutomationPage() {
  // State
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [stats, setStats] = useState<AutomationStats>({
    totalRules: 0,
    activeRules: 0,
    totalRuns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Modal state
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<AutomationRule | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Show notification
  const showNotification = (type: Notification['type'], message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterActive !== null) params.append('isActive', String(filterActive));

      const [rulesRes, statsRes] = await Promise.all([
        api.get(`/automation/rules?${params.toString()}`),
        api.get('/automation/rules/stats'),
      ]);

      setRules(rulesRes.data.data || []);
      setStats(statsRes.data || { totalRules: 0, activeRules: 0, totalRuns: 0 });
    } catch (error) {
      console.error('Failed to fetch automation data:', error);
      showNotification('error', 'فشل في تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [search, filterActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open create modal
  const openCreateModal = () => {
    setEditingRule(null);
    setShowBuilder(true);
  };

  // Open edit modal
  const openEditModal = (rule: AutomationRule) => {
    setEditingRule(rule);
    setShowBuilder(true);
  };

  // Handle save rule
  const handleSaveRule = async (rule: AutomationRule) => {
    setSaving(true);
    try {
      if (editingRule?.id) {
        await api.patch(`/automation/rules/${editingRule.id}`, rule);
        showNotification('success', 'تم تحديث القاعدة بنجاح');
      } else {
        await api.post('/automation/rules', rule);
        showNotification('success', 'تم إنشاء القاعدة بنجاح');
      }
      setShowBuilder(false);
      setEditingRule(null);
      fetchData();
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Handle toggle rule
  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      await api.post(`/automation/rules/${rule.id}/toggle`, {
        isActive: !rule.isActive,
      });
      showNotification('success', rule.isActive ? 'تم إيقاف القاعدة' : 'تم تفعيل القاعدة');
      fetchData();
    } catch (error) {
      showNotification('error', 'فشل في تغيير حالة القاعدة');
    }
  };

  // Handle delete rule
  const handleDeleteRule = async () => {
    if (!deleteConfirm) return;

    try {
      await api.delete(`/automation/rules/${deleteConfirm.id}`);
      showNotification('success', 'تم حذف القاعدة بنجاح');
      setDeleteConfirm(null);
      fetchData();
    } catch (error) {
      showNotification('error', 'فشل في حذف القاعدة');
    }
  };

  // Handle duplicate rule
  const handleDuplicateRule = async (rule: AutomationRule) => {
    try {
      const newRule = {
        ...rule,
        id: undefined,
        name: `${rule.name} (نسخة)`,
        isActive: false,
      };
      await api.post('/automation/rules', newRule);
      showNotification('success', 'تم نسخ القاعدة بنجاح');
      fetchData();
    } catch (error) {
      showNotification('error', 'فشل في نسخ القاعدة');
    }
  };

  // Handle run now
  const handleRunNow = async (rule: AutomationRule) => {
    try {
      await api.post(`/automation/rules/${rule.id}/run`);
      showNotification('success', 'تم تشغيل القاعدة');
      fetchData();
    } catch (error) {
      showNotification('error', 'فشل في تشغيل القاعدة');
    }
  };

  // Handle test rule
  const handleTestRule = async (rule: AutomationRule) => {
    try {
      const result = await api.post(`/automation/rules/${rule.id || 'test'}/test`, rule);
      showNotification(
        result.data.matches ? 'success' : 'info',
        result.data.matches ? 'القاعدة تطابق البيانات' : 'القاعدة لا تطابق البيانات'
      );
    } catch (error) {
      showNotification('error', 'فشل في اختبار القاعدة');
    }
  };

  // Loading state
  if (loading && rules.length === 0) {
    return (
      <PermissionGate permissions={[PERMISSIONS.AUTOMATION_READ]}>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </PermissionGate>
    );
  }

  return (
    <PermissionGate permissions={[PERMISSIONS.AUTOMATION_READ]}>
      <div className="space-y-6 animate-fade-in">
        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-down ${
              notification.type === 'success'
                ? 'bg-green-500'
                : notification.type === 'error'
                ? 'bg-red-500'
                : 'bg-blue-500'
            } text-white`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : notification.type === 'error' ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Zap className="w-5 h-5" />
            )}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">قواعد الأتمتة</h1>
            <p className="text-gray-500 mt-1">
              إنشاء وإدارة قواعد الأتمتة التلقائية للنظام
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData()}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="تحديث"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <PermissionGate permissions={[PERMISSIONS.AUTOMATION_WRITE]}>
              <button
                onClick={openCreateModal}
                className="btn btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                إنشاء قاعدة
              </button>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-gray-900 dark:text-gray-100">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRules}</p>
                <p className="text-sm text-gray-500">إجمالي القواعد</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg text-gray-900 dark:text-gray-100">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.activeRules}</p>
                <p className="text-sm text-gray-500">القواعد النشطة</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg text-gray-900 dark:text-gray-100">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-600">{stats.totalRuns}</p>
                <p className="text-sm text-gray-500">مرات التشغيل</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg text-gray-900 dark:text-gray-100">
                <Filter className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-yellow-600">
                  {stats.successRate || 0}%
                </p>
                <p className="text-sm text-gray-500">معدل النجاح</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو المحفز..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-10"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterActive(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === null
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === true
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              نشط
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filterActive === false
                  ? 'bg-gray-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              متوقف
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="card overflow-hidden">
          {rules.length === 0 ? (
            <EmptyState
              title="لا توجد قواعد أتمتة"
              description="ابدأ بإنشاء قاعدة أتمتة جديدة لأتمتة العمليات المتكررة"
              action={{
                label: 'إنشاء قاعدة',
                onClick: openCreateModal,
              }}
              icon={<Zap className="w-12 h-12 text-gray-300" />}
            />
          ) : (
            <RulesList
              rules={rules}
              onEdit={openEditModal}
              onDelete={setDeleteConfirm}
              onToggle={handleToggleRule}
              onDuplicate={handleDuplicateRule}
              onRunNow={handleRunNow}
              loading={loading}
            />
          )}
        </div>

        {/* Rule Builder Modal */}
        {showBuilder && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
            <div className="my-8 w-full max-w-4xl">
              <RuleBuilder
                rule={editingRule}
                onSave={handleSaveRule}
                onCancel={() => {
                  setShowBuilder(false);
                  setEditingRule(null);
                }}
                onTest={handleTestRule}
                loading={saving}
              />
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6 text-gray-900 dark:text-gray-100">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-900 dark:text-gray-100">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف قاعدة "{deleteConfirm.name}"؟
                  <br />
                  <span className="text-sm text-red-500">لا يمكن التراجع عن هذا الإجراء</span>
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn btn-outline"
                  >
                    إلغاء
                  </button>
                  <button onClick={handleDeleteRule} className="btn btn-danger">
                    حذف القاعدة
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  );
}
