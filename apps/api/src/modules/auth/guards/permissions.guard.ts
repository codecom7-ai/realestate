// ═══════════════════════════════════════════════════════════════
// Permissions Guard
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSIONS_KEY } from '../../../common/decorators/require-permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User not authenticated',
          messageAr: 'المستخدم غير مصادق عليه',
        },
      });
    }

    // Check if user has all required permissions
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
          messageAr: 'ليس لديك صلاحية للوصول إلى هذا المورد',
          details: requiredPermissions.map((p) => ({
            field: 'permission',
            message: `Missing permission: ${p}`,
          })),
        },
      });
    }

    return true;
  }
}
