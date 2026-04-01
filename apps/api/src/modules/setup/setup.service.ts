// ═══════════════════════════════════════════════════════════════
// Setup Service - One-time system initialization
// ═══════════════════════════════════════════════════════════════

import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { SetupDto } from './dto/setup.dto';

@Injectable()
export class SetupService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Check if setup is already complete
   */
  async isSetupDone(): Promise<boolean> {
    const count = await this.prisma.organization.count();
    return count > 0;
  }

  /**
   * Get setup status
   */
  async getStatus(): Promise<{ isSetupDone: boolean; redirectTo: string }> {
    const done = await this.isSetupDone();
    return {
      isSetupDone: done,
      redirectTo: done ? '/login' : '/setup',
    };
  }

  /**
   * Initialize the system (one-time only)
   */
  async initialize(dto: SetupDto) {
    // Check if already setup
    const alreadySetup = await this.isSetupDone();
    if (alreadySetup) {
      throw new ConflictException({
        code: 'ALREADY_SETUP',
        message: 'System is already initialized',
        messageAr: 'تم إعداد النظام مسبقاً',
      });
    }

    // Validate required fields
    if (!dto.officeName || !dto.ownerEmail || !dto.ownerPassword || !dto.ownerName) {
      throw new BadRequestException({
        code: 'MISSING_REQUIRED_FIELDS',
        message: 'Missing required fields',
        messageAr: 'حقول مطلوبة ناقصة',
      });
    }

    // Hash the password
    const passwordHash = await bcrypt.hash(dto.ownerPassword, 12);

    // Use transaction to create organization and owner
    const result = await this.prisma.$transaction(async (tx: any) => {
      // Create organization
      const organization = await tx.organization.create({
        data: {
          name: dto.officeName,
          nameAr: dto.officeNameAr || dto.officeName,
          slug: this.generateSlug(dto.officeName),
          legalName: dto.legalName,
          commercialRegNo: dto.commercialRegNo,
          taxId: dto.taxId,
          brokerLicenseNo: dto.brokerLicenseNo,
          classification: dto.classification,
          phone: dto.phone,
          email: dto.email,
          address: dto.address,
          city: dto.city,
          isSetupDone: true,
          settings: JSON.stringify({
            currency: 'EGP',
            locale: 'ar',
            timezone: 'Africa/Cairo',
            workingHours: { start: '09:00', end: '18:00' },
            workingDays: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
            defaultCommissionRate: 2.5,
            vatRate: 14,
          }),
        },
      });

      // Create headquarters branch
      const branch = await tx.branch.create({
        data: {
          organizationId: organization.id,
          name: 'الفرع الرئيسي',
          nameAr: 'الفرع الرئيسي',
          isHeadquarters: true,
          isActive: true,
        },
      });

      // Create owner user
      const ownerNameParts = dto.ownerName.split(' ');
      const firstName = ownerNameParts[0] || dto.ownerName;
      const lastName = ownerNameParts.slice(1).join(' ') || '';

      const user = await tx.user.create({
        data: {
          organizationId: organization.id,
          branchId: branch.id,
          email: dto.ownerEmail,
          phone: dto.ownerPhone,
          passwordHash,
          firstName,
          lastName,
          firstNameAr: firstName,
          lastNameAr: lastName,
          role: 'OWNER',
          permissions: JSON.stringify([]), // Owner has all permissions
          isActive: true,
          isEmailVerified: false,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          action: 'SYSTEM_INITIALIZED',
          entityType: 'organization',
          entityId: organization.id,
          newValue: JSON.stringify({
            organizationName: organization.name,
            ownerEmail: user.email,
          }),
        },
      });

      return { organization, branch, user };
    });

    // Update .env file with ORG_ID
    // Note: In production, this would be handled by the deployment system
    process.env.SETUP_DONE = 'true';
    process.env.ORG_ID = result.organization.id;

    return {
      organizationId: result.organization.id,
      userId: result.user.id,
      message: 'Setup complete — تم الإعداد بنجاح',
    };
  }

  /**
   * Generate a URL-safe slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '') + '-' + Date.now().toString(36);
  }
}
