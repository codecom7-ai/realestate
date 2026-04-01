'use client';

// ═══════════════════════════════════════════════════════════════
// Users Page - إدارة المستخدمين
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { PermissionGate } from '@/components/shared/PermissionGate';
import { EmptyState } from '@/components/shared/EmptyState';
import { SkeletonCard } from '@/components/shared/SkeletonLoader';
import { PERMISSIONS, UserRole } from '@realestate/shared-types';
import {
  Users,
  Plus,
  Search,
  Edit,
  Trash2,
  Mail,
  Phone,
  Shield,
  Building2,
  MoreVertical,
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  UserPlus,
  Key,
  Send,
} from 'lucide-react';

// Types
interface User {
  id: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  role: UserRole;
  permissions: string[];
  branchId?: string;
  branch?: {
    id: string;
    name: string;
    nameAr?: string;
  };
  avatarUrl?: string;
  isMfaEnabled: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface UserFormData {
  firstName: string;
  lastName: string;
  firstNameAr: string;
  lastNameAr: string;
  email: string;
  phone: string;
  role: UserRole;
  branchId: string;
  sendInvite: boolean;
}

interface Branch {
  id: string;
  name: string;
  nameAr?: string;
}

// Role labels in Arabic
const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'المالك',
  [UserRole.GENERAL_MANAGER]: 'المدير العام',
  [UserRole.SALES_MANAGER]: 'مدير المبيعات',
  [UserRole.BROKER]: 'سمسار',
  [UserRole.ACCOUNTANT]: 'محاسب',
  [UserRole.COMPLIANCE_OFFICER]: 'مسؤول الامتثال',
  [UserRole.FIELD_AGENT]: 'مندوب ميداني',
  [UserRole.RECEPTIONIST]: 'موظف استقبال',
  [UserRole.READ_ONLY]: 'قراءة فقط',
};

// Role colors
const ROLE_COLORS: Record<UserRole, string> = {
  [UserRole.OWNER]: 'bg-yellow-100 text-yellow-800',
  [UserRole.GENERAL_MANAGER]: 'bg-purple-100 text-purple-800',
  [UserRole.SALES_MANAGER]: 'bg-blue-100 text-blue-800',
  [UserRole.BROKER]: 'bg-green-100 text-green-800',
  [UserRole.ACCOUNTANT]: 'bg-cyan-100 text-cyan-800',
  [UserRole.COMPLIANCE_OFFICER]: 'bg-red-100 text-red-800',
  [UserRole.FIELD_AGENT]: 'bg-orange-100 text-orange-800',
  [UserRole.RECEPTIONIST]: 'bg-pink-100 text-pink-800',
  [UserRole.READ_ONLY]: 'bg-gray-100 text-gray-800',
};

// Initial form data
const initialFormData: UserFormData = {
  firstName: '',
  lastName: '',
  firstNameAr: '',
  lastNameAr: '',
  email: '',
  phone: '',
  role: UserRole.BROKER,
  branchId: '',
  sendInvite: true,
};

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (roleFilter) params.set('role', roleFilter);
      
      const response = await api.get(`/users?${params.toString()}`);
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  // Fetch branches
  const fetchBranches = useCallback(async () => {
    try {
      const response = await api.get('/branches?limit=100');
      setBranches(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchBranches();
  }, [fetchUsers, fetchBranches]);

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  // Handle form change
  const handleChange = (field: keyof UserFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      errors.firstName = 'الاسم الأول مطلوب';
    }
    if (!formData.lastName.trim()) {
      errors.lastName = 'اسم العائلة مطلوب';
    }
    if (!formData.email.trim()) {
      errors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'البريد الإلكتروني غير صالح';
    }
    if (!formData.role) {
      errors.role = 'الدور مطلوب';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Open create modal
  const openCreateModal = () => {
    setFormData({ ...initialFormData, branchId: currentUser?.branchId || '' });
    setEditingUser(null);
    setFormErrors({});
    setShowModal(true);
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setFormData({
      firstName: user.firstName,
      lastName: user.lastName,
      firstNameAr: user.firstNameAr || '',
      lastNameAr: user.lastNameAr || '',
      email: user.email,
      phone: user.phone || '',
      role: user.role,
      branchId: user.branchId || '',
      sendInvite: false,
    });
    setEditingUser(user);
    setFormErrors({});
    setShowModal(true);
  };

  // Save user
  const handleSave = async () => {
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      if (editingUser) {
        await api.patch(`/users/${editingUser.id}`, formData);
        showNotification('success', 'تم تحديث المستخدم بنجاح');
      } else {
        await api.post('/users', formData);
        showNotification('success', 'تم إنشاء المستخدم بنجاح');
      }
      setShowModal(false);
      fetchUsers();
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Delete user
  const handleDelete = async () => {
    if (!deleteConfirm) return;
    
    try {
      await api.delete(`/users/${deleteConfirm.id}`);
      showNotification('success', 'تم حذف المستخدم بنجاح');
      setDeleteConfirm(null);
      fetchUsers();
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    }
  };

  // Send invite
  const handleSendInvite = async () => {
    if (!inviteEmail.trim()) return;
    
    setSaving(true);
    try {
      await api.post('/users/invite', { email: inviteEmail });
      showNotification('success', 'تم إرسال الدعوة بنجاح');
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error: any) {
      const message = error.response?.data?.error?.messageAr || 'حدث خطأ';
      showNotification('error', message);
    } finally {
      setSaving(false);
    }
  };

  // Get user initials
  const getUserInitials = (user: User) => {
    return ((user.firstNameAr || user.firstName).charAt(0) + (user.lastNameAr || user.lastName).charAt(0)).toUpperCase();
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
    <PermissionGate permissions={[PERMISSIONS.USERS_READ]}>
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
            <h1 className="text-2xl font-bold text-gray-900">إدارة المستخدمين</h1>
            <p className="text-gray-500 mt-1">إضافة وتعديل وحذف مستخدمي النظام</p>
          </div>
          <PermissionGate permissions={[PERMISSIONS.USERS_WRITE]}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowInviteModal(true)}
                className="btn btn-outline flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                دعوة مستخدم
              </button>
              <button onClick={openCreateModal} className="btn btn-primary flex items-center gap-2">
                <Plus className="w-4 h-4" />
                إضافة مستخدم
              </button>
            </div>
          </PermissionGate>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو البريد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-10"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="input w-full sm:w-48"
          >
            <option value="">جميع الأدوار</option>
            {Object.entries(ROLE_LABELS).map(([role, label]) => (
              <option key={role} value={role}>{label}</option>
            ))}
          </select>
        </div>

        {/* Users Grid */}
        {users.length === 0 ? (
          <EmptyState
            title="لا يوجد مستخدمين"
            description="ابدأ بإضافة مستخدم جديد للنظام"
            action={{
              label: 'إضافة مستخدم',
              onClick: openCreateModal,
            }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((user) => (
              <div
                key={user.id}
                className={`card hover:shadow-md transition-shadow ${
                  !user.isActive ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-lg">
                        {getUserInitials(user)}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {user.firstNameAr || user.firstName} {user.lastNameAr || user.lastName}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>
                  </div>
                  <PermissionGate permissions={[PERMISSIONS.USERS_WRITE]}>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-500" />
                      </button>
                      {user.role !== UserRole.OWNER && (
                        <button
                          onClick={() => setDeleteConfirm(user)}
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
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span dir="ltr">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span dir="ltr">{user.phone}</span>
                    </div>
                  )}
                  {user.branch && (
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span>{user.branch.nameAr || user.branch.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span>{user.permissions.length} صلاحية</span>
                    {user.isMfaEnabled && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        MFA
                      </span>
                    )}
                  </div>
                </div>

                {!user.isActive && (
                  <div className="mt-3 text-xs text-red-600 bg-red-50 px-2 py-1 rounded text-center">
                    غير نشط
                  </div>
                )}

                {!user.isEmailVerified && (
                  <div className="mt-3 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded text-center">
                    البريد غير مؤكد
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
                  {editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}
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
                      الاسم الأول (EN) *
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      className={`input ${formErrors.firstName ? 'border-red-500' : ''}`}
                    />
                    {formErrors.firstName && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم العائلة (EN) *
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) => handleChange('lastName', e.target.value)}
                      className={`input ${formErrors.lastName ? 'border-red-500' : ''}`}
                    />
                    {formErrors.lastName && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الاسم الأول (AR)
                    </label>
                    <input
                      type="text"
                      value={formData.firstNameAr}
                      onChange={(e) => handleChange('firstNameAr', e.target.value)}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      اسم العائلة (AR)
                    </label>
                    <input
                      type="text"
                      value={formData.lastNameAr}
                      onChange={(e) => handleChange('lastNameAr', e.target.value)}
                      className="input"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    البريد الإلكتروني *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className={`input ${formErrors.email ? 'border-red-500' : ''}`}
                    dir="ltr"
                  />
                  {formErrors.email && (
                    <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="input"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      الدور *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleChange('role', e.target.value as UserRole)}
                      className={`input ${formErrors.role ? 'border-red-500' : ''}`}
                    >
                      {Object.entries(ROLE_LABELS).map(([role, label]) => (
                        <option key={role} value={role}>{label}</option>
                      ))}
                    </select>
                    {formErrors.role && (
                      <p className="text-xs text-red-500 mt-1">{formErrors.role}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    الفرع
                  </label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => handleChange('branchId', e.target.value)}
                    className="input"
                  >
                    <option value="">بدون فرع</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nameAr || branch.name}
                      </option>
                    ))}
                  </select>
                </div>

                {!editingUser && (
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.sendInvite}
                      onChange={(e) => handleChange('sendInvite', e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-gray-700">إرسال دعوة للمستخدم</span>
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

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md p-6">
              <div className="text-center mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserPlus className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">دعوة مستخدم جديد</h3>
                <p className="text-sm text-gray-500 mt-1">
                  أرسل دعوة بالبريد الإلكتروني لمستخدم جديد
                </p>
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="input"
                  placeholder="البريد الإلكتروني"
                  dir="ltr"
                />
              </div>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-outline"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleSendInvite}
                  disabled={saving || !inviteEmail.trim()}
                  className="btn btn-primary flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  إرسال الدعوة
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
                  هل أنت متأكد من حذف المستخدم "{deleteConfirm.firstNameAr || deleteConfirm.firstName}"؟
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
                    حذف المستخدم
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
