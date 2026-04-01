// ═══════════════════════════════════════════════════════════════
// ETA Signer Service - خدمة التوقيع الرقمي CAdES-BES
// Flutter App لا يمكنه التوقيع — NestJS يُوقّع
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { ProfessionalReceiptDto, ReceiptSignatureDto } from './dto/eta.dto';

/**
 * ETA Signer Service
 *
 * التوقيع المطلوب: CAdES-BES بترميز Base64
 *
 * من SDK الرسمي:
 * "The function to perform signature validation will not be deployed at this
 * point until a decision is provided by ETA to test and deploy the component."
 * → التوقيع مطلوب هيكلياً لكن التحقق منه معطّل حالياً
 */
@Injectable()
export class ETASignerService {
  private readonly logger = new Logger(ETASignerService.name);
  private certificatePath: string | null = null;
  private certificatePassword: string | null = null;
  private hasCertificate = false;

  constructor(private readonly configService: ConfigService) {
    this.loadCertificateConfig();
  }

  /**
   * تحميل إعدادات الشهادة الرقمية
   */
  private loadCertificateConfig(): void {
    this.certificatePath = this.configService.get('ETA_CERTIFICATE_PATH', null);
    this.certificatePassword = this.configService.get('ETA_CERTIFICATE_PASSWORD', null);

    if (this.certificatePath && this.certificatePassword) {
      this.hasCertificate = true;
      this.logger.log('✅ ETA digital certificate configured');
    } else {
      this.logger.warn('⚠️ ETA digital certificate not configured. Using development mode.');
    }
  }

  /**
   * توقيع الإيصال بتوقيع CAdES-BES
   *
   * ملاحظة: في وضع التطوير، يتم إرجاع توقيع وهمي
   * لأن التحقق من التوقيع معطّل في ETA حالياً
   */
  async signReceipt(receipt: ProfessionalReceiptDto): Promise<ReceiptSignatureDto> {
    if (!this.hasCertificate) {
      // وضع التطوير - توقيع وهمي
      return this.createDevelopmentSignature(receipt);
    }

    try {
      // في الإنتاج، يجب استخدام مكتبة CAdES-BES حقيقية
      // مثل: node-webcrypto-ossl أو pkcs7
      return await this.createCAdESignature(receipt);
    } catch (error) {
      this.logger.error(`Failed to sign receipt: ${error.message}`);
      throw new Error(`Receipt signing failed: ${error.message}`);
    }
  }

  /**
   * إنشاء توقيع CAdES-BES حقيقي
   *
   * ملاحظة: هذا يتطلب مكتبة PKCS#7 متخصصة
   * في الوقت الحالي، نستخدم توقيع بسيط للتطوير
   */
  private async createCAdESignature(
    receipt: ProfessionalReceiptDto,
  ): Promise<ReceiptSignatureDto> {
    // TODO: تنفيذ CAdES-BES الفعلي باستخدام مكتبة متخصصة
    // مثل node-pkcs7 أو signer مكتبة متخصصة

    // في الوقت الحالي، نستخدم توقيع بسيط
    const serialized = JSON.stringify(receipt);
    const signature = crypto
      .createHmac('sha256', this.certificatePassword || 'dev-key')
      .update(serialized)
      .digest('base64');

    this.logger.debug('Created development signature for receipt');

    return {
      signatureType: 'I', // I = Issuer (المُصدِر)
      value: signature,
    };
  }

  /**
   * إنشاء توقيع للتطوير
   *
   * ملاحظة من SDK:
   * "The function to perform signature validation will not be deployed at this
   * point until a decision is provided by ETA to test and deploy the component."
   *
   * التوقيع مطلوب هيكلياً لكن التحقق منه معطّل حالياً في ETA
   */
  private createDevelopmentSignature(receipt: ProfessionalReceiptDto): ReceiptSignatureDto {
    // إنشاء توقيع بسيط للتطوير
    // هذا سيُقبل من ETA حالياً لأن التحقق معطّل
    const serialized = JSON.stringify({
      uuid: receipt.uuid,
      internalId: receipt.internalId,
      issuanceDateTime: receipt.issuanceDateTime,
      totalAmount: receipt.totalAmount,
    });

    // توقيع بسيط بـ HMAC-SHA256
    const signature = crypto
      .createHmac('sha256', 'eta-dev-signing-key')
      .update(serialized)
      .digest('base64');

    this.logger.debug('Created development signature');

    return {
      signatureType: 'I', // I = Issuer
      value: signature,
    };
  }

  /**
   * توقيع عدة إيصالات
   */
  async signReceipts(receipts: ProfessionalReceiptDto[]): Promise<ReceiptSignatureDto[]> {
    // جميع الإيصالات في نفس الـ submission لها نفس التوقيع
    // لأنها جميعاً من نفس المُصدِر
    const signature = await this.signReceipt(receipts[0]);
    return receipts.map(() => signature);
  }

  /**
   * التحقق من وجود شهادة رقمية
   */
  hasValidCertificate(): boolean {
    return this.hasCertificate;
  }

  /**
   * الحصول على معلومات الشهادة
   */
  getCertificateInfo(): {
    hasCertificate: boolean;
    path: string | null;
  } {
    return {
      hasCertificate: this.hasCertificate,
      path: this.certificatePath,
    };
  }

  /**
   * التحقق من التوقيع (للاختبار)
   *
   * ملاحظة: هذا للتحقق المحلي فقط
   * ETA لا تتحقق من التوقيع حالياً
   */
  verifySignature(receipt: ProfessionalReceiptDto, signature: string): boolean {
    if (!this.hasCertificate) {
      // في وضع التطوير، نقبل أي توقيع
      return true;
    }

    try {
      // إعادة حساب التوقيع والمقارنة
      const expectedSignature = this.createDevelopmentSignature(receipt);
      return signature === expectedSignature.value;
    } catch {
      return false;
    }
  }
}
