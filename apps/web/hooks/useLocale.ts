// useLocale Hook - Language State Management + Navigation
'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useLocale as useNextIntlLocale } from 'next-intl';

export type Locale = 'ar' | 'en';

export function useLocale() {
  const router    = useRouter();
  const pathname  = usePathname();
  const locale    = useNextIntlLocale() as Locale;

  const setLocale = (newLocale: Locale) => {
    if (newLocale === locale) return;

    // Set NEXT_LOCALE cookie
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

    // Replace current locale prefix in pathname
    // e.g. /ar/dashboard → /en/dashboard
    const newPath = pathname.replace(/^\/(ar|en)/, `/${newLocale}`);
    router.push(newPath);
    router.refresh();
  };

  const toggleLocale = () => setLocale(locale === 'ar' ? 'en' : 'ar');

  return {
    locale,
    setLocale,
    toggleLocale,
    direction: locale === 'ar' ? 'rtl' : 'ltr',
    isRTL:     locale === 'ar',
    isArabic:  locale === 'ar',
  };
}

// Keep named export for backward compat
export { useLocale as default };
