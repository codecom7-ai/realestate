'use client';

import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/hooks/useAuth';
import {
  Home,
  Users,
  Building2,
  Handshake,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Zap,
  Sparkles,
  Inbox,
  X,
  DollarSign,
  Receipt,
  FileCheck,
  BarChart3,
  Calendar,
  Shield,
  CreditCard,
  BookOpen,
  ClipboardList,
  Landmark,
  TrendingUp,
  Eye,
  Bell,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

// Navigation items organized by category
const navItems = [
  { key: 'dashboard', icon: Home, href: '/dashboard' },
  { key: 'leads', icon: Users, href: '/dashboard/leads' },
  { key: 'clients', icon: Users, href: '/dashboard/clients' },
  { key: 'properties', icon: Building2, href: '/dashboard/properties' },
  { key: 'deals', icon: Handshake, href: '/dashboard/deals' },
  { key: 'reservations', icon: Calendar, href: '/dashboard/reservations' },
  { key: 'viewings', icon: Eye, href: '/dashboard/viewings' },
  { key: 'contracts', icon: FileText, href: '/dashboard/contracts' },
  { key: 'payments', icon: DollarSign, href: '/dashboard/payments' },
  { key: 'commissions', icon: CreditCard, href: '/dashboard/commissions' },
  { key: 'documents', icon: FileCheck, href: '/dashboard/documents' },
  { key: 'inbox', icon: Inbox, href: '/dashboard/inbox' },
  { key: 'eta', icon: Receipt, href: '/dashboard/eta' },
  { key: 'compliance', icon: Shield, href: '/dashboard/compliance' },
  { key: 'reports', icon: BarChart3, href: '/dashboard/reports' },
  { key: 'automation', icon: Zap, href: '/dashboard/automation' },
  { key: 'ai', icon: Sparkles, href: '/dashboard/ai-copilot' },
  { key: 'settings', icon: Settings, href: '/dashboard/settings' },
];

export function Sidebar() {
  const t = useTranslations('nav');
  const tA11y = useTranslations('accessibility');
  const tAuth = useTranslations('auth');
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed bottom-20 start-4 z-50 p-3 rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-all hover:scale-105 active:scale-95"
        aria-label={tA11y('openMenu')}
        aria-expanded={mobileOpen}
        aria-controls="mobile-sidebar"
        aria-haspopup="dialog"
      >
        <ChevronRight className="w-6 h-6" aria-hidden="true" />
      </button>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={() => setMobileOpen(false)}
          role="presentation"
          aria-hidden="true"
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        id="mobile-sidebar"
        className={`
          lg:hidden fixed inset-y-0 right-0 w-72 bg-white dark:bg-gray-900 z-50
          transform transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        role="dialog"
        aria-modal="true"
        aria-label={tA11y('sidebar')}
        aria-hidden={!mobileOpen}
      >
        <MobileSidebarContent 
          t={t} 
          tA11y={tA11y}
          tAuth={tAuth}
          pathname={pathname} 
          user={user} 
          logout={logout} 
          onClose={() => setMobileOpen(false)} 
        />
      </aside>

      {/* Desktop Sidebar */}
      <aside
        id="desktop-sidebar"
        className={`
          hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:right-0
          bg-white dark:bg-gray-900 border-s border-gray-200 dark:border-gray-800
          transition-all duration-300 ease-in-out
          ${collapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
        role="navigation"
        aria-label={tA11y('mainNavigation')}
      >
        <DesktopSidebarContent
          t={t}
          tA11y={tA11y}
          tAuth={tAuth}
          pathname={pathname}
          user={user}
          logout={logout}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
        />
      </aside>
    </>
  );
}

// Desktop Sidebar Content
function DesktopSidebarContent({
  t,
  tA11y,
  tAuth,
  pathname,
  user,
  logout,
  collapsed,
  setCollapsed,
}: {
  t: (key: string) => string;
  tA11y: (key: string) => string;
  tAuth: (key: string) => string;
  pathname: string;
  user: any;
  logout: () => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between h-14 lg:h-16 px-3 lg:px-4 border-b border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <h1 className="text-lg font-bold text-primary">عقارات</h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={collapsed ? tA11y('expandSidebar') : tA11y('collapseSidebar')}
          aria-expanded={!collapsed}
          aria-controls="desktop-sidebar"
        >
          {collapsed ? (
            <ChevronLeft className="w-5 h-5 text-gray-500" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 lg:px-3 py-3 lg:py-4 space-y-1 overflow-y-auto" role="navigation">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `/${item.href}` ||
              (item.href !== '/' && pathname.startsWith(`/${item.href}`));

            return (
              <li key={item.key} role="listitem">
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/25'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? t(item.key) : undefined}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={t(item.key)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
                  {!collapsed && <span>{t(item.key)}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 lg:p-4 border-t border-gray-200 dark:border-gray-800">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3" role="figure" aria-label={tA11y('userMenu')}>
            <div 
              className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-medium shadow-sm"
              aria-hidden="true"
            >
              {user?.firstName?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className={`
            flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium
            text-red-600 dark:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20
            transition-colors
            ${collapsed ? 'justify-center' : ''}
          `}
          aria-label={tAuth('logout')}
        >
          <LogOut className="w-4 h-4" aria-hidden="true" />
          {!collapsed && <span>{tAuth('logout')}</span>}
        </button>
      </div>
    </>
  );
}

// Mobile Sidebar Content
function MobileSidebarContent({
  t,
  tA11y,
  tAuth,
  pathname,
  user,
  logout,
  onClose,
}: {
  t: (key: string) => string;
  tA11y: (key: string) => string;
  tAuth: (key: string) => string;
  pathname: string;
  user: any;
  logout: () => void;
  onClose: () => void;
}) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold text-primary">عقارات</h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label={tA11y('closeMenu')}
        >
          <X className="w-5 h-5 text-gray-500" aria-hidden="true" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" role="navigation">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === `/${item.href}` ||
              (item.href !== '/' && pathname.startsWith(`/${item.href}`));

            return (
              <li key={item.key} role="listitem">
                <Link
                  href={item.href}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all
                    ${isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={t(item.key)}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span>{t(item.key)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-4" role="figure" aria-label={tA11y('userMenu')}>
          <div 
            className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-medium text-lg shadow-sm"
            aria-hidden="true"
          >
            {user?.firstName?.charAt(0) || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-base font-medium text-red-600 dark:text-red-400 rounded-xl bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          aria-label={tAuth('logout')}
        >
          <LogOut className="w-5 h-5" aria-hidden="true" />
          <span>{tAuth('logout')}</span>
        </button>
      </div>
    </>
  );
}
