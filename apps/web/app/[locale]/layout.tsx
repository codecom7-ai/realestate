// ═══════════════════════════════════════════════════════════════
// Root Layout - Dynamic RTL/LTR Support (Next.js 16 + React 19)
// Features: generateStaticParams, React Compiler, Async Params
// ═══════════════════════════════════════════════════════════════

import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Cairo, Inter } from 'next/font/google';
import { Providers } from './providers';
import { cookies } from 'next/headers';
import '../../styles/globals.css';

// ═══════════════════════════════════════════════════════════════
// Supported Locales
// ═══════════════════════════════════════════════════════════════
export const RTL_LOCALES = ['ar'] as const;
export const SUPPORTED_LOCALES = ['ar', 'en'] as const;
export const DEFAULT_LOCALE = 'ar' as const;

// ═══════════════════════════════════════════════════════════════
// Font Optimization (Next.js 16)
// ═══════════════════════════════════════════════════════════════

// Arabic font (Cairo) - optimized with display: swap
const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-cairo',
  preload: true,
});

// English font (Inter) - optimized with display: swap
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

// ═══════════════════════════════════════════════════════════════
// Static Generation (Next.js 16)
// Generate static params for all locales at build time
// ═══════════════════════════════════════════════════════════════
export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

// ═══════════════════════════════════════════════════════════════
// Viewport (Next.js 16 - separate export)
// ═══════════════════════════════════════════════════════════════
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#1e40af' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
};

// ═══════════════════════════════════════════════════════════════
// Metadata (SEO Optimized)
// ═══════════════════════════════════════════════════════════════
export const metadata: Metadata = {
  title: {
    default: 'نظام تشغيل المكتب العقاري | Real Estate Office OS',
    template: '%s | عقارات',
  },
  description: 'نظام متكامل لإدارة المكاتب العقارية المصرية - إدارة العملاء، العقارات، الصفقات، المدفوعات والامتثال',
  keywords: ['عقارات', 'مصر', 'إدارة', 'CRM', 'سمسرة', 'إيجار', 'بيع', 'real estate', 'property management'],
  authors: [{ name: 'Real Estate OS Team' }],
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'ar_EG',
    alternateLocale: 'en_US',
    siteName: 'عقارات - نظام تشغيل المكتب العقاري',
    title: 'نظام تشغيل المكتب العقاري',
    description: 'نظام متكامل لإدارة المكاتب العقارية المصرية',
  },
  // Twitter
  twitter: {
    card: 'summary_large_image',
    title: 'نظام تشغيل المكتب العقاري',
    description: 'نظام متكامل لإدارة المكاتب العقارية المصرية',
  },
  // Robots
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  // Icons
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  // Manifest for PWA
  manifest: '/manifest.json',
};

// ═══════════════════════════════════════════════════════════════
// Helper: Get locale from cookies
// ═══════════════════════════════════════════════════════════════
async function getLocaleFromCookie(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get('NEXT_LOCALE')?.value || DEFAULT_LOCALE;
}

// ═══════════════════════════════════════════════════════════════
// Root Layout Component (Next.js 16 Async Params)
// ═══════════════════════════════════════════════════════════════
export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Await params (Next.js 16 requirement)
  const { locale: urlLocale } = await params;
  
  // Get locale preference
  const cookieLocale = await getLocaleFromCookie();
  
  // URL locale takes precedence, then cookie, then default
  const locale = urlLocale || cookieLocale || DEFAULT_LOCALE;
  const dir = RTL_LOCALES.includes(locale as 'ar') ? 'rtl' : 'ltr';
  
  // Get messages for the locale (cached automatically by next-intl)
  const messages = await getMessages();

  return (
    <html 
      lang={locale} 
      dir={dir} 
      className={`${cairo.variable} ${inter.variable}`}
      suppressHydrationWarning
    >
      <body className={`font-sans antialiased ${dir === 'rtl' ? 'rtl' : 'ltr'}`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <Providers initialLocale={locale as 'ar' | 'en'}>
            {children}
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
