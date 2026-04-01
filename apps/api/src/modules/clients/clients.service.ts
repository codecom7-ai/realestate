// ═══════════════════════════════════════════════════════════════
// Clients Service - إدارة العملاء
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || '';
    // Ensure key is 32 bytes for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(key)
      .digest();
  }

  /**
   * تشفير البيانات الحساسة (الرقم القومي)
   */
  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encrypted
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  /**
   * فك تشفير البيانات الحساسة
   */
  private decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      iv,
    );
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  /**
   * البحث عن جميع العملاء مع الصفحات
   */
  async findAll(
    organizationId: string,
    options: {
      search?: string;
      isVip?: boolean;
      source?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { search, isVip, source, page = 1, limit = 20 } = options;
    const skip = (page - 1) * limit;

    const where: any = { organizationId, deletedAt: null };
    
    if (isVip !== undefined) where.isVip = isVip;
    if (source) where.source = source;
    
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { firstNameAr: { contains: search } },
        { lastNameAr: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { companyName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [clients, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          firstNameAr: true,
          lastNameAr: true,
          phone: true,
          phone2: true,
          email: true,
          nationality: true,
          clientType: true,
          companyName: true,
          source: true,
          tags: true,
          isVip: true,
          createdAt: true,
          updatedAt: true,
          // nationalId لا يُرجع في القائمة للأمان
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);

    return {
      data: clients,
      meta: {
        total,
        page,
        limit,
        hasMore: skip + clients.length < total,
      },
    };
  }

  /**
   * البحث عن عميل بالمعرف
   */
  async findOne(id: string, organizationId: string, includeDecrypted = false) {
    const client = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        firstNameAr: true,
        lastNameAr: true,
        phone: true,
        phone2: true,
        email: true,
        nationalId: true,
        nationality: true,
        clientType: true,
        companyName: true,
        taxId: true,
        source: true,
        tags: true,
        notes: true,
        isVip: true,
        createdAt: true,
        updatedAt: true,
        leads: {
          select: {
            id: true,
            stage: true,
            aiScore: true,
            createdAt: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        deals: {
          select: {
            id: true,
            stage: true,
            dealType: true,
            agreedPrice: true,
            createdAt: true,
          },
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!client) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found',
          messageAr: 'العميل غير موجود',
        },
      });
    }

    // فك تشفير الرقم القومي إذا طُلب
    if (includeDecrypted && client.nationalId) {
      try {
        (client as any).nationalIdDecrypted = this.decrypt(client.nationalId);
      } catch {
        // إذا فشل فك التشفير، لا نرجع البيانات
      }
    }

    // لا نرجع الـ nationalId المُشفَّر في الاستجابة
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { nationalId: _, ...clientWithoutNationalId } = client;

    return clientWithoutNationalId;
  }

  /**
   * إنشاء عميل جديد
   */
  async create(
    dto: CreateClientDto,
    organizationId: string,
    createdBy: string,
  ) {
    // التحقق من عدم وجود هاتف مكرر (تحذير فقط)
    const existingClient = await this.prisma.client.findFirst({
      where: {
        organizationId,
        phone: dto.phone,
        deletedAt: null,
      },
    });

    if (existingClient) {
      throw new ConflictException({
        success: false,
        error: {
          code: 'PHONE_EXISTS',
          message: 'Phone number already exists',
          messageAr: 'رقم الهاتف مسجل مسبقاً',
          details: {
            existingClientId: existingClient.id,
            existingClientName: `${existingClient.firstName} ${existingClient.lastName}`,
          },
        },
      });
    }

    // تشفير الرقم القومي إذا وُجد
    const nationalIdEncrypted = dto.nationalId
      ? this.encrypt(dto.nationalId)
      : null;

    const client = await this.prisma.client.create({
      data: {
        organizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        firstNameAr: dto.firstNameAr,
        lastNameAr: dto.lastNameAr,
        phone: dto.phone,
        phone2: dto.phone2,
        email: dto.email,
        nationalId: nationalIdEncrypted,
        nationality: dto.nationality || 'EG',
        clientType: dto.clientType || 'individual',
        companyName: dto.companyName,
        taxId: dto.taxId,
        source: dto.source,
        tags: dto.tags || [],
        notes: dto.notes,
        isVip: dto.isVip || false,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isVip: true,
        createdAt: true,
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: createdBy,
        action: 'CLIENT_CREATED',
        entityType: 'client',
        entityId: client.id,
        newValue: JSON.stringify({ phone: client.phone, name: `${client.firstName} ${client.lastName}` }),
      },
    });

    return client;
  }

  /**
   * تحديث عميل
   */
  async update(
    id: string,
    dto: UpdateClientDto,
    organizationId: string,
    updatedBy: string,
  ) {
    const existing = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found',
          messageAr: 'العميل غير موجود',
        },
      });
    }

    // تشفير الرقم القومي إذا تم تحديثه
    const updateData: any = { ...dto };
    if (dto.nationalId) {
      updateData.nationalId = this.encrypt(dto.nationalId);
    }

    const client = await this.prisma.client.update({
      where: { id },
      data: {
        ...updateData,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isVip: true,
        updatedAt: true,
      },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: updatedBy,
        action: 'CLIENT_UPDATED',
        entityType: 'client',
        entityId: id,
        oldValue: JSON.stringify({ phone: existing.phone }),
        newValue: JSON.stringify({ phone: client.phone }),
      },
    });

    return client;
  }

  /**
   * حذف عميل (soft delete)
   */
  async remove(id: string, organizationId: string, deletedBy: string) {
    const existing = await this.prisma.client.findFirst({
      where: { id, organizationId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'Client not found',
          messageAr: 'العميل غير موجود',
        },
      });
    }

    // التحقق من عدم وجود صفقات نشطة
    const activeDeals = await this.prisma.deal.count({
      where: {
        clientId: id,
        stage: { notIn: ['CLOSED', 'CANCELLED'] },
      },
    });

    if (activeDeals > 0) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'CLIENT_HAS_ACTIVE_DEALS',
          message: 'Cannot delete client with active deals',
          messageAr: 'لا يمكن حذف عميل لديه صفقات نشطة',
          details: { activeDeals },
        },
      });
    }

    // Soft delete
    await this.prisma.client.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: deletedBy,
        action: 'CLIENT_DELETED',
        entityType: 'client',
        entityId: id,
        oldValue: JSON.stringify({ phone: existing.phone }),
      },
    });

    return { success: true };
  }

  /**
   * دمج عميل مكرر
   */
  async merge(
    sourceId: string,
    targetId: string,
    organizationId: string,
    mergedBy: string,
  ) {
    if (sourceId === targetId) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'SAME_CLIENT',
          message: 'Cannot merge a client with itself',
          messageAr: 'لا يمكن دمج العميل مع نفسه',
        },
      });
    }

    const [source, target] = await Promise.all([
      this.prisma.client.findFirst({
        where: { id: sourceId, organizationId, deletedAt: null },
      }),
      this.prisma.client.findFirst({
        where: { id: targetId, organizationId, deletedAt: null },
      }),
    ]);

    if (!source || !target) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'CLIENT_NOT_FOUND',
          message: 'One or both clients not found',
          messageAr: 'عميل واحد أو كلاهما غير موجود',
        },
      });
    }

    // نقل جميع البيانات من source إلى target
    await this.prisma.$transaction([
      // نقل الـ leads
      this.prisma.lead.updateMany({
        where: { clientId: sourceId },
        data: { clientId: targetId },
      }),
      // نقل الـ deals
      this.prisma.deal.updateMany({
        where: { clientId: sourceId },
        data: { clientId: targetId },
      }),
      // نقل الـ documents
      this.prisma.document.updateMany({
        where: { entityId: sourceId, entityType: 'client' },
        data: { entityId: targetId },
      }),
      // حذف source (soft delete)
      this.prisma.client.update({
        where: { id: sourceId },
        data: {
          deletedAt: new Date(),
          notes: `تم الدمج مع العميل ${target.id}`,
        },
      }),
    ]);

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId: mergedBy,
        action: 'CLIENT_MERGED',
        entityType: 'client',
        entityId: targetId,
        oldValue: JSON.stringify({ sourceId, sourcePhone: source.phone }),
        newValue: JSON.stringify({ targetId, targetPhone: target.phone }),
      },
    });

    return {
      success: true,
      mergedInto: targetId,
    };
  }

  /**
   * البحث عن عملاء مكررين محتملين
   */
  async findDuplicates(phone: string, organizationId: string) {
    const duplicates = await this.prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ phone }, { phone2: phone }],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        phone2: true,
        createdAt: true,
      },
    });

    return {
      hasDuplicates: duplicates.length > 0,
      duplicates,
    };
  }
}
