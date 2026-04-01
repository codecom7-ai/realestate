'use client';

// ═══════════════════════════════════════════════════════════════
// ConditionBuilder - بناء الشروط مع AND/OR logic
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import {
  Plus,
  X,
  GripVertical,
  ChevronDown,
  Trash2,
  Layers,
  Filter,
} from 'lucide-react';

// Operator types
export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'greater_than_or_equal'
  | 'less_than_or_equal'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'starts_with'
  | 'ends_with';

// Condition type
export interface Condition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value?: string | number;
  values?: string[];
}

// Condition group type
export interface ConditionGroup {
  id: string;
  type: 'and' | 'or';
  conditions: Condition[];
  groups?: ConditionGroup[];
}

// Field option type
export interface FieldOption {
  value: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'date' | 'boolean';
  options?: { value: string; label: string }[];
}

// Props
interface ConditionBuilderProps {
  value: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  fields?: FieldOption[];
  operators?: { value: string; label: string }[];
  disabled?: boolean;
  triggerType?: string;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Default operators
const DEFAULT_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'يساوي' },
  { value: 'not_equals', label: 'لا يساوي' },
  { value: 'contains', label: 'يحتوي على' },
  { value: 'not_contains', label: 'لا يحتوي على' },
  { value: 'greater_than', label: 'أكبر من' },
  { value: 'less_than', label: 'أقل من' },
  { value: 'greater_than_or_equal', label: 'أكبر من أو يساوي' },
  { value: 'less_than_or_equal', label: 'أقل من أو يساوي' },
  { value: 'in', label: 'في قائمة' },
  { value: 'not_in', label: 'ليس في قائمة' },
  { value: 'is_empty', label: 'فارغ' },
  { value: 'is_not_empty', label: 'غير فارغ' },
  { value: 'starts_with', label: 'يبدأ بـ' },
  { value: 'ends_with', label: 'ينتهي بـ' },
];

// Field configurations based on trigger type
const getFieldsForTrigger = (triggerType?: string): FieldOption[] => {
  const commonFields: FieldOption[] = [
    { value: 'stage', label: 'المرحلة', type: 'select', options: [] },
    { value: 'status', label: 'الحالة', type: 'select', options: [] },
    { value: 'assignedToId', label: 'المسؤول', type: 'select', options: [] },
  ];

  const leadFields: FieldOption[] = [
    { value: 'stage', label: 'المرحلة', type: 'select', options: [
      { value: 'NEW', label: 'جديد' },
      { value: 'CONTACTED', label: 'تم التواصل' },
      { value: 'QUALIFIED', label: 'مؤهل' },
      { value: 'NEGOTIATING', label: 'في التفاوض' },
      { value: 'CLOSED_WON', label: 'مغلق (نجاح)' },
      { value: 'CLOSED_LOST', label: 'مغلق (فقدان)' },
    ]},
    { value: 'budget', label: 'الميزانية', type: 'number' },
    { value: 'source', label: 'المصدر', type: 'select', options: [
      { value: 'website', label: 'الموقع' },
      { value: 'referral', label: 'إحالة' },
      { value: 'social', label: 'سوشيال ميديا' },
      { value: 'walk_in', label: 'زيارة مباشرة' },
      { value: 'call', label: 'مكالمة' },
    ]},
    { value: 'assignedToId', label: 'المسؤول', type: 'select', options: [] },
    { value: 'notes', label: 'الملاحظات', type: 'text' },
  ];

  const dealFields: FieldOption[] = [
    { value: 'stage', label: 'المرحلة', type: 'select', options: [
      { value: 'LEAD', label: 'عميل محتمل' },
      { value: 'VIEWING', label: 'معاينة' },
      { value: 'NEGOTIATION', label: 'تفاوض' },
      { value: 'RESERVATION', label: 'حجز' },
      { value: 'CONTRACT_PREPARATION', label: 'إعداد العقد' },
      { value: 'CONTRACT_SIGNED', label: 'تم توقيع العقد' },
      { value: 'CLOSED', label: 'مغلق' },
    ]},
    { value: 'dealType', label: 'نوع الصفقة', type: 'select', options: [
      { value: 'sale', label: 'بيع' },
      { value: 'rent', label: 'إيجار' },
    ]},
    { value: 'agreedPrice', label: 'السعر المتفق عليه', type: 'number' },
    { value: 'assignedBrokerId', label: 'المسؤول', type: 'select', options: [] },
  ];

  const paymentFields: FieldOption[] = [
    { value: 'amount', label: 'المبلغ', type: 'number' },
    { value: 'method', label: 'طريقة الدفع', type: 'select', options: [
      { value: 'CASH', label: 'نقدي' },
      { value: 'BANK_TRANSFER', label: 'تحويل بنكي' },
      { value: 'CHECK', label: 'شيك' },
    ]},
    { value: 'status', label: 'الحالة', type: 'select', options: [
      { value: 'PENDING', label: 'قيد الانتظار' },
      { value: 'CONFIRMED', label: 'مؤكد' },
    ]},
  ];

  if (!triggerType) return commonFields;

  if (triggerType.startsWith('lead.')) return leadFields;
  if (triggerType.startsWith('deal.')) return dealFields;
  if (triggerType.startsWith('payment.')) return paymentFields;

  return commonFields;
};

// Single Condition Component
interface SingleConditionProps {
  condition: Condition;
  onChange: (condition: Condition) => void;
  onRemove: () => void;
  fields: FieldOption[];
  operators: { value: string; label: string }[];
  disabled?: boolean;
}

function SingleCondition({
  condition,
  onChange,
  onRemove,
  fields,
  operators,
  disabled,
}: SingleConditionProps) {
  const selectedField = fields.find((f) => f.value === condition.field);

  // Check if operator needs value
  const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator);

  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg group">
      {/* Drag Handle */}
      <div className="cursor-grab text-gray-400 hover:text-gray-600">
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Field Selector */}
      <select
        value={condition.field}
        onChange={(e) => onChange({ ...condition, field: e.target.value, value: undefined, values: undefined })}
        disabled={disabled}
        className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
      >
        <option value="">اختر الحقل</option>
        {fields.map((field) => (
          <option key={field.value} value={field.value}>
            {field.label}
          </option>
        ))}
      </select>

      {/* Operator Selector */}
      <select
        value={condition.operator}
        onChange={(e) => onChange({ ...condition, operator: e.target.value as ConditionOperator })}
        disabled={disabled || !condition.field}
        className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
      >
        <option value="">المقارنة</option>
        {operators.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      {/* Value Input */}
      {needsValue && condition.field && (
        <>
          {selectedField?.type === 'select' && selectedField.options ? (
            <select
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              disabled={disabled}
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">القيمة</option>
              {selectedField.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : selectedField?.type === 'number' ? (
            <input
              type="number"
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              disabled={disabled}
              placeholder="القيمة"
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          ) : (
            <input
              type="text"
              value={condition.value || ''}
              onChange={(e) => onChange({ ...condition, value: e.target.value })}
              disabled={disabled}
              placeholder="القيمة"
              className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            />
          )}
        </>
      )}

      {/* Remove Button */}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Condition Group Component
interface ConditionGroupProps {
  group: ConditionGroup;
  onChange: (group: ConditionGroup) => void;
  onRemove?: () => void;
  fields: FieldOption[];
  operators: { value: string; label: string }[];
  disabled?: boolean;
  depth?: number;
}

function ConditionGroupComponent({
  group,
  onChange,
  onRemove,
  fields,
  operators,
  disabled,
  depth = 0,
}: ConditionGroupProps) {
  // Add condition
  const addCondition = () => {
    onChange({
      ...group,
      conditions: [
        ...group.conditions,
        {
          id: generateId(),
          field: '',
          operator: 'equals',
          value: '',
        },
      ],
    });
  };

  // Update condition
  const updateCondition = (index: number, condition: Condition) => {
    onChange({
      ...group,
      conditions: group.conditions.map((c, i) => (i === index ? condition : c)),
    });
  };

  // Remove condition
  const removeCondition = (index: number) => {
    onChange({
      ...group,
      conditions: group.conditions.filter((_, i) => i !== index),
    });
  };

  // Toggle group type
  const toggleGroupType = () => {
    onChange({
      ...group,
      type: group.type === 'and' ? 'or' : 'and',
    });
  };

  // Add nested group
  const addNestedGroup = () => {
    const newGroup: ConditionGroup = {
      id: generateId(),
      type: 'and',
      conditions: [],
    };

    onChange({
      ...group,
      groups: [...(group.groups || []), newGroup],
    });
  };

  // Update nested group
  const updateNestedGroup = (index: number, nestedGroup: ConditionGroup) => {
    onChange({
      ...group,
      groups: group.groups?.map((g, i) => (i === index ? nestedGroup : g)),
    });
  };

  // Remove nested group
  const removeNestedGroup = (index: number) => {
    onChange({
      ...group,
      groups: group.groups?.filter((_, i) => i !== index),
    });
  };

  const isNested = depth > 0;

  return (
    <div
      className={`relative ${isNested ? 'mr-6 pr-4 border-r-2 border-dashed border-gray-200' : ''}`}
    >
      {/* Group Header */}
      <div className="flex items-center gap-2 mb-3">
        {/* Toggle AND/OR */}
        <button
          type="button"
          onClick={toggleGroupType}
          disabled={disabled}
          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
            group.type === 'and'
              ? 'bg-blue-100 text-blue-700'
              : 'bg-purple-100 text-purple-700'
          }`}
        >
          {group.type === 'and' ? 'و' : 'أو'}
        </button>

        <span className="text-sm text-gray-500">
          {group.conditions.length} شرط
        </span>

        {/* Add Condition */}
        <button
          type="button"
          onClick={addCondition}
          disabled={disabled}
          className="flex items-center gap-1 px-2 py-1 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          شرط
        </button>

        {/* Add Group */}
        {depth < 2 && (
          <button
            type="button"
            onClick={addNestedGroup}
            disabled={disabled}
            className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Layers className="w-4 h-4" />
            مجموعة
          </button>
        )}

        {/* Remove Group (if nested) */}
        {isNested && onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors mr-auto"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conditions */}
      {group.conditions.length > 0 && (
        <div className="space-y-2">
          {group.conditions.map((condition, index) => (
            <div key={condition.id}>
              <SingleCondition
                condition={condition}
                onChange={(c) => updateCondition(index, c)}
                onRemove={() => removeCondition(index)}
                fields={fields}
                operators={operators}
                disabled={disabled}
              />
              {/* AND/OR Divider */}
              {index < group.conditions.length - 1 && (
                <div className="flex items-center gap-2 my-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">
                    {group.type === 'and' ? 'و' : 'أو'}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Nested Groups */}
      {group.groups && group.groups.length > 0 && (
        <div className="mt-4 space-y-4">
          {group.groups.map((nestedGroup, index) => (
            <div key={nestedGroup.id}>
              {/* AND/OR Divider for groups */}
              {group.conditions.length > 0 && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">
                    {group.type === 'and' ? 'و' : 'أو'}
                  </span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
              )}
              <ConditionGroupComponent
                group={nestedGroup}
                onChange={(g) => updateNestedGroup(index, g)}
                onRemove={() => removeNestedGroup(index)}
                fields={fields}
                operators={operators}
                disabled={disabled}
                depth={depth + 1}
              />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {group.conditions.length === 0 && (!group.groups || group.groups.length === 0) && (
        <div className="text-center py-6 text-gray-400">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">لا توجد شروط</p>
          <button
            type="button"
            onClick={addCondition}
            className="mt-2 text-sm text-primary hover:underline"
          >
            إضافة شرط
          </button>
        </div>
      )}
    </div>
  );
}

// Main ConditionBuilder Component
export default function ConditionBuilder({
  value,
  onChange,
  fields,
  operators,
  disabled,
  triggerType,
}: ConditionBuilderProps) {
  // Get fields based on trigger type
  const availableFields = fields || getFieldsForTrigger(triggerType);
  const availableOperators = operators || DEFAULT_OPERATORS;

  return (
    <div className="space-y-2">
      <ConditionGroupComponent
        group={value}
        onChange={onChange}
        fields={availableFields}
        operators={availableOperators}
        disabled={disabled}
        depth={0}
      />
    </div>
  );
}

// Export utilities
export { generateId, getFieldsForTrigger, DEFAULT_OPERATORS };
