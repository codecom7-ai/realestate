// ═══════════════════════════════════════════════════════════════
// proxy.ts — Next.js 16.2.1 Proxy (replaces middleware.ts)
// See: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SUPPORTED_LOCALES = ['ar', 'en'] as const;
const DEFAULT_LOCALE    = 'ar' as const;
type Locale = typeof SUPPORTED_LOCALES[number];

// Public pages — no auth needed
const PUBLIC_PAGES = ['/login'];

// Assets to pass through unchanged
const STATIC_PREFIXES = [
  '/_next/static', '/_next/image',
  '/favicon', '/sw.js', '/manifest.json',
  '/icons', '/images', '/fonts', '/downloads',
];

// ── helpers ───────────────────────────────────────────────────
function isStatic(p: string): boolean {
  return (
    STATIC_PREFIXES.some(s => p.startsWith(s)) ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|eot|pdf|zip)$/.test(p)
  );
}

function stripLocale(p: string): string {
  return p.replace(/^\/(ar|en)/, '') || '/';
}

function getLocale(req: NextRequest): Locale {
  const c = req.cookies.get('NEXT_LOCALE')?.value;
  return SUPPORTED_LOCALES.includes(c as Locale) ? (c as Locale) : DEFAULT_LOCALE;
}

function isAuth(req: NextRequest): boolean {
  return !!(req.cookies.get('accessToken')?.value || req.cookies.get('refreshToken')?.value);
}

function sec(res: NextResponse): NextResponse {
  res.headers.set('X-Content-Type-Options',  'nosniff');
  res.headers.set('X-Frame-Options',          'DENY');
  res.headers.set('X-XSS-Protection',         '1; mode=block');
  res.headers.set('Referrer-Policy',           'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy',        'camera=(), microphone=(), geolocation=()');
  return res;
}

// ── Main proxy ─────────────────────────────────────────────────
export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;

  // ① Static/asset files
  if (isStatic(pathname)) return NextResponse.next();

  // ② API routes — pass through to NestJS via OLS reverse proxy or Next.js rewrite
  if (pathname.startsWith('/api/')) return sec(NextResponse.next());

  // ③ Locale detection
  const localeMatch  = pathname.match(/^\/(ar|en)(\/|$)/);
  const locale       = (localeMatch?.[1] as Locale) ?? getLocale(req);
  const pathNoLocale = localeMatch ? stripLocale(pathname) : pathname;

  // ④ Root "/" → redirect to login
  if (pathname === '/') {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    const res = NextResponse.redirect(url);
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
    return sec(res);
  }

  // ⑤ No locale prefix → add it
  if (!localeMatch) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}${pathname}`;
    const res = NextResponse.redirect(url);
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
    return sec(res);
  }

  // ⑥ /setup → ALWAYS redirect to login (setup done via seed)
  if (pathNoLocale === '/setup' || pathNoLocale.startsWith('/setup/')) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return sec(NextResponse.redirect(url));
  }

  // ⑦ Public pages (/login)
  if (PUBLIC_PAGES.some(p => pathNoLocale === p || pathNoLocale.startsWith(p + '/'))) {
    if (isAuth(req)) {
      // Already authenticated → dashboard
      const url = req.nextUrl.clone();
      url.pathname = `/${locale}/dashboard`;
      return sec(NextResponse.redirect(url));
    }
    const res = NextResponse.next();
    res.cookies.set('NEXT_LOCALE', locale, { path: '/', maxAge: 31_536_000, sameSite: 'lax' });
    return sec(res);
  }

  // ⑧ Protected routes → must be authenticated
  if (!isAuth(req)) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    const res = NextResponse.redirect(url);
    res.cookies.set('redirect_after_login', pathname, {
      path: '/', maxAge: 1800, sameSite: 'lax',
    });
    return sec(res);
  }

  // ⑨ Authenticated → continue
  const res = NextResponse.next();
  res.cookies.set('NEXT_LOCALE', locale, {
    path: '/', maxAge: 31_536_000, sameSite: 'lax', httpOnly: false,
  });
  return sec(res);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico).*)',
    '/',
  ],
};
