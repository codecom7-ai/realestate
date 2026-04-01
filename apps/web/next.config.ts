// ═══════════════════════════════════════════════════════════════
// Next.js 16.2 Configuration
// Features: React Compiler, Turbopack, Image Optimization, Caching
// ═══════════════════════════════════════════════════════════════
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,

  experimental: {
    optimizePackageImports: ['@heroicons/react', 'lucide-react', 'recharts', 'framer-motion', 'date-fns'],
  },

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102',
    npm_package_manager: 'npm',
    NEXT_SKIP_LOCKFILE_PATCH: '1',
  },

  // ══════════════════════════════════════════════════════════
  // /api/* → NestJS on :3102
  // يحل مشكلة: 403, 503, cookies same-origin
  // ══════════════════════════════════════════════════════════
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL || 'http://localhost:3102';
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
    deviceSizes:      [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes:       [16, 32, 48, 64, 96, 128, 256, 384],
    qualities:        [25, 50, 75, 100],
    formats:          ['image/avif', 'image/webp'],
    minimumCacheTTL:  60 * 60 * 24 * 365,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
    ];
  },

  reactStrictMode: true,
  transpilePackages: ['@realestate/shared-types', '@realestate/shared-utils'],
};

export default withNextIntl(nextConfig);
