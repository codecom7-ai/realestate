// ═══════════════════════════════════════════════════════════════
// Auth Controller — NestJS 11 + Fastify 5 + @fastify/cookie
// ═══════════════════════════════════════════════════════════════

import {
  Controller, Post, Get, Body, HttpCode, HttpStatus,
  Req, Res, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';

const isProd = () => process.env.NODE_ENV === 'production';

const cookieOpts = () => ({
  httpOnly:  true,
  secure:    isProd(),
  sameSite:  'strict' as const,
  path:      '/',
});

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── POST /auth/login ────────────────────────────────────────
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login' })
  async login(
    @Body() dto: LoginDto,
    @Req()  req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const result = await this.authService.login(
      dto,
      req.ip     || 'unknown',
      req.headers['user-agent'] || 'unknown',
    );

    reply.setCookie('accessToken',  result.accessToken,  { ...cookieOpts(), maxAge: 900     });
    reply.setCookie('refreshToken', result.refreshToken, { ...cookieOpts(), maxAge: 604800  });

    return { success: true, data: { user: result.user } };
  }

  // ── GET /auth/me ────────────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get current user' })
  async me(@Req() req: FastifyRequest) {
    const user = (req as any).user;
    return { success: true, data: user };
  }

  // ── POST /auth/refresh ──────────────────────────────────────
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token' })
  async refresh(
    @Req()  req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      return {
        success: false,
        error: { code: 'NO_REFRESH_TOKEN', message: 'No refresh token', messageAr: 'لا يوجد رمز تحديث' },
      };
    }

    const result = await this.authService.refresh(
      refreshToken,
      req.ip || 'unknown',
      req.headers['user-agent'] || 'unknown',
    );

    reply.setCookie('accessToken',  result.accessToken,  { ...cookieOpts(), maxAge: 900    });
    reply.setCookie('refreshToken', result.refreshToken, { ...cookieOpts(), maxAge: 604800 });

    return { success: true, data: { message: 'Token refreshed' } };
  }

  // ── POST /auth/logout ───────────────────────────────────────
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout' })
  async logout(
    @Req()  req: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken = req.cookies?.refreshToken;
    const user         = (req as any).user;
    if (refreshToken && user?.id) {
      await this.authService.logout(refreshToken, user.id);
    }

    const clear = { ...cookieOpts(), maxAge: 0 };
    reply.setCookie('accessToken',  '', clear);
    reply.setCookie('refreshToken', '', clear);
  }
}
