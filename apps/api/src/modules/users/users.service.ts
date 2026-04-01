// ═══════════════════════════════════════════════════════════════
// Users Service
// ═══════════════════════════════════════════════════════════════

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ROLE_PERMISSIONS } from '@realestate/shared-types';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all users (with pagination)
   */
  async findAll(organizationId: string, options: {
    role?: string;
    branchId?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  } = {}) {
    const { role, branchId, isActive, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, deletedAt: null };
    if (role) where.role = role;
    if (branchId) where.branchId = branchId;
    if (isActive !== undefined) where.isActive = isActive;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          firstNameAr: true,
          lastNameAr: true,
          phone: true,
          role: true,
          branchId: true,
          avatarUrl: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data: users,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + users.length < total,
      },
    };
  }

  /**
   * Get user by ID
   */
  async findOne(id: string, organizationId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        phone: true,
        role: true,
        permissions: true,
        branchId: true,
        avatarUrl: true,
        brokerLicenseNo: true,
        brokerLicenseExp: true,
        brokerClassification: true,
        isMfaEnabled: true,
        isActive: true,
        isEmailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: { id: true, name: true, nameAr: true },
        },
      },
    });

    if (!user) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        messageAr: 'المستخدم غير موجود',
      });
    }

    return user;
  }

  /**
   * Create new user
   */
  async create(dto: CreateUserDto, organizationId: string, createdBy: string) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException({
        code: 'EMAIL_EXISTS',
        message: 'Email already exists',
        messageAr: 'البريد الإلكتروني موجود مسبقاً',
      });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Get permissions for role
    const permissions = [...(ROLE_PERMISSIONS[dto.role as keyof typeof ROLE_PERMISSIONS] || [])];

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        branchId: dto.branchId,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        firstNameAr: dto.firstNameAr,
        lastNameAr: dto.lastNameAr,
        role: dto.role,
        permissions,
        brokerLicenseNo: dto.brokerLicenseNo,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        createdAt: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: createdBy,
        action: 'USER_CREATED',
        entityType: 'user',
        entityId: user.id,
        newValue: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    return {
      ...user,
      tempPassword, // Return temp password to be sent via email
    };
  }

  /**
   * Update user
   */
  async update(id: string, dto: UpdateUserDto, organizationId: string, updatedBy: string) {
    // Check if user exists
    const existing = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        messageAr: 'المستخدم غير موجود',
      });
    }

    // Update permissions if role changed
    let permissions = existing.permissions;
    if (dto.role && dto.role !== existing.role) {
      permissions = [...(ROLE_PERMISSIONS[dto.role as keyof typeof ROLE_PERMISSIONS] || [])];
    }

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...dto,
        permissions,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: updatedBy,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: id,
        oldValue: JSON.stringify({ email: existing.email, role: existing.role }),
        newValue: JSON.stringify({ email: user.email, role: user.role }),
      },
    });

    return user;
  }

  /**
   * Soft delete user
   */
  async remove(id: string, organizationId: string, deletedBy: string) {
    // Check if user exists
    const existing = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
        messageAr: 'المستخدم غير موجود',
      });
    }

    // Soft delete
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Create audit log
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: deletedBy,
        action: 'USER_DELETED',
        entityType: 'user',
        entityId: id,
        oldValue: JSON.stringify({ email: existing.email }),
      },
    });

    return { success: true };
  }
}
