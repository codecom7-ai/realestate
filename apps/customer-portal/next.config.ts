import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactCompiler: true,

  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102',
    npm_package_manager: 'npm',
    NEXT_SKIP_LOCKFILE_PATCH: '1',
  },

  // /api/* → NestJS on :3102 (same as admin dashboard)
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL || 'http://localhost:3102';
    return [
      { source: '/api/:path*', destination: `${apiBase}/api/:path*` },
    ];
  },

  images: {
    qualities: [25, 50, 75, 100],
    remotePatterns: [
      { protocol: 'https', hostname: '*.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },

  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options',        value: 'DENY' },
        { key: 'X-XSS-Protection',       value: '1; mode=block' },
        { key: 'Referrer-Policy',         value: 'strict-origin-when-cross-origin' },
      ],
    }];
  },
};

export default nextConfig;
