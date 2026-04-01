// ═══════════════════════════════════════════════════════════════
// SkipLink Component - رابط تخطي للمحتوى الرئيسي (Accessibility)
// ═══════════════════════════════════════════════════════════════

'use client';

import { useTranslations } from 'next-intl';
import { memo } from 'react';

export const SkipLink = memo(function SkipLink() {
  const t = useTranslations('accessibility');

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-[9999] 
        focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg 
        focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        transition-all duration-200"
    >
      {t('skipToContent')}
    </a>
  );
});

export default SkipLink;
