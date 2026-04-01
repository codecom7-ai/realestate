'use client';

// ═══════════════════════════════════════════════════════════════
// TriggerSelector - اختيار الحدث المُشغِّل
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect } from 'react';
import {
  Users,
  FileText,
  CreditCard,
  FileCheck,
  Eye,
  PenTool,
  ChevronDown,
  Check,
  Zap,
} from 'lucide-react';

// Trigger types
export type TriggerType =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'lead.assigned'
  | 'deal.created'
  | 'deal.stage_changed'
  | 'deal.closed'
  | 'payment.received'
  | 'payment.overdue'
  | 'document.uploaded'
  | 'document.expiring'
  | 'viewing.scheduled'
  | 'viewing.completed'
  | 'contract.signed';

// Trigger group type
export interface TriggerGroup {
  key: string;
  label: string;
  triggers: TriggerOption[];
}

// Trigger option type
export interface TriggerOption {
  value: TriggerType;
  label: string;
  description: string;
  icon: any;
}

// Props
interface TriggerSelectorProps {
  value: TriggerType | '';
  onChange: (value: TriggerType) => void;
  triggers?: { value: string; label: string }[];
  disabled?: boolean;
  error?: string;
}

// Icon mapping
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

// Default trigger groups
const DEFAULT_TRIGGER_GROUPS: TriggerGroup[] = [
  {
    key: 'leads',
    label: 'العملاء المحتملين',
    triggers: [
      {
        value: 'lead.created',
        label: 'عميل محتمل جديد',
        description: 'عند إضافة عميل محتمل جديد',
        icon: Users,
      },
      {
        value: 'lead.stage_changed',
        label: 'تغيير مرحلة العميل',
        description: 'عند تغيير مرحلة العميل المحتمل',
        icon: Users,
      },
      {
        value: 'lead.assigned',
        label: 'تعيين عميل',
        description: 'عند تعيين عميل لمسؤول',
        icon: Users,
      },
    ],
  },
  {
    key: 'deals',
    label: 'الصفقات',
    triggers: [
      {
        value: 'deal.created',
        label: 'صفقة جديدة',
        description: 'عند إنشاء صفقة جديدة',
        icon: FileText,
      },
      {
        value: 'deal.stage_changed',
        label: 'تغيير مرحلة الصفقة',
        description: 'عند تغيير مرحلة الصفقة',
        icon: FileText,
      },
      {
        value: 'deal.closed',
        label: 'إغلاق صفقة',
        description: 'عند إغلاق صفقة (نجاح أو فشل)',
        icon: FileText,
      },
    ],
  },
  {
    key: 'payments',
    label: 'المدفوعات',
    triggers: [
      {
        value: 'payment.received',
        label: 'استلام دفعة',
        description: 'عند استلام دفعة جديدة',
        icon: CreditCard,
      },
      {
        value: 'payment.overdue',
        label: 'تأخر دفعة',
        description: 'عند تأخر دفعة عن موعدها',
        icon: CreditCard,
      },
    ],
  },
  {
    key: 'documents',
    label: 'المستندات',
    triggers: [
      {
        value: 'document.uploaded',
        label: 'رفع مستند',
        description: 'عند رفع مستند جديد',
        icon: FileCheck,
      },
      {
        value: 'document.expiring',
        label: 'مستند منتهي الصلاحية',
        description: 'عند اقتراب انتهاء صلاحية مستند',
        icon: FileCheck,
      },
    ],
  },
  {
    key: 'viewings',
    label: 'المعاينات',
    triggers: [
      {
        value: 'viewing.scheduled',
        label: 'جدولة معاينة',
        description: 'عند جدولة معاينة جديدة',
        icon: Eye,
      },
      {
        value: 'viewing.completed',
        label: 'إتمام معاينة',
        description: 'عند إتمام معاينة',
        icon: Eye,
      },
    ],
  },
  {
    key: 'contracts',
    label: 'العقود',
    triggers: [
      {
        value: 'contract.signed',
        label: 'توقيع عقد',
        description: 'عند توقيع عقد',
        icon: PenTool,
      },
    ],
  },
];

export default function TriggerSelector({
  value,
  onChange,
  triggers,
  disabled = false,
  error,
}: TriggerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get selected trigger info
  const getSelectedTrigger = (): TriggerOption | null => {
    for (const group of DEFAULT_TRIGGER_GROUPS) {
      const trigger = group.triggers.find((t) => t.value === value);
      if (trigger) return trigger;
    }
    return null;
  };

  const selectedTrigger = getSelectedTrigger();

  // Filter groups based on search
  const filteredGroups = DEFAULT_TRIGGER_GROUPS.map((group) => ({
    ...group,
    triggers: group.triggers.filter(
      (t) =>
        t.label.includes(searchQuery) ||
        t.description.includes(searchQuery)
    ),
  })).filter((group) => group.triggers.length > 0);

  // Handle outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle trigger selection
  const handleSelect = (triggerValue: TriggerType) => {
    onChange(triggerValue);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-4 py-3 text-right bg-white border rounded-xl transition-all ${
          error
            ? 'border-red-300 focus-within:border-red-500'
            : isOpen
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-gray-200 hover:border-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-3">
          {selectedTrigger ? (
            <>
              <div className="p-2 bg-primary/10 rounded-lg">
                <selectedTrigger.icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{selectedTrigger.label}</p>
                <p className="text-xs text-gray-500">{selectedTrigger.description}</p>
              </div>
            </>
          ) : (
            <>
              <div className="p-2 bg-gray-100 rounded-lg">
                <Zap className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900">اختر المحفز</p>
                <p className="text-xs text-gray-500">الحدث الذي سيُشغِّل القاعدة</p>
              </div>
            </>
          )}
        </div>
        <ChevronDown
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Error Message */}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-100">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن المحفز..."
              className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              autoFocus
            />
          </div>

          {/* Groups */}
          <div className="max-h-80 overflow-y-auto">
            {filteredGroups.map((group) => (
              <div key={group.key}>
                {/* Group Header */}
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {group.label}
                  </span>
                </div>

                {/* Triggers */}
                {group.triggers.map((trigger) => {
                  const Icon = trigger.icon;
                  const isSelected = value === trigger.value;

                  return (
                    <button
                      key={trigger.value}
                      type="button"
                      onClick={() => handleSelect(trigger.value)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                        isSelected
                          ? 'bg-primary/5'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg ${
                          isSelected ? 'bg-primary text-white' : 'bg-gray-100'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-gray-500'}`} />
                      </div>
                      <div className="flex-1">
                        <p
                          className={`font-medium ${
                            isSelected ? 'text-primary' : 'text-gray-900'
                          }`}
                        >
                          {trigger.label}
                        </p>
                        <p className="text-xs text-gray-500">{trigger.description}</p>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))}

            {/* No Results */}
            {filteredGroups.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>لا توجد نتائج مطابقة</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Export trigger groups for use in other components
export { DEFAULT_TRIGGER_GROUPS, TRIGGER_ICONS };
