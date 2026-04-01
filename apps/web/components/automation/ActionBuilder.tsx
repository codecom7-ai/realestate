'use client';

// ═══════════════════════════════════════════════════════════════
// ActionBuilder - بناء الإجراءات مع حقول ديناميكية
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Bell,
  MessageSquare,
  Mail,
  FileText,
  Settings,
  Users,
  Webhook,
  Plus,
  X,
  GripVertical,
  Play,
  Clock,
  ChevronDown,
  Variable,
} from 'lucide-react';

// Action types
export type ActionType =
  | 'send_notification'
  | 'send_whatsapp'
  | 'send_email'
  | 'create_task'
  | 'update_field'
  | 'assign_to'
  | 'trigger_webhook';

// Action config type
export interface ActionConfig {
  id: string;
  type: ActionType | '';
  config: Record<string, any>;
  order: number;
  delaySeconds?: number;
}

// Action option type
export interface ActionOption {
  value: ActionType;
  label: string;
  description: string;
  icon: any;
  color: string;
  fields: ActionField[];
}

// Action field type
export interface ActionField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'select' | 'user_select' | 'url';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  supportsVariables?: boolean;
}

// Props
interface ActionBuilderProps {
  value: ActionConfig[];
  onChange: (actions: ActionConfig[]) => void;
  actions?: { value: string; label: string }[];
  disabled?: boolean;
  onTest?: (action: ActionConfig) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Action configurations
const ACTION_OPTIONS: ActionOption[] = [
  {
    value: 'send_notification',
    label: 'إرسال إشعار',
    description: 'إرسال إشعار للمستخدمين',
    icon: Bell,
    color: 'bg-blue-100 text-blue-600',
    fields: [
      {
        key: 'title',
        label: 'عنوان الإشعار',
        type: 'text',
        required: true,
        placeholder: 'عنوان الإشعار...',
        supportsVariables: true,
      },
      {
        key: 'body',
        label: 'نص الإشعار',
        type: 'textarea',
        required: true,
        placeholder: 'نص الإشعار...',
        supportsVariables: true,
      },
      {
        key: 'userId',
        label: 'المستخدم المستقبل',
        type: 'user_select',
        required: false,
      },
      {
        key: 'role',
        label: 'دور المستخدمين',
        type: 'select',
        options: [
          { value: 'all', label: 'جميع المستخدمين' },
          { value: 'owner', label: 'المالك' },
          { value: 'gm', label: 'المدير العام' },
          { value: 'sales_manager', label: 'مدير المبيعات' },
          { value: 'broker', label: 'وسيط' },
        ],
      },
    ],
  },
  {
    value: 'send_whatsapp',
    label: 'إرسال واتساب',
    description: 'إرسال رسالة واتساب',
    icon: MessageSquare,
    color: 'bg-green-100 text-green-600',
    fields: [
      {
        key: 'to',
        label: 'رقم الهاتف',
        type: 'text',
        required: true,
        placeholder: '+20xxxxxxxxxx',
        supportsVariables: true,
      },
      {
        key: 'templateName',
        label: 'اسم القالب',
        type: 'text',
        required: false,
        placeholder: 'template_name',
      },
      {
        key: 'message',
        label: 'نص الرسالة',
        type: 'textarea',
        required: true,
        placeholder: 'نص الرسالة...',
        supportsVariables: true,
      },
    ],
  },
  {
    value: 'send_email',
    label: 'إرسال بريد إلكتروني',
    description: 'إرسال بريد إلكتروني',
    icon: Mail,
    color: 'bg-purple-100 text-purple-600',
    fields: [
      {
        key: 'to',
        label: 'البريد الإلكتروني',
        type: 'text',
        required: true,
        placeholder: 'email@example.com',
        supportsVariables: true,
      },
      {
        key: 'subject',
        label: 'الموضوع',
        type: 'text',
        required: true,
        placeholder: 'موضوع البريد...',
        supportsVariables: true,
      },
      {
        key: 'body',
        label: 'المحتوى',
        type: 'textarea',
        required: true,
        placeholder: 'محتوى البريد...',
        supportsVariables: true,
      },
    ],
  },
  {
    value: 'create_task',
    label: 'إنشاء مهمة',
    description: 'إنشاء مهمة جديدة',
    icon: FileText,
    color: 'bg-yellow-100 text-yellow-600',
    fields: [
      {
        key: 'title',
        label: 'عنوان المهمة',
        type: 'text',
        required: true,
        placeholder: 'عنوان المهمة...',
        supportsVariables: true,
      },
      {
        key: 'description',
        label: 'الوصف',
        type: 'textarea',
        required: false,
        placeholder: 'وصف المهمة...',
        supportsVariables: true,
      },
      {
        key: 'assignedToId',
        label: 'المسؤول',
        type: 'user_select',
        required: false,
      },
      {
        key: 'dueInDays',
        label: 'استحقاق خلال (أيام)',
        type: 'number',
        required: false,
        placeholder: '7',
      },
      {
        key: 'priority',
        label: 'الأولوية',
        type: 'select',
        options: [
          { value: 'low', label: 'منخفضة' },
          { value: 'medium', label: 'متوسطة' },
          { value: 'high', label: 'عالية' },
        ],
      },
    ],
  },
  {
    value: 'update_field',
    label: 'تحديث حقل',
    description: 'تحديث قيمة حقل',
    icon: Settings,
    color: 'bg-gray-100 text-gray-600',
    fields: [
      {
        key: 'field',
        label: 'الحقل',
        type: 'select',
        required: true,
        options: [
          { value: 'stage', label: 'المرحلة' },
          { value: 'status', label: 'الحالة' },
          { value: 'notes', label: 'الملاحظات' },
          { value: 'tags', label: 'الوسوم' },
        ],
      },
      {
        key: 'value',
        label: 'القيمة الجديدة',
        type: 'text',
        required: true,
        placeholder: 'القيمة...',
        supportsVariables: true,
      },
    ],
  },
  {
    value: 'assign_to',
    label: 'تعيين لمسؤول',
    description: 'تعيين العنصر لمسؤول',
    icon: Users,
    color: 'bg-indigo-100 text-indigo-600',
    fields: [
      {
        key: 'userId',
        label: 'المستخدم',
        type: 'user_select',
        required: true,
      },
      {
        key: 'reason',
        label: 'السبب',
        type: 'textarea',
        required: false,
        placeholder: 'سبب التعيين...',
        supportsVariables: true,
      },
    ],
  },
  {
    value: 'trigger_webhook',
    label: 'استدعاء Webhook',
    description: 'إرسال طلب HTTP',
    icon: Webhook,
    color: 'bg-red-100 text-red-600',
    fields: [
      {
        key: 'url',
        label: 'رابط URL',
        type: 'url',
        required: true,
        placeholder: 'https://api.example.com/webhook',
      },
      {
        key: 'method',
        label: 'الطريقة',
        type: 'select',
        required: true,
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'GET', label: 'GET' },
          { value: 'PUT', label: 'PUT' },
        ],
      },
      {
        key: 'headers',
        label: 'Headers (JSON)',
        type: 'textarea',
        required: false,
        placeholder: '{"Authorization": "Bearer xxx"}',
      },
      {
        key: 'body',
        label: 'Body (JSON)',
        type: 'textarea',
        required: false,
        placeholder: '{"key": "value"}',
        supportsVariables: true,
      },
    ],
  },
];

// Variable selector component
interface VariableSelectorProps {
  onSelect: (variable: string) => void;
}

function VariableSelector({ onSelect }: VariableSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const variables = [
    { value: '{{lead.client.name}}', label: 'اسم العميل' },
    { value: '{{lead.client.phone}}', label: 'هاتف العميل' },
    { value: '{{lead.stage}}', label: 'المرحلة' },
    { value: '{{lead.budget}}', label: 'الميزانية' },
    { value: '{{deal.agreedPrice}}', label: 'السعر المتفق' },
    { value: '{{deal.property.title}}', label: 'عنوان العقار' },
    { value: '{{user.name}}', label: 'اسم المستخدم' },
    { value: '{{date}}', label: 'التاريخ الحالي' },
    { value: '{{time}}', label: 'الوقت الحالي' },
  ];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition-colors"
      >
        <Variable className="w-3 h-3" />
        متغيرات
      </button>

      {isOpen && (
        <div className="absolute z-20 right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg">
          <div className="max-h-48 overflow-y-auto">
            {variables.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => {
                  onSelect(v.value);
                  setIsOpen(false);
                }}
                className="w-full text-right px-3 py-2 text-sm hover:bg-gray-50 flex items-center justify-between"
              >
                <span>{v.label}</span>
                <code className="text-xs text-gray-400">{v.value}</code>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Single Action Component
interface SingleActionProps {
  action: ActionConfig;
  onChange: (action: ActionConfig) => void;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst: boolean;
  isLast: boolean;
  disabled?: boolean;
  onTest?: (action: ActionConfig) => void;
}

function SingleAction({
  action,
  onChange,
  onRemove,
  isFirst,
  isLast,
  disabled,
  onTest,
}: SingleActionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const actionOption = ACTION_OPTIONS.find((a) => a.value === action.type);
  const Icon = actionOption?.icon || Settings;
  const color = actionOption?.color || 'bg-gray-100 text-gray-600';

  // Update config field
  const updateConfig = (key: string, value: any) => {
    onChange({
      ...action,
      config: { ...action.config, [key]: value },
    });
  };

  // Insert variable into field
  const insertVariable = (field: string, variable: string) => {
    const currentValue = action.config[field] || '';
    updateConfig(field, currentValue + variable);
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Action Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50">
        {/* Drag Handle */}
        <div className="cursor-grab text-gray-400">
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Order Badge */}
        <span className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-500">
          {action.order}
        </span>

        {/* Action Icon */}
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Action Type Selector */}
        <select
          value={action.type}
          onChange={(e) =>
            onChange({
              ...action,
              type: e.target.value as ActionType,
              config: {},
            })
          }
          disabled={disabled}
          className="flex-1 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
        >
          <option value="">اختر الإجراء</option>
          {ACTION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {/* Delay Input */}
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-400" />
          <input
            type="number"
            value={action.delaySeconds || 0}
            onChange={(e) =>
              onChange({ ...action, delaySeconds: parseInt(e.target.value) || 0 })
            }
            disabled={disabled}
            placeholder="0"
            min={0}
            className="w-16 px-2 py-1 text-sm bg-white border border-gray-200 rounded-lg text-center"
          />
          <span className="text-xs text-gray-400">ثانية</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {/* Test Button */}
          {action.type && onTest && (
            <button
              type="button"
              onClick={() => onTest(action)}
              disabled={disabled}
              className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              title="اختبار الإجراء"
            >
              <Play className="w-4 h-4" />
            </button>
          )}

          {/* Expand/Collapse */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isExpanded ? '' : '-rotate-90'}`}
            />
          </button>

          {/* Remove */}
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Action Fields */}
      {isExpanded && action.type && actionOption && (
        <div className="p-4 space-y-4 bg-white">
          {actionOption.fields.map((field) => (
            <div key={field.key}>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                  {field.required && <span className="text-red-500 mr-1">*</span>}
                </label>
                {field.supportsVariables && (
                  <VariableSelector
                    onSelect={(v) => insertVariable(field.key, v)}
                  />
                )}
              </div>

              {field.type === 'text' && (
                <input
                  type="text"
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              )}

              {field.type === 'textarea' && (
                <textarea
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
                />
              )}

              {field.type === 'number' && (
                <input
                  type="number"
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              )}

              {field.type === 'select' && (
                <select
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="">اختر...</option>
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              )}

              {field.type === 'url' && (
                <input
                  type="url"
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  dir="ltr"
                />
              )}

              {field.type === 'user_select' && (
                <select
                  value={action.config[field.key] || ''}
                  onChange={(e) => updateConfig(field.key, e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                >
                  <option value="">اختر المستخدم...</option>
                  {/* TODO: Load users from API */}
                  <option value="current">المستخدم الحالي</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isExpanded && !action.type && (
        <div className="p-8 text-center text-gray-400 bg-white">
          <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">اختر نوع الإجراء</p>
        </div>
      )}
    </div>
  );
}

// Main ActionBuilder Component
export default function ActionBuilder({
  value,
  onChange,
  disabled,
  onTest,
}: ActionBuilderProps) {
  // Add new action
  const addAction = () => {
    onChange([
      ...value,
      {
        id: generateId(),
        type: '',
        config: {},
        order: value.length + 1,
        delaySeconds: 0,
      },
    ]);
  };

  // Update action
  const updateAction = (index: number, action: ActionConfig) => {
    onChange(value.map((a, i) => (i === index ? action : a)));
  };

  // Remove action
  const removeAction = (index: number) => {
    const newActions = value.filter((_, i) => i !== index);
    // Re-order
    onChange(
      newActions.map((a, i) => ({ ...a, order: i + 1 }))
    );
  };

  // Move action up
  const moveActionUp = (index: number) => {
    if (index === 0) return;
    const newActions = [...value];
    [newActions[index - 1], newActions[index]] = [
      newActions[index],
      newActions[index - 1],
    ];
    onChange(
      newActions.map((a, i) => ({ ...a, order: i + 1 }))
    );
  };

  // Move action down
  const moveActionDown = (index: number) => {
    if (index === value.length - 1) return;
    const newActions = [...value];
    [newActions[index], newActions[index + 1]] = [
      newActions[index + 1],
      newActions[index],
    ];
    onChange(
      newActions.map((a, i) => ({ ...a, order: i + 1 }))
    );
  };

  return (
    <div className="space-y-4">
      {/* Actions List */}
      {value.map((action, index) => (
        <SingleAction
          key={action.id}
          action={action}
          onChange={(a) => updateAction(index, a)}
          onRemove={() => removeAction(index)}
          onMoveUp={() => moveActionUp(index)}
          onMoveDown={() => moveActionDown(index)}
          isFirst={index === 0}
          isLast={index === value.length - 1}
          disabled={disabled}
          onTest={onTest}
        />
      ))}

      {/* Add Action Button */}
      <button
        type="button"
        onClick={addAction}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-primary hover:text-primary transition-colors"
      >
        <Plus className="w-5 h-5" />
        إضافة إجراء
      </button>

      {/* Empty State */}
      {value.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          <Settings className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p>لم يتم إضافة إجراءات</p>
          <p className="text-sm mt-1">أضف إجراءات ليتم تنفيذها عند تحقق الشروط</p>
        </div>
      )}
    </div>
  );
}

// Export utilities
export { generateId, ACTION_OPTIONS };
