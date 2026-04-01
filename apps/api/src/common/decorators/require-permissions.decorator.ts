// ═══════════════════════════════════════════════════════════════
// Require Permissions Decorator
// ═══════════════════════════════════════════════════════════════

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_PERMISSIONS_KEY = 'require_permissions';

/**
 * Decorator to specify required permissions for an endpoint
 * @example @RequirePermissions('leads:read', 'leads:write')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(REQUIRE_PERMISSIONS_KEY, permissions);
