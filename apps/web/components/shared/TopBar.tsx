'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/hooks/useAuth';
import { Bell, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { LanguageSwitcher, LanguageSwitcherCompact } from '@/components/shared/LanguageSwitcher';

export function TopBar() {
  const { user }                = useAuthStore();
  const { resolvedTheme, setTheme } = useTheme();
  const t                       = useTranslations('accessibility');
  const [mounted, setMounted]   = useState(false);

  // Avoid hydration mismatch — only render theme toggle after mount
  useEffect(() => { setMounted(true); }, []);

  const handleThemeToggle = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <header
      className="sticky top-0 z-40 h-14 sm:h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-3 sm:px-4 lg:px-6"
      role="banner"
    >
      {/* Global Search */}
      <GlobalSearch />

      {/* Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Language Switcher — Desktop */}
        <div className="hidden sm:block">
          <LanguageSwitcher />
        </div>
        {/* Language Switcher — Mobile */}
        <div className="sm:hidden">
          <LanguageSwitcherCompact />
        </div>

        {/* Theme Toggle */}
        {mounted && (
          <button
            onClick={handleThemeToggle}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={isDark ? t('switchToLight') : t('switchToDark')}
            aria-pressed={isDark}
            role="switch"
          >
            {isDark
              ? <Sun  className="w-5 h-5 text-yellow-400" aria-hidden="true" />
              : <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
            }
          </button>
        )}

        {/* Notifications */}
        <button
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={t('notifications')}
          aria-haspopup="dialog"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" aria-hidden="true" />
          <span className="absolute top-1 start-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
          <span className="sr-only">{t('notificationsCount', { count: 1 })}</span>
        </button>

        {/* User Avatar (Mobile only) */}
        <div
          className="lg:hidden w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center select-none"
          role="img"
          aria-label={`${user?.firstName || 'User'} avatar`}
        >
          <span className="text-blue-700 dark:text-blue-200 text-sm font-semibold">
            {user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
          </span>
        </div>
      </div>
    </header>
  );
}
