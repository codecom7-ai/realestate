// ═══════════════════════════════════════════════════════════════
// Current User Decorator - استخراج بيانات المستخدم الحالي
// ═══════════════════════════════════════════════════════════════

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Decorator لاستخراج بيانات المستخدم من الـ JWT payload
 *
 * @example
 * async someMethod(@CurrentUser('id') userId: string) { ... }
 * async someMethod(@CurrentUser() user: JwtPayload) { ... }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // إذا تم تحديد حقل معين، أرجع قيمته فقط
    if (data) {
      return user[data];
    }

    // وإلا أرجع كامل كائن المستخدم
    return user;
  },
);
