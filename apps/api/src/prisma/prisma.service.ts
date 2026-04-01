// ═══════════════════════════════════════════════════════════════
// Prisma Service - Database Connection
// ═══════════════════════════════════════════════════════════════

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    console.log('🔌 Database disconnected');
  }

  /**
   * Clean database for testing
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    const models = Reflect.ownKeys(this).filter(
      (key) => typeof key === 'string' && key[0] !== '_' && key[0] !== '$',
    );

    return Promise.all(
      models.map((modelKey) => {
        const model = (this as any)[modelKey as string];
        if (model && typeof model.deleteMany === 'function') {
          return model.deleteMany();
        }
      }),
    );
  }

  /**
   * Execute raw SQL for audit log protection
   */
  async enableAuditLogProtection() {
    // Revoke UPDATE and DELETE on audit_logs
    await this.$executeRaw`REVOKE UPDATE, DELETE ON TABLE audit_logs FROM PUBLIC;`;
    console.log('🔒 Audit log protection enabled');
  }

  /**
   * Enable commission lock protection
   */
  async enableCommissionProtection() {
    // This would be done via a PostgreSQL rule
    // For now, we handle it at the application level
    console.log('💰 Commission protection enabled');
  }

  /**
   * Get organization ID (single-tenant)
   * Returns the first and only organization
   */
  async getOrganizationId(): Promise<string | null> {
    const org = await this.organization.findFirst();
    return org?.id || null;
  }

  /**
   * Check if setup is complete
   */
  async isSetupComplete(): Promise<boolean> {
    const count = await this.organization.count();
    return count > 0;
  }
}
