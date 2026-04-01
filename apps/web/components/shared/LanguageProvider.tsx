'use client';

// ═══════════════════════════════════════════════════════════════
// Language Provider - Zustand Store with LocalStorage Persistence
// ═══════════════════════════════════════════════════════════════

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { usePathname, useRouter } from 'next/navigation';

// Supported locales
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ar';

// RTL locales
export const RTL_LOCALES: Locale[] = ['ar'];

// Language names
export const LANGUAGE_NAMES: Record<Locale, { native: string; english: string }> = {
  ar: { native: 'العربية', english: 'Arabic' },
  en: { native: 'English', english: 'English' },
};

// ═══════════════════════════════════════════════════════════════
// Zustand Store
// ═══════════════════════════════════════════════════════════════

interface LanguageState {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  
  // Actions
  setLocale: (locale: Locale) => void;
  isRtl: () => boolean;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: DEFAULT_LOCALE,
      dir: 'rtl',

      setLocale: (locale: Locale) => {
        const dir = RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
        set({ locale, dir });
      },

      isRtl: () => {
        return RTL_LOCALES.includes(get().locale);
      },
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        locale: state.locale,
        dir: state.dir,
      }),
    }
  )
);

// ═══════════════════════════════════════════════════════════════
// React Context for hydration
// ═══════════════════════════════════════════════════════════════

interface LanguageContextValue {
  locale: Locale;
  dir: 'rtl' | 'ltr';
  setLocale: (locale: Locale) => Promise<void>;
  isRtl: boolean;
  languageNames: typeof LANGUAGE_NAMES;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// ═══════════════════════════════════════════════════════════════
// Provider Component
// ═══════════════════════════════════════════════════════════════

interface LanguageProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

export function LanguageProvider({ children, initialLocale }: LanguageProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, dir, setLocale: setStoreLocale, isRtl } = useLanguageStore();

  // Set initial locale from props if different from stored
  useEffect(() => {
    if (initialLocale && initialLocale !== locale) {
      setStoreLocale(initialLocale);
    }
  }, [initialLocale, locale, setStoreLocale]);

  // Update document direction and lang attribute
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = dir;
      document.documentElement.lang = locale;
      
      // Update body class for RTL/LTR styling
      document.body.classList.remove('rtl', 'ltr');
      document.body.classList.add(dir);
    }
  }, [locale, dir]);

  // Function to change language and navigate
  const handleSetLocale = async (newLocale: Locale) => {
    // Update store
    setStoreLocale(newLocale);

    // Save to cookie for server-side rendering
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=${60 * 60 * 24 * 365};SameSite=Lax`;

    // Navigate to new locale path
    if (pathname) {
      // Replace current locale in path with new locale
      const pathSegments = pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0 && SUPPORTED_LOCALES.includes(pathSegments[0] as Locale)) {
        pathSegments[0] = newLocale;
      } else {
        pathSegments.unshift(newLocale);
      }
      
      const newPath = '/' + pathSegments.join('/');
      router.push(newPath);
      router.refresh();
    }
  };

  const contextValue: LanguageContextValue = {
    locale,
    dir,
    setLocale: handleSetLocale,
    isRtl: isRtl() || RTL_LOCALES.includes(locale),
    languageNames: LANGUAGE_NAMES,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

export default LanguageProvider;
