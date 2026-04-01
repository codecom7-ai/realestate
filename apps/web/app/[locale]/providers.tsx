'use client';

// ═══════════════════════════════════════════════════════════════
// Providers - Theme + Language + React Query + Offline Support
// Next.js 16 + React 19 Best Practices
// ═══════════════════════════════════════════════════════════════

import { useEffect, useMemo } from 'react';
import { ThemeProvider } from 'next-themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OfflineIndicator from '@/components/shared/OfflineIndicator';
import { 
  LanguageProvider, 
  Locale, 
  RTL_LOCALES 
} from '@/components/shared/LanguageProvider';

// ═══════════════════════════════════════════════════════════════
// React Query Configuration
// Optimized for React 19 with proper caching defaults
// ═══════════════════════════════════════════════════════════════

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time: 5 minutes - data is fresh for 5 mins
        staleTime: 5 * 60 * 1000,
        // Cache time: 30 minutes - keep in cache for 30 mins
        gcTime: 30 * 60 * 1000,
        // Retry failed requests up to 3 times
        retry: 3,
        // Retry delay with exponential backoff
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // Refetch on window focus
        refetchOnWindowFocus: true,
        // Refetch on reconnect
        refetchOnReconnect: true,
        // Structural sharing for better performance
        structuralSharing: true,
      },
      mutations: {
        // Retry mutations once
        retry: 1,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    if (!browserQueryClient) {
      browserQueryClient = makeQueryClient();
    }
    return browserQueryClient;
  }
}

// ═══════════════════════════════════════════════════════════════
// Providers Props
// ═══════════════════════════════════════════════════════════════

interface ProvidersProps {
  children: React.ReactNode;
  initialLocale?: Locale;
}

// ═══════════════════════════════════════════════════════════════
// Providers Component
// ═══════════════════════════════════════════════════════════════

export function Providers({ children, initialLocale }: ProvidersProps) {
  // Memoize query client to prevent recreation
  const queryClient = useMemo(() => getQueryClient(), []);

  // ═══════════════════════════════════════════════════════════════
  // Service Worker Registration (PWA)
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('[PWA] Service Worker registered:', registration.scope);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] New version available');
              // Show update notification
              if (confirm('يتوفر تحديث جديد. هل تريد تحديث الصفحة؟')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    };

    // Register after page load
    window.addEventListener('load', registerServiceWorker);

    // Handle service worker messages
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_REQUIRED') {
        window.dispatchEvent(new CustomEvent('app:sync-required'));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('load', registerServiceWorker);
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════════
  // Update document direction when locale changes
  // ═══════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof document === 'undefined' || !initialLocale) return;

    const dir = RTL_LOCALES.includes(initialLocale) ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = initialLocale;
    document.body.classList.remove('rtl', 'ltr');
    document.body.classList.add(dir);
  }, [initialLocale]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
        storageKey="theme"
      >
        <LanguageProvider initialLocale={initialLocale}>
          {/* Offline Status Indicator */}
          <OfflineIndicator />
          
          {/* Main Content */}
          {children}
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
