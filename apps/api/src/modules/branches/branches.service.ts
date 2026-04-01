// ═══════════════════════════════════════════════════════════════
// Branches Service - إدارة الفروع
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';

@Injectable()
export class BranchesService {
  constructor(private prisma: PrismaService) {}

  /**
   * الحصول على جميع الفروع مع الصفحات والفلترة
   */
  async findAll(
    organizationId: string,
    options: {
      search?: string;
      isActive?: boolean;
      isHeadquarters?: boolean;
      city?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { search, isActive, isHeadquarters, city, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId };

    if (isActive !== undefined) where.isActive = isActive;
    if (isHeadquarters !== undefined) where.isHeadquarters = isHeadquarters;
    if (city) where.city = { contains: city, mode: 'insensitive' };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameAr: { contains: search } },
        { etaBranchCode: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [branches, total] = await Promise.all([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          organizationId: true,
          name: true,
          nameAr: true,
          etaBranchCode: true,
          address: true,
          city: true,
          phone: true,
          managerId: true,
          isHeadquarters: true,
          isActive: true,
          settings: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.branch.count({ where }),
    ]);

    // Get counts separately
    const branchIds = branches.map(b => b.id);
    const [usersCounts, propertiesCounts, dealsCounts] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds } },
        _count: true,
      }),
      this.prisma.property.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds } },
        _count: true,
      }),
      this.prisma.deal.groupBy({
        by: ['branchId'],
        where: { branchId: { in: branchIds } },
        _count: true,
      }),
    ]);

    const usersCountMap = new Map(usersCounts.map(u => [u.branchId, u._count]));
    const propertiesCountMap = new Map(propertiesCounts.map(p => [p.branchId, p._count]));
    const dealsCountMap = new Map(dealsCounts.map(d => [d.branchId, d._count]));

    return {
      data: branches.map((branch) => ({
        ...branch,
        usersCount: usersCountMap.get(branch.id) || 0,
        propertiesCount: propertiesCountMap.get(branch.id) || 0,
        dealsCount: dealsCountMap.get(branch.id) || 0,
      })),
      meta: {
        total,
        page,
        limit,
        hasMore: skip + branches.length < total,
      },
    };
  }

  /**
   * الحصول على فرع بالمعرف
   */
  async findOne(id: string, organizationId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: { id, organizationId },
      select: {
        id: true,
        organizationId: true,
        name: true,
        nameAr: true,
        etaBranchCode: true,
        address: true,
        city: true,
        phone: true,
        managerId: true,
        isHeadquarters: true,
        isActive: true,
        settings: true,
        createdAt: true,
        updatedAt: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            email: true,
            phone: true,
          },
        },
        users: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            firstNameAr: true,
            lastNameAr: true,
            role: true,
            isActive: true,
          },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        teams: {
          select: {
            id: true,
            name: true,
          },
          take: 10,
        },
        posDevices: {
          select: {
            id: true,
            posSerial: true,
            deviceName: true,
            status: true,
          },
          take: 10,
        },
        _count: {
          select: {
            users: true,
            properties: true,
            deals: true,
            teams: true,
            posDevices: true,
          },
        },
      },
    });

    if (!branch) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
          messageAr: 'الفرع غير موجود',
        },
      });
    }

    return {
      ...branch,
      usersCount: branch._count.users,
      propertiesCount: branch._count.properties,
      dealsCount: branch._count.deals,
      teamsCount: branch._count.teams,
      posDevicesCount: branch._count.posDevices,
      _count: undefined,
    };
  }

  /**
   * إنشاء فرع جديد
   */
  async create(
    dto: CreateBranchDto,
    organizationId: string,
    createdBy: string,
  ) {
    // التحقق من عدم وجود فرع بنفس الاسم
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        organizationId,
        name: dto.name,
      },
    });

    if (existingBranch) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'BRANCH_NAME_EXISTS',
          message: 'Branch name already exists',
          messageAr: 'اسم الفرع مسجل مسبقاً',
        },
      });
    }

    // التحقق من عدم تكرار كود ETA إذا وُجد
    if (dto.etaBranchCode) {
      const existingEtaCode = await this.prisma.branch.findFirst({
        where: {
          organizationId,
          etaBranchCode: dto.etaBranchCode,
        },
      });

      if (existingEtaCode) {
        throw new ConflictException({
          success: false,
          error: {
            code: 'ETA_CODE_EXISTS',
            message: 'ETA branch code already exists',
            messageAr: 'كود الفرع في ETA مسجل مسبقاً',
          },
        });
      }
    }

    // التحقق من وجود المدير إذا تم تحديده
    if (dto.managerId) {
      const manager = await this.prisma.user.findFirst({
        where: {
          id: dto.managerId,
          organizationId,
          isActive: true,
        },
      });

      if (!manager) {
        throw new NotFoundException({
          success: false,
          error: {
            code: 'MANAGER_NOT_FOUND',
            message: 'Manager not found or inactive',
            messageAr: 'المدير غير موجود أو غير نشط',
          },
        });
      }
    }

    // إذا كان الفرع هو المقر الرئيسي، نلغي المقر الرئيسي السابق
    if (dto.isHeadquarters) {
      await this.prisma.branch.updateMany({
        where: {
          organizationId,
          isHeadquarters: true,
        },
        data: {
          isHeadquarters: false,
        },
      });
    }

    const branch = await this.prisma.branch.create({
      data: {
        organizationId,
        name: dto.name,
        nameAr: dto.nameAr,
        etaBranchCode: dto.etaBranchCode,
        address: dto.address,
        city: dto.city,
        phone: dto.phone,
        managerId: dto.managerId,
        isHeadquarters: dto.isHeadquarters || false,
        isActive: true,
        settings: dto.settings || {},
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        etaBranchCode: true,
        address: true,
        city: true,
        phone: true,
        managerId: true,
        isHeadquarters: true,
        isActive: true,
        settings: true,
        createdAt: true,
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: createdBy,
        action: 'BRANCH_CREATED',
        entityType: 'branch',
        entityId: branch.id,
        newValue: JSON.stringify({
          name: branch.name,
          etaBranchCode: branch.etaBranchCode,
          isHeadquarters: branch.isHeadquarters,
        }),
      },
    });

    return branch;
  }

  /**
   * تحديث فرع
   */
  async update(
    id: string,
    dto: UpdateBranchDto,
    organizationId: string,
    updatedBy: string,
  ) {
    const existing = await this.prisma.branch.findFirst({
      where: { id, organizationId },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
          messageAr: 'الفرع غير موجود',
        },
      });
    }

    // التحقق من عدم وجود فرع آخر بنفس الاسم
    if (dto.name && dto.name !== existing.name) {
      const duplicateName = await this.prisma.branch.findFirst({
        where: {
          organizationId,
          name: dto.name,
          id: { not: id },
        },
      });

      if (duplicateName) {
        throw new ConflictException({
          success: false,
          error: {
            code: 'BRANCH_NAME_EXISTS',
            message: 'Branch name already exists',
            messageAr: 'اسم الفرع مسجل مسبقاً',
          },
        });
      }
    }

    // التحقق من عدم تكرار كود ETA
    if (dto.etaBranchCode && dto.etaBranchCode !== existing.etaBranchCode) {
      const duplicateEtaCode = await this.prisma.branch.findFirst({
        where: {
          organizationId,
          etaBranchCode: dto.etaBranchCode,
          id: { not: id },
        },
      });

      if (duplicateEtaCode) {
        throw new ConflictException({
          success: false,
          error: {
            code: 'ETA_CODE_EXISTS',
            message: 'ETA branch code already exists',
            messageAr: 'كود الفرع في ETA مسجل مسبقاً',
          },
        });
      }
    }

    // التحقق من وجود المدير إذا تم تحديده
    if (dto.managerId !== undefined && dto.managerId !== null) {
      if (dto.managerId) {
        const manager = await this.prisma.user.findFirst({
          where: {
            id: dto.managerId,
            organizationId,
            isActive: true,
          },
        });

        if (!manager) {
          throw new NotFoundException({
            success: false,
            error: {
              code: 'MANAGER_NOT_FOUND',
              message: 'Manager not found or inactive',
              messageAr: 'المدير غير موجود أو غير نشط',
            },
          });
        }
      }
    }

    // إذا تم تعيين الفرع كمقر رئيسي، نلغي المقر الرئيسي السابق
    if (dto.isHeadquarters && !existing.isHeadquarters) {
      await this.prisma.branch.updateMany({
        where: {
          organizationId,
          isHeadquarters: true,
          id: { not: id },
        },
        data: {
          isHeadquarters: false,
        },
      });
    }

    const branch = await this.prisma.branch.update({
      where: { id },
      data: {
        ...dto,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        etaBranchCode: true,
        address: true,
        city: true,
        phone: true,
        managerId: true,
        isHeadquarters: true,
        isActive: true,
        settings: true,
        updatedAt: true,
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: updatedBy,
        action: 'BRANCH_UPDATED',
        entityType: 'branch',
        entityId: id,
        oldValue: JSON.stringify({
          name: existing.name,
          etaBranchCode: existing.etaBranchCode,
        }),
        newValue: JSON.stringify({
          name: branch.name,
          etaBranchCode: branch.etaBranchCode,
        }),
      },
    });

    return branch;
  }

  /**
   * حذف فرع (soft delete)
   */
  async remove(id: string, organizationId: string, deletedBy: string) {
    const existing = await this.prisma.branch.findFirst({
      where: { id, organizationId },
      include: {
        _count: {
          select: {
            users: true,
            properties: true,
            deals: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
          messageAr: 'الفرع غير موجود',
        },
      });
    }

    // التحقق من عدم وجود مستخدمين نشطين في الفرع
    const activeUsers = await this.prisma.user.count({
      where: {
        branchId: id,
        isActive: true,
      },
    });

    if (activeUsers > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'BRANCH_HAS_ACTIVE_USERS',
          message: 'Cannot delete branch with active users',
          messageAr: 'لا يمكن حذف فرع به مستخدمين نشطين',
          details: { activeUsers },
        },
      });
    }

    // التحقق من عدم وجود عقارات نشطة
    const activeProperties = await this.prisma.property.count({
      where: {
        branchId: id,
        deletedAt: null,
        status: { notIn: ['SOLD', 'RENTED'] },
      },
    });

    if (activeProperties > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'BRANCH_HAS_ACTIVE_PROPERTIES',
          message: 'Cannot delete branch with active properties',
          messageAr: 'لا يمكن حذف فرع به عقارات نشطة',
          details: { activeProperties },
        },
      });
    }

    // لا يمكن حذف المقر الرئيسي
    if (existing.isHeadquarters) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CANNOT_DELETE_HEADQUARTERS',
          message: 'Cannot delete headquarters branch',
          messageAr: 'لا يمكن حذف المقر الرئيسي',
        },
      });
    }

    // Soft delete - تعيين isActive = false
    await this.prisma.branch.update({
      where: { id },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: deletedBy,
        action: 'BRANCH_DELETED',
        entityType: 'branch',
        entityId: id,
        oldValue: JSON.stringify({
          name: existing.name,
          etaBranchCode: existing.etaBranchCode,
        }),
      },
    });

    return { success: true };
  }

  /**
   * الحصول على إحصائيات الفروع
   */
  async getStats(organizationId: string) {
    const [totalBranches, activeBranches, headquarters] = await Promise.all([
      this.prisma.branch.count({
        where: { organizationId },
      }),
      this.prisma.branch.count({
        where: { organizationId, isActive: true },
      }),
      this.prisma.branch.findFirst({
        where: { organizationId, isHeadquarters: true },
        select: { id: true, name: true, nameAr: true },
      }),
    ]);

    // إحصائيات حسب المدينة
    const branchesByCity = await this.prisma.branch.groupBy({
      by: ['city'],
      where: {
        organizationId,
        isActive: true,
        city: { not: null },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 5,
    });

    return {
      total: totalBranches,
      active: activeBranches,
      inactive: totalBranches - activeBranches,
      headquarters,
      byCity: branchesByCity.map((item: { city: string | null; _count: { id: number } }) => ({
        city: item.city,
        count: item._count.id,
      })),
    };
  }
}
