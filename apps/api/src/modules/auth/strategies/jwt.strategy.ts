// ═══════════════════════════════════════════════════════════════
// JWT Strategy — Cookie + Bearer Token
// Compatible with Fastify 5 + @fastify/cookie
// ═══════════════════════════════════════════════════════════════

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import type { FastifyRequest } from 'fastify';
import { AuthService, JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const isProd   = configService.get('NODE_ENV') === 'production';
    const privKey  = configService.get<string>('jwt.privateKey');
    const pubKey   = configService.get<string>('jwt.publicKey');
    const secret   = configService.get<string>('jwt.secret')
                  || configService.get<string>('JWT_SECRET');

    // Determine algorithm & key
    let secretOrKey: string;
    let algorithm: 'HS256' | 'RS256';

    if (isProd && pubKey) {
      secretOrKey = pubKey;
      algorithm   = 'RS256';
    } else if (secret) {
      secretOrKey = secret;
      algorithm   = 'HS256';
    } else {
      throw new Error('JWT_SECRET or JWT_PUBLIC_KEY must be configured');
    }

    super({
      // ✅ Fastify: req.cookies is populated by @fastify/cookie
      jwtFromRequest: (req: FastifyRequest) => {
        // 1. Try cookie (set by auth.controller after login)
        const fromCookie = (req as any).cookies?.accessToken;
        if (fromCookie) return fromCookie;

        // 2. Fallback: Authorization: Bearer <token> (for API clients)
        return ExtractJwt.fromAuthHeaderAsBearerToken()(req as any);
      },
      ignoreExpiration:  false,
      secretOrKey,
      algorithms:        [algorithm],
      passReqToCallback: false,
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.authService.validateUser(payload);
    if (!user) {
      throw new UnauthorizedException({
        code:      'TOKEN_INVALID',
        message:   'Invalid or expired token',
        messageAr: 'الرمز غير صالح أو منتهي الصلاحية',
      });
    }
    return user;
  }
}
