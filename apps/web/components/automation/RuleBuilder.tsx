'use client';

// ═══════════════════════════════════════════════════════════════
// RuleBuilder - المنشئ الرئيسي لقواعد الأتمتة
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import {
  Zap,
  Filter,
  Play,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Loader2,
  TestTube,
} from 'lucide-react';
import TriggerSelector, { TriggerType, TRIGGER_ICONS } from './TriggerSelector';
import ConditionBuilder, { ConditionGroup, generateId } from './ConditionBuilder';
import ActionBuilder, { ActionConfig } from './ActionBuilder';
import { api } from '@/lib/api';

// Rule type
export interface AutomationRule {
  id?: string;
  name: string;
  trigger: TriggerType | '';
  conditions: ConditionGroup;
  actions: ActionConfig[];
  isActive: boolean;
  lastRunAt?: string;
  runCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Props
interface RuleBuilderProps {
  rule?: AutomationRule | null;
  onSave: (rule: AutomationRule) => Promise<void>;
  onCancel: () => void;
  onTest?: (rule: AutomationRule) => Promise<void>;
  loading?: boolean;
}

// Initial condition group
const initialConditionGroup: ConditionGroup = {
  id: generateId(),
  type: 'and',
  conditions: [],
};

// Initial action
const initialAction: ActionConfig = {
  id: generateId(),
  type: '',
  config: {},
  order: 1,
  delaySeconds: 0,
};

// Step configuration
const STEPS = [
  { key: 'trigger', label: 'المحفز', icon: Zap },
  { key: 'conditions', label: 'الشروط', icon: Filter },
  { key: 'actions', label: 'الإجراءات', icon: Play },
];

export default function RuleBuilder({
  rule,
  onSave,
  onCancel,
  onTest,
  loading = false,
}: RuleBuilderProps) {
  // Form state
  const [name, setName] = useState(rule?.name || '');
  const [trigger, setTrigger] = useState<TriggerType | ''>(rule?.trigger || '');
  const [conditions, setConditions] = useState<ConditionGroup>(
    rule?.conditions || initialConditionGroup
  );
  const [actions, setActions] = useState<ActionConfig[]>(
    rule?.actions?.length ? rule.actions : [initialAction]
  );
  const [isActive, setIsActive] = useState(rule?.isActive ?? true);

  // UI state
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(
    new Set(['trigger'])
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  // Toggle step expansion
  const toggleStep = (stepKey: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepKey)) {
        next.delete(stepKey);
      } else {
        next.add(stepKey);
      }
      return next;
    });
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'اسم القاعدة مطلوب';
    }

    if (!trigger) {
      newErrors.trigger = 'المحفز مطلوب';
    }

    // Validate actions
    const validActions = actions.filter((a) => a.type);
    if (validActions.length === 0) {
      newErrors.actions = 'يجب إضافة إجراء واحد على الأقل';
    }

    // Validate action configs
    validActions.forEach((action, index) => {
      if (!action.config || Object.keys(action.config).length === 0) {
        newErrors[`action_${index}`] = `الإجراء ${index + 1} يحتاج لتكوين`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    const ruleData: AutomationRule = {
      id: rule?.id,
      name: name.trim(),
      trigger: trigger as TriggerType,
      conditions,
      actions: actions.filter((a) => a.type),
      isActive,
    };

    await onSave(ruleData);
  };

  // Handle test
  const handleTest = async () => {
    if (!trigger || !onTest) return;

    setTesting(true);
    setTestResult(null);

    try {
      const ruleData: AutomationRule = {
        name: name.trim(),
        trigger: trigger as TriggerType,
        conditions,
        actions: actions.filter((a) => a.type),
        isActive,
      };

      await onTest(ruleData);
      setTestResult({ success: true, message: 'تم اختبار القاعدة بنجاح' });
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.response?.data?.message || 'فشل اختبار القاعدة',
      });
    } finally {
      setTesting(false);
    }
  };

  // Check step completion
  const isStepComplete = (stepKey: string): boolean => {
    switch (stepKey) {
      case 'trigger':
        return !!trigger;
      case 'conditions':
        return true; // Conditions are optional
      case 'actions':
        return actions.some((a) => a.type);
      default:
        return false;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {rule ? 'تعديل القاعدة' : 'إنشاء قاعدة جديدة'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              حدد المحفز والشروط والإجراءات
            </p>
          </div>

          {/* Active Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-sm text-gray-600">تفعيل القاعدة</span>
            <div
              className={`relative w-12 h-6 rounded-full transition-colors ${
                isActive ? 'bg-green-500' : 'bg-gray-300'
              }`}
              onClick={() => setIsActive(!isActive)}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  isActive ? 'right-1' : 'right-7'
                }`}
              />
            </div>
          </label>
        </div>
      </div>

      {/* Rule Name */}
      <div className="px-6 py-4 border-b border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          اسم القاعدة <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: إشعار عند تغيير مرحلة العميل"
          className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 ${
            errors.name ? 'border-red-300' : 'border-gray-200'
          }`}
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {errors.name}
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-200">
        {STEPS.map((step, index) => {
          const isExpanded = expandedSteps.has(step.key);
          const isComplete = isStepComplete(step.key);
          const StepIcon = step.icon;

          return (
            <div key={step.key}>
              {/* Step Header */}
              <button
                type="button"
                onClick={() => toggleStep(step.key)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Step Number */}
                  <div
                    className={`w-8 h-8 flex items-center justify-center rounded-full ${
                      isComplete
                        ? 'bg-green-100 text-green-600'
                        : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isComplete ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>

                  {/* Step Icon */}
                  <div
                    className={`p-2 rounded-lg ${
                      isComplete ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>

                  {/* Step Label */}
                  <div className="text-right">
                    <p className="font-medium text-gray-900">{step.label}</p>
                    {step.key === 'conditions' && (
                      <p className="text-xs text-gray-500">اختياري</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Error Badge */}
                  {errors[step.key] && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors[step.key]}
                    </span>
                  )}

                  {/* Expand/Collapse Icon */}
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Step Content */}
              {isExpanded && (
                <div className="px-6 pb-6">
                  {step.key === 'trigger' && (
                    <div className="mt-2">
                      <TriggerSelector
                        value={trigger}
                        onChange={(t) => {
                          setTrigger(t);
                          setErrors((e) => ({ ...e, trigger: '' }));
                        }}
                        error={errors.trigger}
                      />
                    </div>
                  )}

                  {step.key === 'conditions' && (
                    <div className="mt-2">
                      <ConditionBuilder
                        value={conditions}
                        onChange={setConditions}
                        triggerType={trigger}
                      />
                    </div>
                  )}

                  {step.key === 'actions' && (
                    <div className="mt-2 space-y-4">
                      <ActionBuilder
                        value={actions}
                        onChange={setActions}
                        onTest={
                          onTest
                            ? async (action) => {
                                // Test single action
                                console.log('Testing action:', action);
                              }
                            : undefined
                        }
                      />
                      {errors.actions && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.actions}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Test Result */}
      {testResult && (
        <div
          className={`mx-6 mb-4 p-4 rounded-lg flex items-center gap-2 ${
            testResult.success
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {testResult.success ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          {testResult.message}
        </div>
      )}

      {/* Footer */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* Test Button */}
          {onTest && trigger && (
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {testing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TestTube className="w-4 h-4" />
              )}
              اختبار
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Cancel Button */}
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            إلغاء
          </button>

          {/* Save Button */}
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                جاري الحفظ...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                حفظ القاعدة
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export types
export type { TriggerType, ConditionGroup, ActionConfig };
