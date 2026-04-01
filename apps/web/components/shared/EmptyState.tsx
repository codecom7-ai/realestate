// ═══════════════════════════════════════════════════════════════
// EmptyState Component - حالة فارغة (مع i18n)
// Features: RTL-First, Dark Mode, Accessibility (WCAG 2.1 AA)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import { FileQuestion, Inbox, Search, Users, Building, FileText } from 'lucide-react';
import { ReactNode, memo } from 'react';

export type EmptyStateType = 
  | 'default'
  | 'no-results'
  | 'no-clients'
  | 'no-leads'
  | 'no-properties'
  | 'no-deals'
  | 'no-activities'
  | 'no-documents';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CONFIG = {
  sm: {
    container: 'py-8 px-4',
    icon: 'w-12 h-12',
    title: 'text-base',
    description: 'text-xs',
    button: 'px-3 py-1.5 text-sm',
  },
  md: {
    container: 'py-12 px-4',
    icon: 'w-16 h-16',
    title: 'text-lg',
    description: 'text-sm',
    button: 'px-4 py-2 text-sm',
  },
  lg: {
    container: 'py-16 px-6',
    icon: 'w-20 h-20',
    title: 'text-xl',
    description: 'text-base',
    button: 'px-5 py-2.5 text-base',
  },
};

export const EmptyState = memo(function EmptyState({
  type = 'default',
  title,
  description,
  icon: CustomIcon,
  actionLabel,
  actionHref,
  onAction,
  action,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const t = useTranslations('emptyStates');
  const tA11y = useTranslations('accessibility');
  
  const sizeConfig = SIZE_CONFIG[size];
  
  // Get translated title and description
  const getTitle = () => {
    if (title) return title;
    const titles: Record<EmptyStateType, string> = {
      'default': t('default.title'),
      'no-results': t('noResults.title'),
      'no-clients': t('noClients.title'),
      'no-leads': t('noLeads.title'),
      'no-properties': t('noProperties.title'),
      'no-deals': t('noDeals.title'),
      'no-activities': t('noActivities.title'),
      'no-documents': t('noDocuments.title'),
    };
    return titles[type];
  };
  
  const getDescription = () => {
    if (description) return description;
    const descriptions: Record<EmptyStateType, string> = {
      'default': t('default.description'),
      'no-results': t('noResults.description'),
      'no-clients': t('noClients.description'),
      'no-leads': t('noLeads.description'),
      'no-properties': t('noProperties.description'),
      'no-deals': t('noDeals.description'),
      'no-activities': t('noActivities.description'),
      'no-documents': t('noDocuments.description'),
    };
    return descriptions[type];
  };
  
  const getIcon = () => {
    if (CustomIcon) return CustomIcon;
    const icons: Record<EmptyStateType, ReactNode> = {
      'default': <Inbox className="w-8 h-8" />,
      'no-results': <Search className="w-8 h-8" />,
      'no-clients': <Users className="w-8 h-8" />,
      'no-leads': <Users className="w-8 h-8" />,
      'no-properties': <Building className="w-8 h-8" />,
      'no-deals': <FileText className="w-8 h-8" />,
      'no-activities': <Inbox className="w-8 h-8" />,
      'no-documents': <FileQuestion className="w-8 h-8" />,
    };
    return icons[type];
  };

  const actionText = actionLabel || action?.label;
  const handleAction = onAction || action?.onClick;

  return (
    <div 
      className={`flex flex-col items-center justify-center text-center animate-fade-in ${sizeConfig.container} ${className}`}
      role="status"
      aria-live="polite"
    >
      {/* Icon Container */}
      <div 
        className={`
          ${sizeConfig.icon} rounded-full 
          bg-gradient-to-br from-gray-100 to-gray-50 
          dark:from-gray-800 dark:to-gray-900 
          flex items-center justify-center mb-4
          text-gray-400 dark:text-gray-500
          ring-1 ring-gray-200/50 dark:ring-gray-700/50
        `}
        aria-hidden="true"
      >
        {getIcon()}
      </div>

      {/* Title */}
      <h3 className={`${sizeConfig.title} font-semibold text-gray-900 dark:text-gray-100 mb-2`}>
        {getTitle()}
      </h3>

      {/* Description */}
      <p className={`${sizeConfig.description} text-gray-500 dark:text-gray-400 max-w-sm mb-6 leading-relaxed`}>
        {getDescription()}
      </p>

      {/* Action Button */}
      {(actionText || handleAction) && (
        actionHref ? (
          <a
            href={actionHref}
            className={`
              ${sizeConfig.button}
              inline-flex items-center gap-2
              bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-500 hover:to-blue-600
              text-white rounded-xl
              shadow-lg shadow-blue-500/20
              hover:shadow-xl hover:shadow-blue-500/30
              transition-all duration-200
              hover:-translate-y-0.5
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-900
            `}
            aria-label={actionText}
          >
            {actionText}
          </a>
        ) : (
          <button
            onClick={handleAction}
            className={`
              ${sizeConfig.button}
              inline-flex items-center gap-2
              bg-gradient-to-r from-blue-600 to-blue-700 
              hover:from-blue-500 hover:to-blue-600
              text-white rounded-xl
              shadow-lg shadow-blue-500/20
              hover:shadow-xl hover:shadow-blue-500/30
              transition-all duration-200
              hover:-translate-y-0.5
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              dark:focus:ring-offset-gray-900
              active:scale-[0.98]
            `}
            aria-label={actionText}
          >
            {actionText}
          </button>
        )
      )}
      
      {/* Screen reader text for status */}
      <span className="sr-only">
        {tA11y('emptyState', { type })}
      </span>
    </div>
  );
});

EmptyState.displayName = 'EmptyState';

export default EmptyState;
