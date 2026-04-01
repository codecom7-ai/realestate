// ═══════════════════════════════════════════════════════════════
// Organization Service - خدمة المنظمة/المكتب
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  UpdateOrganizationDto,
  UpdateOrganizationSettingsDto,
  UploadLogoDto,
  OrganizationSettings,
} from './dto/organization.dto';

@Injectable()
export class OrganizationService {
  private readonly logger = new Logger(OrganizationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // Get Organization (Single Tenant - One Office Only)
  // ═══════════════════════════════════════════════════════════════

  async getOrganization(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        legalName: true,
        commercialRegNo: true,
        taxId: true,
        brokerLicenseNo: true,
        classification: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        logoUrl: true,
        primaryCurrency: true,
        timezone: true,
        locale: true,
        isSetupDone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    return organization;
  }

  // ═══════════════════════════════════════════════════════════════
  // Update Organization
  // ═══════════════════════════════════════════════════════════════

  async updateOrganization(
    organizationId: string,
    dto: UpdateOrganizationDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get current organization data for audit
    const currentOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!currentOrg) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    // Check for slug uniqueness if provided
    if (dto.slug && dto.slug !== currentOrg.slug) {
      const existingSlug = await this.prisma.organization.findFirst({
        where: { slug: dto.slug, NOT: { id: organizationId } },
      });
      if (existingSlug) {
        throw new BadRequestException({
          code: 'SLUG_ALREADY_EXISTS',
          message: 'This slug is already taken',
          messageAr: 'هذا الرابط مستخدم بالفعل',
        });
      }
    }

    // Update organization
    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.nameAr !== undefined && { nameAr: dto.nameAr }),
        ...(dto.slug !== undefined && { slug: dto.slug }),
        ...(dto.legalName !== undefined && { legalName: dto.legalName }),
        ...(dto.commercialRegNo !== undefined && { commercialRegNo: dto.commercialRegNo }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        ...(dto.brokerLicenseNo !== undefined && { brokerLicenseNo: dto.brokerLicenseNo }),
        ...(dto.classification !== undefined && { classification: dto.classification }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.primaryCurrency !== undefined && { primaryCurrency: dto.primaryCurrency }),
        ...(dto.timezone !== undefined && { timezone: dto.timezone }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
        ...(dto.isSetupDone !== undefined && { isSetupDone: dto.isSetupDone }),
      },
      select: {
        id: true,
        name: true,
        nameAr: true,
        slug: true,
        legalName: true,
        commercialRegNo: true,
        taxId: true,
        brokerLicenseNo: true,
        classification: true,
        phone: true,
        email: true,
        address: true,
        city: true,
        logoUrl: true,
        primaryCurrency: true,
        timezone: true,
        locale: true,
        isSetupDone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'ORGANIZATION_UPDATED',
      entityType: 'organization',
      entityId: organizationId,
      oldValue: currentOrg,
      newValue: updatedOrg,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Organization updated: ${organizationId} by user ${userId}`);

    return updatedOrg;
  }

  // ═══════════════════════════════════════════════════════════════
  // Upload Logo
  // ═══════════════════════════════════════════════════════════════

  async uploadLogo(
    organizationId: string,
    dto: UploadLogoDto,
    userId: string,
    logoUrl: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Get current organization data
    const currentOrg = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { logoUrl: true },
    });

    if (!currentOrg) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    // Update logo URL
    const updatedOrg = await this.prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl },
      select: {
        id: true,
        name: true,
        logoUrl: true,
      },
    });

    // Create audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'ORGANIZATION_LOGO_UPDATED',
      entityType: 'organization',
      entityId: organizationId,
      oldValue: { logoUrl: currentOrg.logoUrl },
      newValue: { logoUrl },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Organization logo updated: ${organizationId} by user ${userId}`);

    return {
      id: updatedOrg.id,
      name: updatedOrg.name,
      logoUrl: updatedOrg.logoUrl,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Get Settings
  // ═══════════════════════════════════════════════════════════════

  async getSettings(organizationId: string): Promise<OrganizationSettings> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    // Parse and return settings (stored as JSON string)
    const settings = typeof organization.settings === 'string'
      ? JSON.parse(organization.settings)
      : organization.settings;

    return settings as OrganizationSettings;
  }

  // ═══════════════════════════════════════════════════════════════
  // Update Settings
  // ═══════════════════════════════════════════════════════════════

  async updateSettings(
    organizationId: string,
    dto: UpdateOrganizationSettingsDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<OrganizationSettings> {
    // Get current settings
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    // Parse current settings
    const currentSettings: OrganizationSettings = typeof organization.settings === 'string'
      ? JSON.parse(organization.settings)
      : organization.settings;

    // Merge with new settings
    const updatedSettings: OrganizationSettings = {
      ...currentSettings,
      ...(dto.workingHours !== undefined && { workingHours: dto.workingHours }),
      ...(dto.workingDays !== undefined && { workingDays: dto.workingDays }),
      ...(dto.defaultCommissionRate !== undefined && { defaultCommissionRate: dto.defaultCommissionRate }),
      ...(dto.vatRate !== undefined && { vatRate: dto.vatRate }),
      ...(dto.receiptPrefix !== undefined && { receiptPrefix: dto.receiptPrefix }),
      ...(dto.contractPrefix !== undefined && { contractPrefix: dto.contractPrefix }),
      ...(dto.leadAutoAssign !== undefined && { leadAutoAssign: dto.leadAutoAssign }),
      ...(dto.notificationSettings !== undefined && {
        notificationSettings: {
          ...currentSettings.notificationSettings,
          ...dto.notificationSettings,
        },
      }),
      ...(dto.etaSettings !== undefined && {
        etaSettings: {
          ...currentSettings.etaSettings,
          ...dto.etaSettings,
        },
      }),
      ...(dto.customFields !== undefined && {
        customFields: {
          ...currentSettings.customFields,
          ...dto.customFields,
        },
      }),
    };

    // Update in database
    await this.prisma.organization.update({
      where: { id: organizationId },
      data: {
        preferences: JSON.parse(JSON.stringify(updatedSettings)),
      },
    });

    // Create audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'ORGANIZATION_SETTINGS_UPDATED',
      entityType: 'organization',
      entityId: organizationId,
      oldValue: currentSettings,
      newValue: updatedSettings,
      ipAddress,
      userAgent,
    });

    this.logger.log(`Organization settings updated: ${organizationId} by user ${userId}`);

    return updatedSettings;
  }

  // ═══════════════════════════════════════════════════════════════
  // Get Public Organization Info (for setup/checks)
  // ═══════════════════════════════════════════════════════════════

  async getPublicInfo(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        name: true,
        nameAr: true,
        logoUrl: true,
        primaryCurrency: true,
        locale: true,
        isSetupDone: true,
      },
    });

    if (!organization) {
      throw new NotFoundException({
        code: 'ORGANIZATION_NOT_FOUND',
        message: 'Organization not found',
        messageAr: 'المكتب غير موجود',
      });
    }

    return organization;
  }
}
