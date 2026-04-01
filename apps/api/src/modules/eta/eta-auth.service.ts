// ═══════════════════════════════════════════════════════════════
// ETA Auth Service - خدمة المصادقة مع ETA
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { ETAAuthResponseDto, ETATokenStatusDto } from './dto/eta.dto';

/**
 * إعدادات ETA من البيئة
 */
interface ETAConfig {
  identityUrl: string; // id.eta.gov.eg
  apiUrl: string; // api.invoicing.eta.gov.eg
  portalUrl: string; // invoicing.eta.gov.eg
  clientId: string;
  clientSecret: string;
  posSerial: string;
  posOsVersion: string;
  posModelFramework: string;
  preSharedKey: string;
  isProduction: boolean;
}

/**
 * بيانات التوكن المخزنة
 */
interface TokenData {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  scope: string;
  obtainedAt: number; // Unix timestamp
  expiresAt: number; // Unix timestamp
}

@Injectable()
export class ETAAuthService implements OnModuleInit {
  private readonly logger = new Logger(ETAAuthService.name);
  private config: ETAConfig | null = null;
  private tokenCacheKey = 'eta:access_token';
  private tokenTTL = 3300; // أقل من ساعة بقليل (3600 - 300 ثانية هامش أمان)

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async onModuleInit() {
    await this.loadConfig();
  }

  /**
   * تحميل إعدادات ETA من قاعدة البيانات والبيئة
   */
  private async loadConfig(): Promise<void> {
    // قراءة الإعدادات من البيئة
    const isProduction = this.configService.get('ETA_ENV', 'preprod') === 'production';

    // محاولة قراءة بيانات الاعتماد من قاعدة البيانات أولاً
    const organization = await this.prisma.organization.findFirst();
    const posDevice = await this.prisma.posDevice.findFirst({
      where: { status: 'ACTIVE' },
    });

    // إعدادات البيئة
    this.config = {
      identityUrl: isProduction
        ? 'https://id.eta.gov.eg'
        : 'https://id.preprod.eta.gov.eg', // Fixed: removed 'invoicing' from preprod URL
      apiUrl: isProduction
        ? 'https://api.invoicing.eta.gov.eg'
        : 'https://api.preprod.invoicing.eta.gov.eg',
      portalUrl: isProduction
        ? 'https://invoicing.eta.gov.eg'
        : 'https://preprod.invoicing.eta.gov.eg',
      clientId: this.configService.get('ETA_CLIENT_ID', '') || '',
      clientSecret: this.configService.get('ETA_CLIENT_SECRET', '') || '',
      posSerial: posDevice?.posSerial || this.configService.get('ETA_POS_SERIAL', '') || '',
      posOsVersion: posDevice?.posOsVersion || this.configService.get('ETA_POS_OS_VERSION', '1.0') || '1.0',
      posModelFramework: posDevice?.posModelFramework || this.configService.get('ETA_POS_MODEL_FRAMEWORK', '1') || '1',
      preSharedKey: this.configService.get('ETA_PRE_SHARED_KEY', '') || '',
      isProduction,
    };

    // التحقق من وجود بيانات الاعتماد
    if (!this.hasValidCredentials()) {
      this.logger.warn('⚠️ ETA credentials not configured. Running in fallback mode.');
    } else {
      this.logger.log(`✅ ETA configured for ${isProduction ? 'PRODUCTION' : 'PRE-PRODUCTION'} environment`);
    }
  }

  /**
   * التحقق من وجود بيانات اعتماد صالحة
   */
  private hasValidCredentials(): boolean {
    return !!(
      this.config?.clientId &&
      this.config?.clientSecret &&
      this.config?.posSerial &&
      this.config?.preSharedKey
    );
  }

  /**
   * الحصول على توكن وصول صالح
   * يُخزَّن في Redis مع TTL أقل من ساعة بقليل
   */
  async getToken(): Promise<string> {
    // التحقق من وجود توكن مخزن في cache
    const cachedToken = await this.cache.get<TokenData>(this.tokenCacheKey);
    if (cachedToken && this.isTokenValid(cachedToken)) {
      this.logger.debug('Using cached ETA token');
      return cachedToken.accessToken;
    }

    // الحصول على توكن جديد
    return await this.refreshToken();
  }

  /**
   * الحصول على توكن جديد من ETA
   */
  async refreshToken(): Promise<string> {
    if (!this.hasValidCredentials()) {
      // وضع التطوير بدون credentials - إرجاع توكن وهمي
      this.logger.warn('Running in development mode without ETA credentials');
      return 'dev_mode_token';
    }

    if (!this.config) {
      throw new Error('ETA configuration not loaded');
    }

    try {
      const response = await fetch(`${this.config.identityUrl}/connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'posserial': this.config.posSerial,
          'pososversion': this.config.posOsVersion,
          'posmodelframework': this.config.posModelFramework,
          'presharedkey': this.config.preSharedKey,
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
        }).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`ETA auth failed: ${response.status} - ${errorText}`);
        throw new Error(`ETA authentication failed: ${response.status}`);
      }

      const data: ETAAuthResponseDto = await response.json();

      // حساب وقت الانتهاء
      const now = Math.floor(Date.now() / 1000);
      const tokenData: TokenData = {
        accessToken: data.access_token,
        tokenType: data.token_type,
        expiresIn: data.expires_in,
        scope: data.scope,
        obtainedAt: now,
        expiresAt: now + Math.min(data.expires_in, this.tokenTTL),
      };

      // تخزين في cache
      await this.cache.set(this.tokenCacheKey, tokenData, this.tokenTTL);

      this.logger.log('✅ ETA token obtained and cached');
      return data.access_token;
    } catch (error: any) {
      this.logger.error(`Failed to get ETA token: ${error.message}`);
      throw error;
    }
  }

  /**
   * التحقق من صلاحية التوكن
   */
  private isTokenValid(tokenData: TokenData): boolean {
    const now = Math.floor(Date.now() / 1000);
    // إضافة هامش أمان 60 ثانية
    return tokenData.expiresAt > now + 60;
  }

  /**
   * التحقق من حالة التوكن
   */
  async getTokenStatus(): Promise<ETATokenStatusDto> {
    const cachedToken = await this.cache.get<TokenData>(this.tokenCacheKey);
    const now = Math.floor(Date.now() / 1000);

    if (!cachedToken) {
      return {
        isValid: false,
        statusAr: 'لا يوجد توكن - يُرجى المصادقة',
      };
    }

    const secondsRemaining = cachedToken.expiresAt - now;

    if (secondsRemaining <= 0) {
      return {
        isValid: false,
        expiresAt: new Date(cachedToken.expiresAt * 1000).toISOString(),
        secondsRemaining: 0,
        statusAr: 'التوكن منتهي الصلاحية',
      };
    }

    return {
      isValid: true,
      expiresAt: new Date(cachedToken.expiresAt * 1000).toISOString(),
      secondsRemaining,
      statusAr: `التوكن صالح لمدة ${this.formatSeconds(secondsRemaining)}`,
    };
  }

  /**
   * تنسيق الثواني بصيغة مقروءة
   */
  private formatSeconds(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes} دقيقة و ${secs} ثانية`;
    }
    return `${secs} ثانية`;
  }

  /**
   * إبطال التوكن الحالي (لإجبار التحديث)
   */
  async invalidateToken(): Promise<void> {
    await this.cache.del(this.tokenCacheKey);
    this.logger.log('ETA token invalidated');
  }

  /**
   * الحصول على رابط API
   */
  getApiUrl(): string {
    return this.config?.apiUrl || '';
  }

  /**
   * الحصول على رابط البوابة (لـ QR code)
   */
  getPortalUrl(): string {
    return this.config?.portalUrl || '';
  }

  /**
   * التحقق من أن النظام في وضع الإنتاج
   */
  isProduction(): boolean {
    return this.config?.isProduction || false;
  }

  /**
   * التحقق من تكوين النظام
   */
  async checkConfiguration(): Promise<{
    isConfigured: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    // التحقق من إعدادات البيئة
    if (!this.config?.clientId) {
      issues.push('ETA_CLIENT_ID غير مُعرَّف');
    }
    if (!this.config?.clientSecret) {
      issues.push('ETA_CLIENT_SECRET غير مُعرَّف');
    }
    if (!this.config?.posSerial) {
      issues.push('رقم سيريال POS غير مُعرَّف');
    }
    if (!this.config?.preSharedKey) {
      issues.push('ETA_PRE_SHARED_KEY غير مُعرَّف');
    }

    // التحقق من وجود جهاز POS نشط
    const posDevice = await this.prisma.posDevice.findFirst({
      where: { status: 'ACTIVE' },
    });
    if (!posDevice) {
      issues.push('لا يوجد جهاز POS نشط');
    }

    // التحقق من وجود RIN للمؤسسة
    const organization = await this.prisma.organization.findFirst();
    if (!organization?.taxId) {
      issues.push('الرقم الضريبي (RIN) للمؤسسة غير مُعرَّف');
    }

    return {
      isConfigured: issues.length === 0,
      issues,
    };
  }
}
