// ═══════════════════════════════════════════════════════════════
// Audit Service - Append-Only Audit Log
// ═══════════════════════════════════════════════════════════════

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogData {
  organizationId: string;
  userId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  oldValue?: any;
  newValue?: any;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create audit log entry (append-only)
   */
  async log(data: AuditLogData) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        entityType: data.entityType,
        entityId: data.entityId,
        oldValue: data.oldValue || null,
        newValue: data.newValue || null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        sessionId: data.sessionId,
        occurredAt: new Date(),
      },
    });
  }

  /**
   * Get audit logs with pagination
   */
  async getLogs(
    organizationId: string,
    options: {
      userId?: string;
      action?: string;
      entityType?: string;
      entityId?: string;
      startDate?: Date;
      endDate?: Date;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const {
      userId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = options;

    const skip = (page - 1) * limit;

    const where: any = { organizationId };
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt.gte = startDate;
      if (endDate) where.occurredAt.lte = endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: { occurredAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + logs.length < total,
      },
    };
  }

  /**
   * Get audit log by ID
   */
  async getLogById(id: string, organizationId: string) {
    return this.prisma.auditLog.findFirst({
      where: { id, organizationId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get entity history
   */
  async getEntityHistory(
    entityType: string,
    entityId: string,
    organizationId: string,
  ) {
    return this.prisma.auditLog.findMany({
      where: {
        organizationId,
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
    });
  }

  /**
   * Export audit logs as CSV
   */
  async exportLogs(
    organizationId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
    } = {},
  ) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        organizationId,
        occurredAt: {
          ...(options.startDate && { gte: options.startDate }),
          ...(options.endDate && { lte: options.endDate }),
        },
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
    });

    // Convert to CSV
    const headers = [
      'ID',
      'Timestamp',
      'User',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'Old Value',
      'New Value',
    ];

    const rows = logs.map((log: any) => [
      log.id,
      log.occurredAt.toISOString(),
      log.user ? `${log.user.firstName} ${log.user.lastName}` : 'System',
      log.action,
      log.entityType,
      log.entityId || '',
      log.ipAddress || '',
      JSON.stringify(log.oldValue || {}),
      JSON.stringify(log.newValue || {}),
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n');

    return csv;
  }
}
