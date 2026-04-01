'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Home,
  Users,
  Building2,
  Handshake,
  Inbox,
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', icon: Home, href: '/dashboard' },
  { key: 'leads', icon: Users, href: '/dashboard/leads' },
  { key: 'properties', icon: Building2, href: '/dashboard/properties' },
  { key: 'deals', icon: Handshake, href: '/dashboard/deals' },
  { key: 'inbox', icon: Inbox, href: '/dashboard/inbox' },
];

export function BottomNav() {
  const t = useTranslations('nav');
  const tA11y = useTranslations('accessibility');
  const pathname = usePathname();

  return (
    <nav 
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 safe-area-bottom shadow-lg"
      role="navigation"
      aria-label={tA11y('mainNavigation')}
    >
      <ul className="flex items-center justify-around h-14 sm:h-16 px-2" role="list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));

          return (
            <li key={item.key} role="listitem" className="flex-1">
              <Link
                href={item.href}
                className={`
                  relative flex flex-col items-center justify-center w-full h-full
                  transition-all duration-200 ease-out
                  ${isActive ? 'text-primary' : 'text-gray-500 dark:text-gray-400'}
                  active:scale-95
                `}
                aria-current={isActive ? 'page' : undefined}
                aria-label={isActive ? `${t(item.key)} - ${tA11y('currentPage')}` : t(item.key)}
              >
                {/* Active indicator */}
                {isActive && (
                  <span 
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" 
                    aria-hidden="true" 
                  />
                )}

                <div className={`
                  p-1.5 rounded-xl transition-all duration-200
                  ${isActive ? 'bg-primary/10' : ''}
                `}>
                  <Icon 
                    className={`w-5 h-5 sm:w-6 sm:h-6 transition-transform ${isActive ? 'scale-110' : ''}`} 
                    aria-hidden="true" 
                  />
                </div>

                <span className={`
                  text-[10px] sm:text-xs mt-0.5 font-medium transition-all
                  ${isActive ? 'text-primary' : ''}
                `}>
                  {t(item.key)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
