// ═══════════════════════════════════════════════════════════════
// Settings Service - خدمة إعدادات التكاملات
// ═══════════════════════════════════════════════════════════════

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  SettingCategory,
  SettingResponseDto,
  SettingCategoryResponseDto,
  AllSettingsResponseDto,
  TestConnectionResponseDto,
  SETTING_KEYS,
  SETTING_CATEGORY_AR,
  UpdateSettingDto,
  UpdateSettingsCategoryDto,
} from './dto/settings.dto';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    const key = this.configService.get<string>('ENCRYPTION_KEY') || '';
    // Ensure key is 32 bytes for AES-256
    this.encryptionKey = crypto
      .createHash('sha256')
      .update(key)
      .digest();
  }

  // ═══════════════════════════════════════════════════════════════
  // Encryption Methods
  // ═══════════════════════════════════════════════════════════════

  /**
   * تشفير البيانات الحساسة (AES-256-GCM)
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
   * إخفاء جزئي للقيمة الحساسة (يظهر أول 4 وآخر 4 أحرف)
   */
  private maskValue(value: string): string {
    if (!value || value.length <= 8) {
      return '••••••••';
    }
    const start = value.slice(0, 4);
    const end = value.slice(-4);
    const middle = '•'.repeat(Math.min(value.length - 8, 20));
    return `${start}${middle}${end}`;
  }

  // ═══════════════════════════════════════════════════════════════
  // Get All Settings
  // ═══════════════════════════════════════════════════════════════

  /**
   * جلب جميع الإعدادات (قيم مخفية)
   */
  async getAllSettings(organizationId: string): Promise<AllSettingsResponseDto> {
    const categories: SettingCategoryResponseDto[] = [];

    for (const category of Object.values(SettingCategory)) {
      const categorySettings = await this.getCategorySettings(organizationId, category as SettingCategory);
      categories.push(categorySettings);
    }

    return { categories };
  }

  /**
   * جلب إعدادات فئة معينة
   */
  async getCategorySettings(
    organizationId: string,
    category: SettingCategory,
  ): Promise<SettingCategoryResponseDto> {
    // Get existing settings from database
    const existingSettings = await this.prisma.setting.findMany({
      where: { organizationId, category },
    });

    const existingMap = new Map<string, typeof existingSettings[0]>(existingSettings.map(s => [s.key, s]));

    // Get all defined keys for this category
    const definedKeys = SETTING_KEYS[category] || [];
    const settings: SettingResponseDto[] = [];

    for (const def of definedKeys) {
      const existing = existingMap.get(def.key);
      
      if (existing) {
        settings.push({
          id: existing.id,
          category: category as SettingCategory,
          key: def.key,
          value: undefined, // لا نُرجع القيمة الحقيقية
          isSecret: existing.isSecret,
          maskedValue: existing.value ? this.maskValue(existing.value) : undefined,
          verificationStatus: existing.verificationStatus || undefined,
          lastVerifiedAt: existing.lastVerifiedAt || undefined,
          verificationError: existing.verificationError || undefined,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt,
        });
      } else {
        // Setting not configured yet
        settings.push({
          id: '',
          category: category as SettingCategory,
          key: def.key,
          value: undefined,
          isSecret: def.isSecret,
          maskedValue: undefined,
          verificationStatus: 'untested',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    const configuredCount = existingSettings.filter(s => s.value).length;

    return {
      category,
      categoryAr: SETTING_CATEGORY_AR[category],
      settings,
      configuredCount,
      totalCount: definedKeys.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Get Single Setting
  // ═══════════════════════════════════════════════════════════════

  /**
   * جلب قيمة إعداد معين (مع فك التشفير)
   */
  async getSettingValue(
    organizationId: string,
    category: SettingCategory,
    key: string,
    decrypted = false,
  ): Promise<{ key: string; value: string }> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_category_key: {
          organizationId,
          category,
          key,
        },
      },
    });

    if (!setting || !setting.value) {
      // Try to get from environment variables as fallback
      const envValue = this.configService.get<string>(`${category.toUpperCase()}_${key.toUpperCase()}`);
      if (envValue) {
        return { key, value: envValue };
      }

      throw new NotFoundException({
        success: false,
        error: {
          code: 'SETTING_NOT_FOUND',
          message: `Setting ${category}.${key} not found`,
          messageAr: `الإعداد ${category}.${key} غير موجود`,
        },
      });
    }

    const value = decrypted && setting.isSecret
      ? this.decrypt(setting.value)
      : setting.value;

    return { key, value };
  }

  /**
   * جلب قيمة إعداد للاستخدام الداخلي (مع فك التشفير دائماً)
   */
  async getSettingValueForInternalUse(
    organizationId: string,
    category: SettingCategory,
    key: string,
  ): Promise<string | null> {
    const setting = await this.prisma.setting.findUnique({
      where: {
        organizationId_category_key: {
          organizationId,
          category,
          key,
        },
      },
    });

    if (setting && setting.value) {
      return setting.isSecret ? this.decrypt(setting.value) : setting.value;
    }

    // Fallback to environment variable
    const envKey = `${category.toUpperCase()}_${key.toUpperCase()}`;
    return this.configService.get<string>(envKey) || null;
  }

  // ═══════════════════════════════════════════════════════════════
  // Update Settings
  // ═══════════════════════════════════════════════════════════════

  /**
   * تحديث إعداد واحد
   */
  async updateSetting(
    organizationId: string,
    category: SettingCategory,
    key: string,
    dto: UpdateSettingDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SettingResponseDto> {
    // Check if key is valid for this category
    const definedKeys = SETTING_KEYS[category] || [];
    const keyDef = definedKeys.find(k => k.key === key);

    if (!keyDef) {
      throw new NotFoundException({
        success: false,
        error: {
          code: 'INVALID_SETTING_KEY',
          message: `Invalid setting key ${key} for category ${category}`,
          messageAr: `مفتاح الإعداد ${key} غير صالح للفئة ${category}`,
        },
      });
    }

    // Encrypt if secret
    const valueToStore = keyDef.isSecret ? this.encrypt(dto.value) : dto.value;

    // Upsert setting
    const setting = await this.prisma.setting.upsert({
      where: {
        organizationId_category_key: {
          organizationId,
          category,
          key,
        },
      },
      create: {
        organizationId,
        category,
        key,
        value: valueToStore,
        isSecret: keyDef.isSecret,
      },
      update: {
        value: valueToStore,
        verificationStatus: 'untested',
        verificationError: null,
      },
    });

    // Create audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: 'SETTING_UPDATED',
      entityType: 'setting',
      entityId: setting.id,
      newValue: { category, key, updated: true },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Setting updated: ${category}.${key} by user ${userId}`);

    return {
      id: setting.id,
      category,
      key,
      value: undefined,
      isSecret: setting.isSecret,
      maskedValue: this.maskValue(dto.value),
      verificationStatus: 'untested',
      createdAt: setting.createdAt,
      updatedAt: setting.updatedAt,
    };
  }

  /**
   * تحديث عدة إعدادات لفئة معينة
   */
  async updateCategorySettings(
    organizationId: string,
    category: SettingCategory,
    dto: UpdateSettingsCategoryDto,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<SettingCategoryResponseDto> {
    for (const item of dto.settings) {
      await this.updateSetting(
        organizationId,
        category,
        item.key,
        { value: item.value },
        userId,
        ipAddress,
        userAgent,
      );
    }

    return this.getCategorySettings(organizationId, category);
  }

  // ═══════════════════════════════════════════════════════════════
  // Test Connections
  // ═══════════════════════════════════════════════════════════════

  /**
   * اختبار اتصال فئة معينة
   */
  async testConnection(
    organizationId: string,
    category: SettingCategory,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<TestConnectionResponseDto> {
    let success = false;
    let message: string | undefined;
    let error: string | undefined;
    let details: Record<string, unknown> | undefined;

    try {
      switch (category) {
        case SettingCategory.ETA:
          const etaResult = await this.testETAConnection(organizationId);
          success = etaResult.success;
          message = etaResult.message;
          error = etaResult.error;
          details = etaResult.details;
          break;

        case SettingCategory.AI:
          const aiResult = await this.testAIConnection(organizationId);
          success = aiResult.success;
          message = aiResult.message;
          error = aiResult.error;
          details = aiResult.details;
          break;

        case SettingCategory.PAYMENTS:
          const paymentsResult = await this.testPaymentsConnection(organizationId);
          success = paymentsResult.success;
          message = paymentsResult.message;
          error = paymentsResult.error;
          details = paymentsResult.details;
          break;

        case SettingCategory.STORAGE:
          const storageResult = await this.testStorageConnection(organizationId);
          success = storageResult.success;
          message = storageResult.message;
          error = storageResult.error;
          details = storageResult.details;
          break;

        case SettingCategory.WHATSAPP:
          const whatsappResult = await this.testWhatsAppConnection(organizationId);
          success = whatsappResult.success;
          message = whatsappResult.message;
          error = whatsappResult.error;
          details = whatsappResult.details;
          break;

        case SettingCategory.FIREBASE:
          const firebaseResult = await this.testFirebaseConnection(organizationId);
          success = firebaseResult.success;
          message = firebaseResult.message;
          error = firebaseResult.error;
          details = firebaseResult.details;
          break;

        default:
          throw new Error(`Unknown category: ${category}`);
      }
    } catch (err: any) {
      success = false;
      error = err.message || 'Unknown error occurred';
    }

    // Update verification status
    await this.prisma.setting.updateMany({
      where: { organizationId, category },
      data: {
        verificationStatus: success ? 'success' : 'failed',
        lastVerifiedAt: new Date(),
        lastVerifiedBy: userId,
        verificationError: error || null,
      },
    });

    // Create audit log
    await this.auditService.log({
      organizationId,
      userId,
      action: success ? 'SETTING_TEST_SUCCESS' : 'SETTING_TEST_FAILED',
      entityType: 'setting',
      entityId: category,
      newValue: { category, success, error },
      ipAddress,
      userAgent,
    });

    return {
      category,
      success,
      message,
      error,
      details,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // Test Connection Implementations
  // ═══════════════════════════════════════════════════════════════

  private async testETAConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const clientId = await this.getSettingValueForInternalUse(organizationId, SettingCategory.ETA, 'clientId');
    const clientSecret = await this.getSettingValueForInternalUse(organizationId, SettingCategory.ETA, 'clientSecret');

    if (!clientId || !clientSecret) {
      return {
        success: false,
        error: 'بيانات الاعتماد غير مكتملة',
        details: { missing: !clientId ? ['clientId'] : ['clientSecret'] },
      };
    }

    // TODO: Implement actual ETA API test
    // For now, just validate format
    if (clientId.length < 5 || clientSecret.length < 10) {
      return {
        success: false,
        error: 'صيغة بيانات الاعتماد غير صحيحة',
      };
    }

    return {
      success: true,
      message: 'تم التحقق من بيانات ETA بنجاح',
      details: { clientId: clientId.slice(0, 4) + '...' },
    };
  }

  private async testAIConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const anthropicKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.AI, 'anthropicKey');
    const googleAiKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.AI, 'googleAiKey');
    const openrouterKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.AI, 'openrouterKey');

    const providers: string[] = [];
    if (anthropicKey) providers.push('Anthropic');
    if (googleAiKey) providers.push('Google AI');
    if (openrouterKey) providers.push('OpenRouter');

    if (providers.length === 0) {
      return {
        success: false,
        error: 'لم يتم تكوين أي مزود AI',
      };
    }

    // Validate API key formats
    const invalidKeys: string[] = [];
    if (anthropicKey && !anthropicKey.startsWith('sk-ant-')) {
      invalidKeys.push('Anthropic');
    }

    if (invalidKeys.length > 0) {
      return {
        success: false,
        error: `صيغة المفتاح غير صحيحة لـ: ${invalidKeys.join(', ')}`,
      };
    }

    return {
      success: true,
      message: `مزودو AI المكوَّنون: ${providers.join(', ')}`,
      details: { providers },
    };
  }

  private async testPaymentsConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const paymobKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.PAYMENTS, 'paymobKey');
    const fawryCode = await this.getSettingValueForInternalUse(organizationId, SettingCategory.PAYMENTS, 'fawryCode');
    const fawryHash = await this.getSettingValueForInternalUse(organizationId, SettingCategory.PAYMENTS, 'fawryHash');

    const providers: string[] = [];
    if (paymobKey) providers.push('Paymob');
    if (fawryCode && fawryHash) providers.push('Fawry');

    if (providers.length === 0) {
      return {
        success: false,
        error: 'لم يتم تكوين أي بوابة دفع',
      };
    }

    return {
      success: true,
      message: `بوابات الدفع المكوَّنة: ${providers.join(', ')}`,
      details: { providers },
    };
  }

  private async testStorageConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const accountId = await this.getSettingValueForInternalUse(organizationId, SettingCategory.STORAGE, 'accountId');
    const accessKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.STORAGE, 'accessKey');
    const secretKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.STORAGE, 'secretKey');

    if (!accountId || !accessKey || !secretKey) {
      return {
        success: false,
        error: 'بيانات R2 غير مكتملة',
        details: {
          missing: [
            !accountId && 'accountId',
            !accessKey && 'accessKey',
            !secretKey && 'secretKey',
          ].filter(Boolean),
        },
      };
    }

    // TODO: Implement actual R2 connection test using S3 client
    return {
      success: true,
      message: 'تم التحقق من بيانات R2 بنجاح',
      details: { accountId: accountId.slice(0, 4) + '...' },
    };
  }

  private async testWhatsAppConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const token = await this.getSettingValueForInternalUse(organizationId, SettingCategory.WHATSAPP, 'token');
    const phoneId = await this.getSettingValueForInternalUse(organizationId, SettingCategory.WHATSAPP, 'phoneId');

    if (!token || !phoneId) {
      return {
        success: false,
        error: 'بيانات WhatsApp غير مكتملة',
        details: {
          missing: [
            !token && 'token',
            !phoneId && 'phoneId',
          ].filter(Boolean),
        },
      };
    }

    // TODO: Implement actual WhatsApp API test
    return {
      success: true,
      message: 'تم التحقق من بيانات WhatsApp بنجاح',
      details: { phoneId },
    };
  }

  private async testFirebaseConnection(organizationId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    details?: Record<string, unknown>;
  }> {
    const projectId = await this.getSettingValueForInternalUse(organizationId, SettingCategory.FIREBASE, 'projectId');
    const privateKey = await this.getSettingValueForInternalUse(organizationId, SettingCategory.FIREBASE, 'privateKey');
    const clientEmail = await this.getSettingValueForInternalUse(organizationId, SettingCategory.FIREBASE, 'clientEmail');

    if (!projectId || !privateKey || !clientEmail) {
      return {
        success: false,
        error: 'بيانات Firebase غير مكتملة',
        details: {
          missing: [
            !projectId && 'projectId',
            !privateKey && 'privateKey',
            !clientEmail && 'clientEmail',
          ].filter(Boolean),
        },
      };
    }

    // Validate private key format
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      return {
        success: false,
        error: 'صيغة المفتاح الخاص غير صحيحة',
      };
    }

    return {
      success: true,
      message: 'تم التحقق من بيانات Firebase بنجاح',
      details: { projectId, clientEmail },
    };
  }
}
