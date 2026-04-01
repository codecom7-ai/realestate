// ═══════════════════════════════════════════════════════════════
// JWT Auth Guard
// ═══════════════════════════════════════════════════════════════

import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'You must be logged in to access this resource',
          messageAr: 'يجب تسجيل الدخول للوصول إلى هذا المورد',
        },
      });
    }
    return user;
  }
}
