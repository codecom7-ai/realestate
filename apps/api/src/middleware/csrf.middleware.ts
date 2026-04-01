// ═══════════════════════════════════════════════════════════════
// CSRF Middleware — Double-Submit Cookie Pattern
// csrf-token: NOT HttpOnly (JS must read it)
// csrf-token: Secure=true in production (HTTPS only)
// ═══════════════════════════════════════════════════════════════

import { Injectable, NestMiddleware } from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

// Paths excluded from CSRF check (POST/PUT/DELETE)
const EXCLUDE_PREFIXES = [
  '/api/v1/auth/login',
  '/api/v1/auth/refresh',
  '/api/v1/auth/logout',
  '/api/v1/auth/me',
  '/api/v1/public/',
  '/api/v1/setup/',
  '/api/docs/',
  '/health',
];

interface TD { t: string; e: number; }
const store = new Map<string, TD>();
setInterval(() => { const n = Date.now(); for (const [k, v] of store) if (n > v.e) store.delete(k); }, 300_000);

@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  private readonly secret: string;

  constructor(private cfg: ConfigService) {
    this.secret = this.cfg.get<string>('CSRF_SECRET', 'csrf-default-change-in-prod');
  }

  async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const method = (req.method || '').toUpperCase();
    const url    = req.url || '';

    // ① Safe methods: set token, pass through
    if (SAFE_METHODS.includes(method)) {
      if (method === 'GET') this.issue(req, res);
      return next();
    }

    // ② Excluded paths: always pass through
    if (EXCLUDE_PREFIXES.some(p => url.startsWith(p))) {
      return next();
    }

    // ③ Validate CSRF for all other unsafe methods
    const { ok, msg, ar } = this.validate(req);
    if (!ok) {
      res.setHeader('Content-Type', 'application/json');
      (res as any).statusCode = 403;
      return res.end(JSON.stringify({
        success: false,
        error: { code: 'CSRF_TOKEN_INVALID', message: msg, messageAr: ar },
      }));
    }

    next();
  }

  // ── helpers ─────────────────────────────────────────────────
  private isProduction(): boolean { return process.env.NODE_ENV === 'production'; }

  private sign(t: string): string {
    const sig = crypto.createHmac('sha256', this.secret).update(t).digest('hex');
    return `${t}.${sig}`;
  }

  private unsign(s: string): string | null {
    const dot = s.lastIndexOf('.');
    if (dot < 1) return null;
    const [t, sig] = [s.slice(0, dot), s.slice(dot + 1)];
    const exp = crypto.createHmac('sha256', this.secret).update(t).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(exp, 'hex')) ? t : null;
    } catch { return null; }
  }

  private parseCookies(h: string): Record<string, string> {
    const o: Record<string, string> = {};
    for (const p of (h || '').split(';')) {
      const i = p.indexOf('=');
      if (i > 0) o[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    }
    return o;
  }

  private issue(req: FastifyRequest['raw'], res: FastifyReply['raw']): void {
    const cookies = this.parseCookies(req.headers.cookie || '');
    let signed    = cookies['csrf-token'];

    if (!signed) {
      const token = crypto.randomBytes(32).toString('hex');
      signed      = this.sign(token);
      store.set(token, { t: token, e: Date.now() + 86_400_000 });

      // ✅ NO HttpOnly → JS can read it
      // ✅ Secure in production (HTTPS)
      const secureFlag = this.isProduction() ? '; Secure' : '';
      res.setHeader(
        'Set-Cookie',
        `csrf-token=${signed}; Path=/; SameSite=Strict${secureFlag}; Max-Age=86400`,
      );
    }

    // Expose via header too (for SPA first-load)
    res.setHeader('X-CSRF-Token', signed);
  }

  private validate(req: FastifyRequest['raw']): { ok: boolean; msg: string; ar: string } {
    const fail = (m: string, a: string) => ({ ok: false, msg: m, ar: a });

    const header = req.headers['x-csrf-token'] as string | undefined;
    if (!header) return fail('CSRF token missing from header', 'رمز CSRF مفقود من الرأس');

    const cookie = this.parseCookies(req.headers.cookie || '')['csrf-token'];
    if (!cookie) return fail('CSRF cookie missing', 'كوكي CSRF مفقود');

    if (header !== cookie) return fail('CSRF token mismatch', 'رمز CSRF غير متطابق');

    const token = this.unsign(header);
    if (!token) return fail('Invalid CSRF signature', 'توقيع CSRF غير صالح');

    // Auto-register if not in store (handles PM2 cluster restart)
    const data = store.get(token);
    if (!data) {
      store.set(token, { t: token, e: Date.now() + 86_400_000 });
    } else if (Date.now() > data.e) {
      store.delete(token);
      return fail('CSRF token expired', 'رمز CSRF منتهي الصلاحية');
    }

    return { ok: true, msg: 'OK', ar: 'صالح' };
  }
}
