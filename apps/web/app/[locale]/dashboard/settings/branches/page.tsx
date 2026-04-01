'use client';

// ═══════════════════════════════════════════════════════════════
// Branches Page - إدارة الفروع
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { PERMISSIONS } from '@realestate/shared-types';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  MapPin,
  Phone,
  Mail,
  Users,
  Home,
  Star,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

// Types
interface Branch {
  id: string;
  name: string;
  nameAr?: string;
  etaBranchCode?: string;
  isHeadquarters: boolean;
  isActive: boolean;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  createdAt: string;
  _count?: {
    users: number;
    properties: number;
  };
}

interface BranchFormData {
  name: string;
  nameAr: string;
  etaBranchCode: string;
  isHeadquarters: boolean;
  address: string;
  city: string;
  phone: string;
  email: string;
}

// Egyptian cities
const EGYPTIAN_CITIES = [
  'القاهرة', 'الجيزة', 'الإسكندرية', 'المنصورة', 'طنطا', 'المنيا',
  'أسيوط', 'أسوان', 'الأقصر', 'شرم الشيخ', 'الغردقة', 'دمنهور',
  'كفر الشيخ', 'السويس', 'بورسعيد', 'الإسماعيلية', 'الزقازيق',
];

// ETA Branch Codes (example)
const ETA_BRANCH_CODES = [
  { code: 'BR-001', name: 'المقر الرئيسي' },
  { code: 'BR-002', name: 'فرع 1' },
  { code: 'BR-003', name: 'فرع 2' },
  { code: 'BR-004', name: 'فرع 3' },
];

// Initial form data
const initialFormData: BranchFormData = {
  name: '',
  nameAr: '',
  etaBranchCode: '',
  isHeadquarters: false,
  address: '',
  city: '',
  phone: '',
  email: '',
};

export default function BranchesPage() {
  const { user } = useAuthStore();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [formData, setFormData] = useState<BranchFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Branch | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      
      const response = await api.get(`/branches?${params.toString()}`);
      setBranches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle form change
  const handleChange = (field: keyof BranchFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      errors.name = 'اسم الفرع مطلوب';
    }
    if (!formData.city.trim()) {
      errors.city = 'المدينة مطلوبة';
    }
    if (!formData.address.trim()) {
      errors.address = 'العنوان مطلوب';
    }
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData(initialFormData);
    setEditingBranch(null);
    setFormErrors({});
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (branch: Branch) => {
    setFormData({
      name: branch.name,
      nameAr: branch.nameAr || '',
      etaBranchCode: branch.etaBranchCode || '',
      isHeadquarters: branch.isHeadquarters,
      address: branch.address,
      city: branch.city,
      phone: branch.phone || '',
      email: branch.email || '',
    });
    setEditingBranch(branch);
    setFormErrors({});
    setShowModal(true);
  };

  // Save branch
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, formData);
        showNotification('success', 'تم تحديث الفرع بنجاح');
      } else {
        await api.post('/branches', formData);
        showNotification('success', 'تم إنشاء الفرع بنجاح');
      }
      setShowModal(false);
      fetchBranches();
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Delete branch
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await api.delete(`/branches/${deleteConfirm.id}`);
      showNotification('success', 'تم حذف الفرع بنجاح');
      setDeleteConfirm(null);
      fetchBranches();
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    }
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
    <PermissionGate permissions={[PERMISSIONS.BRANCHES_READ]}>
      <div className="space-y-6 animate-fade-in">
        {/* Notification */}
        {notification && (
          <div
            className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
              notification.type === 'success' ? 'bg-green-500' : 'bg-red-500'
            } text-white`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            {notification.message}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">إدارة الفروع</h1>
            <p className="text-gray-500 mt-1">إضافة وتعديل وحذف فروع المكتب</p>
          </div>
          <PermissionGate permissions={[PERMISSIONS.BRANCHES_WRITE]}>
            <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              إضافة فرع جديد
            </button>
          </PermissionGate>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو المدينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pr-10"
          />
        </div>

        {/* Branches Grid */}
        {branches.length === 0 ? (
          <EmptyState
            title="لا توجد فروع"
            description="ابدأ بإضافة فرع جديد للمكتب"
            action={{
              label: 'إضافة فرع',
              onClick: openCreateModal,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className={`card hover:shadow-md transition-shadow ${
                  !branch.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${branch.isHeadquarters ? 'bg-yellow-100' : 'bg-blue-100'}`}>
                      <Building2 className={`w-5 h-5 ${branch.isHeadquarters ? 'text-yellow-600' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{branch.nameAr || branch.name}</h3>
                      {branch.isHeadquarters && (
                        <span className="text-xs text-yellow-600 flex items-center gap-1">
                          <Star className="w-3 h-3" />
                          المقر الرئيسي
                        </span>
                      )}
                    </div>
                  </div>
                  <PermissionGate permissions={[PERMISSIONS.BRANCHES_WRITE]}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(branch)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      {!branch.isHeadquarters && (
                        <button
                          onClick={() => setDeleteConfirm(branch)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      )}
                    </div>
                  </PermissionGate>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span>{branch.city} - {branch.address}</span>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span dir="ltr">{branch.phone}</span>
                    </div>
                  )}
                  {branch.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span dir="ltr">{branch.email}</span>
                    </div>
                  )}
                  {branch.etaBranchCode && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        ETA: {branch.etaBranchCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-sm">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Users className="w-4 h-4" />
                    <span>{branch._count?.users || 0} مستخدم</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-500">
                    <Home className="w-4 h-4" />
                    <span>{branch._count?.properties || 0} عقار</span>
                  </div>
                </div>

                {!branch.isActive && (
                  <div className="mt-3 text-xs text-red-600 bg-red-50 px-2 py-1 rounded text-center">
                    غير نشط
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {editingBranch ? 'تعديل الفرع' : 'إضافة فرع جديد'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم الفرع (EN) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      className={`input ${formErrors.name ? 'border-red-500' : ''}`}
                      placeholder="Branch Name"
                    />
                    {formErrors.name && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم الفرع (AR)
                    </label>
                    <input
                      type="text"
                      value={formData.nameAr}
                      onChange={(e) => handleChange('nameAr', e.target.value)}
                      className="input"
                      placeholder="اسم الفرع"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    كود فرع ETA
                  </label>
                  <select
                    value={formData.etaBranchCode}
                    onChange={(e) => handleChange('etaBranchCode', e.target.value)}
                    className="input"
                  >
                    <option value="">اختر كود الفرع</option>
                    {ETA_BRANCH_CODES.map((code) => (
                      <option key={code.code} value={code.code}>
                        {code.code} - {code.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    الرمز المستخدم في الفوترة الإلكترونية المصرية
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      المدينة *
                    </label>
                    <select
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className={`input ${formErrors.city ? 'border-red-500' : ''}`}
                    >
                      <option value="">اختر المدينة</option>
                      {EGYPTIAN_CITIES.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                    {formErrors.city && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.city}</p>
                    )}
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    العنوان *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleChange('address', e.target.value)}
                    className={`input ${formErrors.address ? 'border-red-500' : ''}`}
                    rows={2}
                    placeholder="العنوان التفصيلي..."
                  />
                  {formErrors.address && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`input ${formErrors.email ? 'border-red-500' : ''}`}
                    placeholder="branch@company.com"
                    dir="ltr"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>

                {!editingBranch?.isHeadquarters && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.isHeadquarters}
                      onChange={(e) => handleChange('isHeadquarters', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-gray-700">تعيين كمقر رئيسي</span>
                  </label>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  {saving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">تأكيد الحذف</h3>
                <p className="text-gray-600 mb-6">
                  هل أنت متأكد من حذف فرع "{deleteConfirm.nameAr || deleteConfirm.name}"؟
                  <br />
                  <span className="text-sm text-red-500">هذا الإجراء لا يمكن التراجع عنه</span>
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="btn btn-outline"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={handleDelete}
                    className="btn btn-danger"
                  >
                    حذف الفرع
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
