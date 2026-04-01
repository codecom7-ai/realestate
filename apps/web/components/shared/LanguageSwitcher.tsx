'use client';

// ═══════════════════════════════════════════════════════════════
// LanguageSwitcher Component - تبديل اللغة
// ═══════════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useId } from 'react';
import { useTranslations } from 'next-intl';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

const LANGUAGES = [
  { code: 'ar' as const, name: 'العربية', flag: '🇪🇬', dir: 'rtl' },
  { code: 'en' as const, name: 'English', flag: '🇬🇧', dir: 'ltr' },
];

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const t = useTranslations('accessibility');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        buttonRef.current?.focus();
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  // Handle keyboard navigation in menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const buttons = dropdownRef.current?.querySelectorAll('[role="menuitem"]');
      if (buttons && buttons.length > 0) {
        const currentIndex = Array.from(buttons).findIndex(btn => btn === document.activeElement);
        const nextIndex = e.key === 'ArrowDown' 
          ? (currentIndex + 1) % buttons.length 
          : (currentIndex - 1 + buttons.length) % buttons.length;
        (buttons[nextIndex] as HTMLElement).focus();
      }
    }
  };

  const handleSelectLanguage = (code: 'ar' | 'en') => {
    setLocale(code);
    setIsOpen(false);

    // Update document direction and lang
    document.documentElement.dir = code === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = code;

    // Set cookie
    document.cookie = `NEXT_LOCALE=${code};path=/;max-age=31536000`;

    // Reload to apply server-side changes
    window.location.reload();
  };

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('changeLanguage')}
        aria-expanded={isOpen}
        aria-controls={menuId}
        aria-haspopup="menu"
      >
        <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
        <span className="text-lg" aria-hidden="true">{currentLang.flag}</span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
          {currentLang.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
        <span className="sr-only">{t('currentLanguage')}: {currentLang.name}</span>
      </button>

      {isOpen && (
        <div 
          id={menuId}
          className="absolute top-full mt-2 end-0 min-w-[160px] bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50 animate-fade-in"
          role="menu"
          aria-label={t('selectLanguage')}
          onKeyDown={handleKeyDown}
        >
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelectLanguage(lang.code)}
              className={`
                w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                ${locale === lang.code ? 'text-primary font-medium' : 'text-gray-700 dark:text-gray-300'}
              `}
              role="menuitem"
              aria-label={lang.name}
              aria-current={locale === lang.code ? 'true' : undefined}
            >
              <span className="text-lg" aria-hidden="true">{lang.flag}</span>
              <span className="flex-1 text-start">{lang.name}</span>
              {locale === lang.code && (
                <Check className="w-4 h-4 text-primary" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact version for mobile
export function LanguageSwitcherCompact() {
  const { locale, setLocale } = useLocale();
  const t = useTranslations('accessibility');

  const toggleLanguage = () => {
    const newLocale = locale === 'ar' ? 'en' : 'ar';
    setLocale(newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`;
    window.location.reload();
  };

  const newLocale = locale === 'ar' ? 'en' : 'ar';
  const newLangName = locale === 'ar' ? t('languageEnglish') : t('languageArabic');

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      aria-label={`${t('changeLanguage')} - ${newLangName}`}
    >
      <Globe className="w-4 h-4 text-gray-600 dark:text-gray-400" aria-hidden="true" />
      <span className="text-xs font-medium" aria-hidden="true">{locale === 'ar' ? 'EN' : 'ع'}</span>
    </button>
  );
}
