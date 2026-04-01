// ═══════════════════════════════════════════════════════════════
// POS Devices Service - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  RegisterPosDeviceDto,
  UpdatePosDeviceDto,
  PosDeviceResponseDto,
} from './dto/pos-device.dto';
import { POSDeviceStatus } from '@realestate/shared-types';
import { randomBytes } from 'crypto';

@Injectable()
export class PosDevicesService {
  private readonly logger = new Logger(PosDevicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * تسجيل جهاز POS جديد
   * يُنشئ clientSecret و preSharedKey للتوثيق مع ETA
   */
  async registerDevice(
    dto: RegisterPosDeviceDto,
    userId: string,
  ): Promise<PosDeviceResponseDto & { clientSecret: string }> {
    // الحصول على معرف المؤسسة
    const organizationId = await this.prisma.getOrganizationId();
    if (!organizationId) {
      throw new BadRequestException('لم يتم إعداد النظام بعد');
    }

    // التحقق من عدم وجود جهاز بنفس الرقم التسلسلي
    const existingDevice = await this.prisma.posDevice.findUnique({
      where: {
        organizationId_posSerial: {
          organizationId,
          posSerial: dto.posSerial,
        },
      },
    });

    if (existingDevice) {
      throw new ConflictException(
        `جهاز POS برقم تسلسلي ${dto.posSerial} موجود بالفعل`,
      );
    }

    // التحقق من وجود الفرع
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        organizationId,
      },
    });

    if (!branch) {
      throw new NotFoundException('الفرع غير موجود');
    }

    // إنشاء clientSecret و preSharedKey
    const clientSecret = this.generateSecret();
    const preSharedKey = this.generateSecret();

    // إنشاء الجهاز
    const device = await this.prisma.posDevice.create({
      data: {
        organizationId,
        branchId: dto.branchId,
        assignedToUserId: dto.assignedToUserId,
        posSerial: dto.posSerial,
        posOsVersion: dto.posOsVersion,
        posModelFramework: dto.posModelFramework,
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        status: POSDeviceStatus.ACTIVE,
        // ملاحظة: clientSecret و preSharedKey يُخزَّنان مُشفَّرين في الإنتاج
        // حالياً نستخدم حقول إضافية في قاعدة البيانات أو Redis
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId,
      action: 'POS_DEVICE_REGISTERED',
      entityType: 'PosDevice',
      entityId: device.id,
      userId,
      newValue: {
        posSerial: device.posSerial,
        branchId: device.branchId,
        assignedToUserId: device.assignedToUserId,
      },
    });

    this.logger.log(`✅ POS Device registered: ${device.posSerial}`);

    // إرجاع الجهاز مع clientSecret (مرة واحدة فقط)
    return {
      id: device.id,
      branchId: device.branchId,
      assignedToUserId: device.assignedToUserId ?? undefined,
      posSerial: device.posSerial,
      posOsVersion: device.posOsVersion,
      posModelFramework: device.posModelFramework,
      deviceName: device.deviceName ?? undefined,
      deviceModel: device.deviceModel ?? undefined,
      status: device.status,
      lastSeenAt: device.lastSeenAt ?? undefined,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
      clientSecret, // يُرجع مرة واحدة فقط عند التسجيل
    };
  }

  /**
   * الحصول على جميع أجهزة POS
   */
  async getDevices(filters?: {
    branchId?: string;
    status?: POSDeviceStatus;
  }): Promise<PosDeviceResponseDto[]> {
    const organizationId = await this.prisma.getOrganizationId();
    if (!organizationId) {
      return [];
    }

    const devices = await this.prisma.posDevice.findMany({
      where: {
        organizationId,
        ...(filters?.branchId && { branchId: filters.branchId }),
        ...(filters?.status && { status: filters.status }),
      },
      orderBy: { createdAt: 'desc' },
    });

    // إزالة البيانات الحساسة من الاستجابة
    return devices.map((device: any) => ({
      id: device.id,
      branchId: device.branchId,
      assignedToUserId: device.assignedToUserId ?? undefined,
      posSerial: device.posSerial,
      posOsVersion: device.posOsVersion,
      posModelFramework: device.posModelFramework,
      deviceName: device.deviceName ?? undefined,
      deviceModel: device.deviceModel ?? undefined,
      status: device.status,
      lastSeenAt: device.lastSeenAt ?? undefined,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    }));
  }

  /**
   * الحصول على جهاز POS بالمعرف
   */
  async getDeviceById(id: string): Promise<PosDeviceResponseDto> {
    const device = await this.prisma.posDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('جهاز POS غير موجود');
    }

    return {
      id: device.id,
      branchId: device.branchId,
      assignedToUserId: device.assignedToUserId ?? undefined,
      posSerial: device.posSerial,
      posOsVersion: device.posOsVersion,
      posModelFramework: device.posModelFramework,
      deviceName: device.deviceName ?? undefined,
      deviceModel: device.deviceModel ?? undefined,
      status: device.status,
      lastSeenAt: device.lastSeenAt ?? undefined,
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }

  /**
   * تحديث جهاز POS
   */
  async updateDevice(
    id: string,
    dto: UpdatePosDeviceDto,
    userId: string,
  ): Promise<PosDeviceResponseDto> {
    const device = await this.prisma.posDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('جهاز POS غير موجود');
    }

    const updatedDevice = await this.prisma.posDevice.update({
      where: { id },
      data: {
        deviceName: dto.deviceName,
        deviceModel: dto.deviceModel,
        assignedToUserId: dto.assignedToUserId,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId: device.organizationId,
      action: 'POS_DEVICE_UPDATED',
      entityType: 'PosDevice',
      entityId: id,
      userId,
      newValue: dto,
    });

    return this.getDeviceById(id);
  }

  /**
   * تعطيل جهاز POS (تقاعد)
   */
  async deactivateDevice(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<PosDeviceResponseDto> {
    const device = await this.prisma.posDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('جهاز POS غير موجود');
    }

    if (device.status === POSDeviceStatus.RETIRED) {
      throw new BadRequestException('الجهاز متقاعد بالفعل');
    }

    const updatedDevice = await this.prisma.posDevice.update({
      where: { id },
      data: {
        status: POSDeviceStatus.RETIRED,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId: device.organizationId,
      action: 'POS_DEVICE_DEACTIVATED',
      entityType: 'PosDevice',
      entityId: id,
      userId,
      newValue: {
        posSerial: device.posSerial,
        previousStatus: device.status,
        reason,
      },
    });

    this.logger.log(`🔒 POS Device deactivated: ${device.posSerial}`);

    return this.getDeviceById(id);
  }

  /**
   * تعليق جهاز POS مؤقتاً
   */
  async suspendDevice(
    id: string,
    userId: string,
    reason?: string,
  ): Promise<PosDeviceResponseDto> {
    const device = await this.prisma.posDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('جهاز POS غير موجود');
    }

    if (device.status !== POSDeviceStatus.ACTIVE) {
      throw new BadRequestException('يمكن تعليق الأجهزة النشطة فقط');
    }

    await this.prisma.posDevice.update({
      where: { id },
      data: {
        status: POSDeviceStatus.SUSPENDED,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId: device.organizationId,
      action: 'POS_DEVICE_SUSPENDED',
      entityType: 'PosDevice',
      entityId: id,
      userId,
      newValue: {
        posSerial: device.posSerial,
        reason,
      },
    });

    return this.getDeviceById(id);
  }

  /**
   * إعادة تنشيط جهاز POS معلق
   */
  async reactivateDevice(
    id: string,
    userId: string,
  ): Promise<PosDeviceResponseDto> {
    const device = await this.prisma.posDevice.findUnique({
      where: { id },
    });

    if (!device) {
      throw new NotFoundException('جهاز POS غير موجود');
    }

    if (device.status !== POSDeviceStatus.SUSPENDED) {
      throw new BadRequestException('يمكن إعادة تنشيط الأجهزة المعلقة فقط');
    }

    await this.prisma.posDevice.update({
      where: { id },
      data: {
        status: POSDeviceStatus.ACTIVE,
      },
    });

    // تسجيل في سجل التدقيق
    await this.auditService.log({
      organizationId: device.organizationId,
      action: 'POS_DEVICE_REACTIVATED',
      entityType: 'PosDevice',
      entityId: id,
      userId,
      newValue: {
        posSerial: device.posSerial,
      },
    });

    return this.getDeviceById(id);
  }

  /**
   * تحديث آخر نشاط للجهاز (heartbeat)
   */
  async updateLastSeen(deviceId: string): Promise<void> {
    await this.prisma.posDevice.update({
      where: { id: deviceId },
      data: { lastSeenAt: new Date() },
    });
  }

  /**
   * توليد سر عشوائي
   */
  private generateSecret(): string {
    return randomBytes(32).toString('hex');
  }
}
