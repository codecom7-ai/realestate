// ═══════════════════════════════════════════════════════════════
// Setup Middleware - Redirects to setup if not initialized
// ═══════════════════════════════════════════════════════════════

import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SetupMiddleware implements NestMiddleware {
  private setupDone: boolean | null = null;

  constructor(private prisma: PrismaService) {}

  async use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    // Cache the setup status
    if (this.setupDone === null) {
      const orgCount = await this.prisma.organization.count();
      this.setupDone = orgCount > 0;
    }

    // If setup is done, continue
    if (this.setupDone) {
      next();
      return;
    }

    // Check if this is the setup route or health check
    const url = req.url || '';
    if (url.startsWith('/api/v1/setup') || url.startsWith('/health') || url.startsWith('/api/docs')) {
      next();
      return;
    }

    // Redirect to setup
    // For API requests, return a JSON response
    if (url.startsWith('/api')) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 503;
      res.end(JSON.stringify({
        success: false,
        error: {
          code: 'SETUP_REQUIRED',
          message: 'System setup is required',
          messageAr: 'يجب إعداد النظام أولاً',
        },
      }));
      return;
    }

    // For other requests, redirect to setup page
    res.statusCode = 302;
    res.setHeader('Location', '/setup');
    res.end();
  }
}
