'use client';

// ═══════════════════════════════════════════════════════════════
// AI Quick Actions - أزرار إجراءات سريعة للمساعد الذكي
// ═══════════════════════════════════════════════════════════════

import { memo } from 'react';
import {
  UserCircle,
  Building2,
  FileText,
  TrendingUp,
  MessageSquare,
  Target,
  Sparkles,
  BarChart3,
} from 'lucide-react';

// Types
export type QuickActionType =
  | 'summarize_client'
  | 'suggest_properties'
  | 'write_followup'
  | 'analyze_deal'
  | 'score_lead'
  | 'generate_report'
  | 'schedule_reminder';

export interface QuickAction {
  id: QuickActionType;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  context?: string;
}

interface AIQuickActionsProps {
  onActionClick: (action: QuickAction) => void;
  context?: 'lead' | 'client' | 'property' | 'deal' | 'general';
  compact?: boolean;
}

// Quick actions configuration
const QUICK_ACTIONS: Record<string, QuickAction[]> = {
  general: [
    {
      id: 'summarize_client',
      label: 'لخص لي هذا العميل',
      icon: <UserCircle className="w-4 h-4" />,
      prompt: 'قم بتلخيص معلومات العميل الحالي وأهم النقاط عنه',
      context: 'client',
    },
    {
      id: 'suggest_properties',
      label: 'اقترح وحدات مناسبة',
      icon: <Building2 className="w-4 h-4" />,
      prompt: 'ما هي العقارات المناسبة لهذا العميل بناءً على تفضيلاته؟',
      context: 'property',
    },
    {
      id: 'write_followup',
      label: 'اكتب رسالة متابعة',
      icon: <MessageSquare className="w-4 h-4" />,
      prompt: 'اكتب رسالة متابعة احترافية لهذا العميل',
      context: 'client',
    },
    {
      id: 'analyze_deal',
      label: 'حلل الصفقة',
      icon: <TrendingUp className="w-4 h-4" />,
      prompt: 'قم بتحليل الصفقة الحالية وتقديم توصيات',
      context: 'deal',
    },
  ],
  lead: [
    {
      id: 'score_lead',
      label: 'قيّم هذا العميل المحتمل',
      icon: <Target className="w-4 h-4" />,
      prompt: 'قم بتقييم هذا العميل المحتمل واعطني درجته',
      context: 'lead',
    },
    {
      id: 'suggest_properties',
      label: 'اقترح عقارات مناسبة',
      icon: <Building2 className="w-4 h-4" />,
      prompt: 'ما هي العقارات المناسبة لهذا العميل المحتمل؟',
      context: 'property',
    },
    {
      id: 'write_followup',
      label: 'اكتب رسالة متابعة',
      icon: <MessageSquare className="w-4 h-4" />,
      prompt: 'اكتب رسالة متابعة لهذا العميل المحتمل',
      context: 'lead',
    },
  ],
  client: [
    {
      id: 'summarize_client',
      label: 'لخص بيانات العميل',
      icon: <UserCircle className="w-4 h-4" />,
      prompt: 'قم بتلخيص معلومات هذا العميل وتاريخه معنا',
      context: 'client',
    },
    {
      id: 'write_followup',
      label: 'رسالة متابعة',
      icon: <MessageSquare className="w-4 h-4" />,
      prompt: 'اكتب رسالة متابعة لهذا العميل',
      context: 'client',
    },
  ],
  property: [
    {
      id: 'analyze_deal',
      label: 'حلل إمكانية البيع',
      icon: <BarChart3 className="w-4 h-4" />,
      prompt: 'قم بتحليل إمكانية بيع هذا العقار وتوصياتك',
      context: 'property',
    },
  ],
  deal: [
    {
      id: 'analyze_deal',
      label: 'تحليل الصفقة',
      icon: <TrendingUp className="w-4 h-4" />,
      prompt: 'قم بتحليل هذه الصفقة وإعطائي توصيات',
      context: 'deal',
    },
    {
      id: 'generate_report',
      label: 'تقرير الصفقة',
      icon: <FileText className="w-4 h-4" />,
      prompt: 'أنشئ تقريراً مختصراً عن هذه الصفقة',
      context: 'deal',
    },
  ],
};

const AIQuickActions = memo(function AIQuickActions({
  onActionClick,
  context = 'general',
  compact = false,
}: AIQuickActionsProps) {
  const actions = QUICK_ACTIONS[context] || QUICK_ACTIONS.general;

  return (
    <div className="space-y-2">
      {!compact && (
        <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span>إجراءات سريعة</span>
        </div>
      )}

      <div
        className={`flex flex-wrap gap-2 ${compact ? 'justify-center' : ''}`}
      >
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onActionClick(action)}
            className={`flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 
              dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 
              dark:hover:bg-gray-700 hover:border-purple-300 dark:hover:border-purple-600
              hover:shadow-md transition-all duration-200 group
              ${compact ? 'text-xs' : 'text-sm'}`}
          >
            <span className="text-gray-500 group-hover:text-purple-500 transition-colors">
              {action.icon}
            </span>
            <span className="text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {action.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
});

export default AIQuickActions;
