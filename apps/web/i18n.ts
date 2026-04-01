// ═══════════════════════════════════════════════════════════════
// i18n Configuration - Server-side with Caching
// Next.js 16 optimized with message caching
// ═══════════════════════════════════════════════════════════════

import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { cache } from 'react';

// ═══════════════════════════════════════════════════════════════
// Locale Configuration
// ═══════════════════════════════════════════════════════════════

export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export const DEFAULT_LOCALE = 'ar' as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

// ═══════════════════════════════════════════════════════════════
// Cached Message Loader
// React.cache ensures messages are loaded once per request
// ═══════════════════════════════════════════════════════════════

const loadMessages = cache(async (locale: string) => {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // Fallback to default locale
    return (await import(`./messages/${DEFAULT_LOCALE}.json`)).default;
  }
});

// ═══════════════════════════════════════════════════════════════
// Locale Detection
// Priority: Cookie > Accept-Language > Default
// ═══════════════════════════════════════════════════════════════

const getLocale = cache(async (): Promise<string> => {
  const cookieStore = await cookies();
  const headersList = await headers();

  // 1. Check cookie first (highest priority - user explicit preference)
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale as Locale)) {
    return cookieLocale;
  }

  // 2. Check Accept-Language header
  const acceptLanguage = headersList.get('accept-language');
  if (acceptLanguage) {
    // Parse Accept-Language header
    // Example: "ar-EG,ar;q=0.9,en;q=0.8"
    const languages = acceptLanguage
      .split(',')
      .map((lang) => {
        const [code, q] = lang.trim().split(';q=');
        return {
          code: code.split('-')[0].toLowerCase(), // Get base language (ar from ar-EG)
          quality: q ? parseFloat(q) : 1,
        };
      })
      .sort((a, b) => b.quality - a.quality);

    // Find first supported language
    for (const lang of languages) {
      if (SUPPORTED_LOCALES.includes(lang.code as Locale)) {
        return lang.code;
      }
    }
  }

  // 3. Default to Arabic
  return DEFAULT_LOCALE;
});

// ═══════════════════════════════════════════════════════════════
// Export getLocale for use in other files
// ═══════════════════════════════════════════════════════════════

export { getLocale };

// ═══════════════════════════════════════════════════════════════
// Next-intl Request Configuration
// ═══════════════════════════════════════════════════════════════

export default getRequestConfig(async () => {
  const locale = await getLocale();

  return {
    locale,
    messages: await loadMessages(locale),
    // Timezone for date formatting (Egypt)
    timeZone: 'Africa/Cairo',
    // Enable strict mode for better type safety
    getMessageFallback: ({ key, namespace }) => {
      return `${namespace ? `${namespace}.` : ''}${key}`;
    },
  };
});
