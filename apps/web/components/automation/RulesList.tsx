'use client';

// ═══════════════════════════════════════════════════════════════
// RulesList - جدول عرض القواعد الموجودة
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Play,
  Pause,
  Edit,
  Trash2,
  Copy,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Clock,
  Zap,
  AlertCircle,
  CheckCircle,
  Users,
  FileText,
  CreditCard,
  FileCheck,
  Eye,
  PenTool,
  Bell,
  MessageSquare,
  Mail,
  Settings,
  Webhook,
} from 'lucide-react';
import { AutomationRule } from './RuleBuilder';

// Trigger icons mapping
const TRIGGER_ICONS: Record<string, any> = {
  'lead.created': Users,
  'lead.stage_changed': Users,
  'lead.assigned': Users,
  'deal.created': FileText,
  'deal.stage_changed': FileText,
  'deal.closed': FileText,
  'payment.received': CreditCard,
  'payment.overdue': CreditCard,
  'document.uploaded': FileCheck,
  'document.expiring': FileCheck,
  'viewing.scheduled': Eye,
  'viewing.completed': Eye,
  'contract.signed': PenTool,
};

// Action icons mapping
const ACTION_ICONS: Record<string, any> = {
  send_notification: Bell,
  send_whatsapp: MessageSquare,
  send_email: Mail,
  create_task: FileText,
  update_field: Settings,
  assign_to: Users,
  trigger_webhook: Webhook,
};

// Trigger labels in Arabic
const TRIGGER_LABELS: Record<string, string> = {
  'lead.created': 'عميل محتمل جديد',
  'lead.stage_changed': 'تغيير مرحلة العميل',
  'lead.assigned': 'تعيين عميل',
  'deal.created': 'صفقة جديدة',
  'deal.stage_changed': 'تغيير مرحلة الصفقة',
  'deal.closed': 'إغلاق صفقة',
  'payment.received': 'استلام دفعة',
  'payment.overdue': 'تأخر دفعة',
  'document.uploaded': 'رفع مستند',
  'document.expiring': 'مستند منتهي الصلاحية',
  'viewing.scheduled': 'جدولة معاينة',
  'viewing.completed': 'إتمام معاينة',
  'contract.signed': 'توقيع عقد',
};

// Action labels in Arabic
const ACTION_LABELS: Record<string, string> = {
  send_notification: 'إرسال إشعار',
  send_whatsapp: 'إرسال واتساب',
  send_email: 'إرسال بريد',
  create_task: 'إنشاء مهمة',
  update_field: 'تحديث حقل',
  assign_to: 'تعيين لمسؤول',
  trigger_webhook: 'استدعاء Webhook',
};

// Props
interface RulesListProps {
  rules: AutomationRule[];
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onToggle: (rule: AutomationRule) => void;
  onDuplicate: (rule: AutomationRule) => void;
  onRunNow: (rule: AutomationRule) => void;
  loading?: boolean;
}

export default function RulesList({
  rules,
  onEdit,
  onDelete,
  onToggle,
  onDuplicate,
  onRunNow,
  loading = false,
}: RulesListProps) {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  // Toggle rule expansion
  const toggleExpand = (ruleId: string) => {
    setExpandedRules((prev) => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  // Format date
  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Empty state
  if (rules.length === 0) {
    return (
      <div className="text-center py-12">
        <Zap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">لا توجد قواعد</h3>
        <p className="text-gray-500 mt-1">ابدأ بإنشاء قاعدة أتمتة جديدة</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden">
      {/* Table Header */}
      <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
        <div className="col-span-4">القاعدة</div>
        <div className="col-span-2">المحفز</div>
        <div className="col-span-2">الحالة</div>
        <div className="col-span-2">آخر تشغيل</div>
        <div className="col-span-2 text-center">الإجراءات</div>
      </div>

      {/* Rules List */}
      <div className="divide-y divide-gray-100">
        {rules.map((rule) => {
          const isExpanded = expandedRules.has(rule.id!);
          const TriggerIcon = TRIGGER_ICONS[rule.trigger] || Zap;

          return (
            <div key={rule.id} className="hover:bg-gray-50/50 transition-colors">
              {/* Rule Row */}
              <div className="grid md:grid-cols-12 gap-4 px-6 py-4 items-center">
                {/* Rule Name */}
                <div className="col-span-4 flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      rule.isActive ? 'bg-green-100' : 'bg-gray-100'
                    }`}
                  >
                    <TriggerIcon
                      className={`w-5 h-5 ${
                        rule.isActive ? 'text-green-600' : 'text-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{rule.name}</p>
                    <p className="text-xs text-gray-500">
                      {rule.actions?.length || 0} إجراء • {rule.runCount || 0} تشغيل
                    </p>
                  </div>
                </div>

                {/* Trigger */}
                <div className="col-span-2">
                  <span className="text-sm text-gray-600">
                    {TRIGGER_LABELS[rule.trigger] || rule.trigger}
                  </span>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      rule.isActive
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {rule.isActive ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        نشط
                      </>
                    ) : (
                      <>
                        <Pause className="w-3 h-3" />
                        متوقف
                      </>
                    )}
                  </span>
                </div>

                {/* Last Run */}
                <div className="col-span-2">
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-4 h-4" />
                    {formatDate(rule.lastRunAt)}
                  </div>
                </div>

                {/* Actions */}
                <div className="col-span-2 flex items-center justify-center gap-1">
                  {/* Toggle Active */}
                  <button
                    onClick={() => onToggle(rule)}
                    disabled={loading}
                    className={`p-2 rounded-lg transition-colors ${
                      rule.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-gray-400 hover:bg-gray-100'
                    }`}
                    title={rule.isActive ? 'إيقاف' : 'تفعيل'}
                  >
                    {rule.isActive ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </button>

                  {/* Run Now */}
                  <button
                    onClick={() => onRunNow(rule)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="تشغيل الآن"
                  >
                    <Play className="w-4 h-4" />
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => onEdit(rule)}
                    disabled={loading}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="تعديل"
                  >
                    <Edit className="w-4 h-4" />
                  </button>

                  {/* More Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setMenuOpen(menuOpen === rule.id ? null : rule.id!)}
                      disabled={loading}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {menuOpen === rule.id && (
                      <div className="absolute left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => {
                            onDuplicate(rule);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                        >
                          <Copy className="w-4 h-4" />
                          نسخ
                        </button>
                        <button
                          onClick={() => {
                            onDelete(rule);
                            setMenuOpen(null);
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expand */}
                  <button
                    onClick={() => toggleExpand(rule.id!)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-6 pb-4 border-t border-gray-100 bg-gray-50/50">
                  <div className="pt-4 grid md:grid-cols-2 gap-6">
                    {/* Conditions */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-primary" />
                        الشروط
                      </h4>
                      {rule.conditions && rule.conditions.conditions?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {rule.conditions.conditions.map((cond, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-xs"
                            >
                              <span className="font-medium">{cond.field}</span>
                              <span className="text-gray-400">{cond.operator}</span>
                              <span className="text-primary">{cond.value || cond.values?.join(', ')}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">لا توجد شروط</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                        <Play className="w-4 h-4 text-primary" />
                        الإجراءات
                      </h4>
                      <div className="space-y-2">
                        {rule.actions?.map((action, i) => {
                          const ActionIcon = ACTION_ICONS[action.type] || Settings;
                          return (
                            <div
                              key={i}
                              className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                            >
                              <div className="p-1 bg-gray-100 rounded">
                                <ActionIcon className="w-4 h-4 text-gray-500" />
                              </div>
                              <span>{ACTION_LABELS[action.type] || action.type}</span>
                              {action.delaySeconds && action.delaySeconds > 0 && (
                                <span className="text-xs text-gray-400 mr-auto">
                                  بعد {action.delaySeconds} ثانية
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-6 text-xs text-gray-500">
                    <span>تاريخ الإنشاء: {formatDate(rule.createdAt)}</span>
                    <span>آخر تحديث: {formatDate(rule.updatedAt)}</span>
                    <span>عدد التشغيل: {rule.runCount || 0}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Export trigger and action labels
export { TRIGGER_LABELS, ACTION_LABELS, TRIGGER_ICONS, ACTION_ICONS };
