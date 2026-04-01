// ═══════════════════════════════════════════════════════════════
// Customer Portal - بوابة العملاء
// نظام المكتب العقاري - واجهة مستقلة للعملاء
// ═══════════════════════════════════════════════════════════════

import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import '../styles/globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  variable: '--font-cairo',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'بوابة العميل - نظام المكتب العقاري',
  description: 'تتبع طلباتك العقارية، معايناتك، وعقودك بسهولة',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1e40af',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={cairo.variable}>
      <body className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        {children}
      </body>
    </html>
  );
}
