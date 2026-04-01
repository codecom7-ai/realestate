// ═══════════════════════════════════════════════════════════════
// Fastify Request Types - أنواع طلبات Fastify
// ═══════════════════════════════════════════════════════════════

import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      sub: string;
      email: string;
      role: string;
      branchId?: string;
      organizationId: string;
      permissions: string[];
    };
  }
}

export interface AuthenticatedRequest {
  user: {
    id: string;
    sub: string;
    email: string;
    role: string;
    branchId?: string;
    organizationId: string;
    permissions: string[];
  };
}
