// ═══════════════════════════════════════════════════════════════
// Auth Service - المصادقة وإدارة الرموز
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ROLE_PERMISSIONS } from '@realestate/shared-types';

export interface JwtPayload {
  sub:         string;
  email:       string;
  role:        string;
  branchId?:   string | null;
  permissions: string[];
  // iat and exp are added automatically by JwtModule — do NOT add them to payload
  iat?:        number;
  exp?:        number;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * تسجيل دخول المستخدم
   */
  async login(dto: LoginDto, ipAddress: string, userAgent: string) {
    // البحث عن المستخدم بالبريد الإلكتروني
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { organization: true, branch: true },
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    // التحقق من أن الحساب نشط
    if (!user.isActive) {
      throw new ForbiddenException({
        code: 'ACCOUNT_INACTIVE',
        message: 'Account is inactive',
        messageAr: 'الحساب غير نشط',
      });
    }

    // التحقق من كلمة المرور
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
        messageAr: 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
      });
    }

    // التحقق من MFA
    if (user.isMfaEnabled) {
      if (!dto.totp) {
        throw new UnauthorizedException({
          code: 'MFA_REQUIRED',
          message: 'MFA code is required',
          messageAr: 'مطلوب رمز التحقق الثنائي',
        });
      }

      // التحقق من TOTP
      const isValidTotp = authenticator.verify({
        secret: user.mfaSecret!,
        token: dto.totp,
      });

      if (!isValidTotp) {
        throw new UnauthorizedException({
          code: 'INVALID_TOTP',
          message: 'Invalid MFA code',
          messageAr: 'رمز التحقق غير صحيح',
        });
      }
    }

    // الحصول على الصلاحيات حسب الدور
    const permissions = this.getPermissionsForRole(user.role);

    // توليد الرموز
    const accessToken = this.generateAccessToken(user, permissions);
    const refreshToken = await this.generateRefreshToken(user.id, ipAddress, userAgent);

    // تحديث آخر تسجيل دخول
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId: user.organizationId,
        userId: user.id,
        action: 'USER_LOGIN',
        entityType: 'user',
        entityId: user.id,
        ipAddress,
        userAgent,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        firstNameAr: user.firstNameAr,
        lastNameAr: user.lastNameAr,
        role: user.role,
        permissions,
        branchId: user.branchId,
        organization: {
          id: user.organization.id,
          name: user.organization.name,
          nameAr: user.organization.nameAr,
        },
      },
    };
  }

  /**
   * تحديث رمز الوصول
   */
  async refresh(token: string, ipAddress: string, userAgent: string) {
    // البحث عن رمز التحديث
    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: true },
    });

    if (!storedToken || storedToken.isRevoked) {
      throw new UnauthorizedException({
        code: 'TOKEN_REVOKED',
        message: 'Refresh token is invalid or revoked',
        messageAr: 'رمز التحديث غير صالح أو ملغى',
      });
    }

    // التحقق من انتهاء الصلاحية
    if (storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException({
        code: 'TOKEN_EXPIRED',
        message: 'Refresh token has expired',
        messageAr: 'انتهت صلاحية رمز التحديث',
      });
    }

    // إلغاء الرمز القديم
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true },
    });

    // الحصول على الصلاحيات
    const permissions = this.getPermissionsForRole(storedToken.user.role);

    // توليد رموز جديدة
    const accessToken = this.generateAccessToken(storedToken.user, permissions);
    const refreshToken = await this.generateRefreshToken(
      storedToken.user.id,
      ipAddress,
      userAgent,
    );

    return { accessToken, refreshToken };
  }

  /**
   * تسجيل الخروج
   */
  async logout(token: string, userId: string) {
    // إلغاء رمز التحديث
    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashToken(token),
        userId,
      },
      data: { isRevoked: true },
    });

    // إنشاء سجل تدقيق
    await this.prisma.auditLog.create({
      data: {
        organizationId: (await this.prisma.user.findUnique({ where: { id: userId } }))!.organizationId,
        userId,
        action: 'USER_LOGOUT',
        entityType: 'user',
        entityId: userId,
      },
    });

    return { success: true };
  }

  /**
   * توليد رمز الوصول
   */

private generateAccessToken(user: any, permissions: string[]): string {
    // ✅ Do NOT put exp/iat in payload — JwtModule signOptions handles expiresIn
    // Putting exp in payload AND expiresIn in signOptions throws:
    // "Bad options.expiresIn option the payload already has an exp property"
    const payload = {
      sub:         user.id,
      email:       user.email,
      role:        user.role,
      branchId:    user.branchId ?? null,
      permissions,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * توليد رمز التحديث
   */
  private async generateRefreshToken(
    userId: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 أيام

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hashToken(token),
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    return token;
  }

  /**
   * تجزئة الرمز للتخزين
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * الحصول على صلاحيات الدور
   */
  private getPermissionsForRole(role: string): string[] {
    return [...(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [])];
  }

  /**
   * التحقق من صحة الـ JWT payload
   */
  async validateUser(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { organization: true },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      organizationId: user.organizationId,
      permissions: payload.permissions,
    };
  }
}
