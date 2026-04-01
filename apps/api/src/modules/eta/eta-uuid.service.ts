// ═══════════════════════════════════════════════════════════════
// ETA UUID Service - خدمة توليد UUID للإيصالات
// UUID = SHA256 of serialized content — ليس random!
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { ProfessionalReceiptDto } from './dto/eta.dto';

/**
 * UUID Generator Service for ETA Receipts
 *
 * بناءً على SDK الرسمي:
 * 1. أنشئ كائن الإيصال بكل حقوله (مع UUID فارغ)
 * 2. إذا كان return receipt: أضف referenceUUID للإيصال الأصلي
 * 3. أضف UUID الإيصال السابق من نفس الـ POS (previousUUID)
 * 4. Serialize and normalize (flatten في سطر واحد)
 * 5. احسب SHA256 للنص المُسطَّح
 * 6. حوّل من 32 bytes إلى hexadecimal string (64 حرف)
 * 7. استخدم الـ hex string كـ UUID
 */
@Injectable()
export class ETAUuidService {
  private readonly logger = new Logger(ETAUuidService.name);

  /**
   * توليد UUID للإيصال
   * UUID = SHA256 hash of serialized receipt content
   */
  generateUUID(receipt: Omit<ProfessionalReceiptDto, 'uuid'>): string {
    // Serialize الإيصال
    const serialized = this.serializeReceipt(receipt);

    // حساب SHA256
    const hash = crypto.createHash('sha256');
    hash.update(serialized, 'utf8');
    const digest = hash.digest('hex');

    // التأكد من أن النتيجة 64 حرف hex
    if (digest.length !== 64) {
      this.logger.error(`Invalid UUID length: ${digest.length}`);
      throw new Error('UUID generation failed: invalid hash length');
    }

    this.logger.debug(`Generated UUID: ${digest}`);
    return digest;
  }

  /**
   * تسطيح الإيصال في سطر واحد
   * وفقاً لـ SDK serialization
   */
  serializeReceipt(receipt: Omit<ProfessionalReceiptDto, 'uuid'>): string {
    const parts: string[] = [];

    // ترتيب الحقول مهم! يجب أن يتطابق مع SDK

    // documentType
    parts.push(this.serializeValue(receipt.documentType));

    // documentTypeVersion
    parts.push(this.serializeValue(receipt.documentTypeVersion));

    // previousUUID (يمكن أن يكون فارغاً)
    parts.push(this.serializeValue(receipt.previousUUID || ''));

    // referenceOldUUID (للتصحيح فقط)
    parts.push(this.serializeValue(receipt.referenceOldUUID || ''));

    // internalId
    parts.push(this.serializeValue(receipt.internalId));

    // issuanceDateTime
    parts.push(this.serializeValue(receipt.issuanceDateTime));

    // issuer
    parts.push(this.serializeIssuer(receipt.issuer));

    // receiver
    parts.push(this.serializeReceiver(receipt.receiver));

    // items (مرتبة حسب الترتيب)
    for (const item of receipt.items) {
      parts.push(this.serializeItem(item));
    }

    // extraReceiptDiscounts
    if (receipt.extraReceiptDiscounts && receipt.extraReceiptDiscounts.length > 0) {
      for (const discount of receipt.extraReceiptDiscounts) {
        parts.push(this.serializeDiscount(discount));
      }
    }

    // totalDiscountAmount
    parts.push(this.serializeValue(receipt.totalDiscountAmount));

    // totalNetAmount
    parts.push(this.serializeValue(receipt.totalNetAmount));

    // totalTaxAmount
    parts.push(this.serializeValue(receipt.totalTaxAmount));

    // totalAmount
    parts.push(this.serializeValue(receipt.totalAmount));

    // extraDiscountPercentage
    parts.push(this.serializeValue(receipt.extraDiscountPercentage || 0));

    // remarks
    parts.push(this.serializeValue(receipt.remarks || ''));

    // دمج كل الأجزاء في سطر واحد
    return parts.join('');
  }

  /**
   * تسلسل قيمة واحدة
   */
  private serializeValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return '';
    }
    return String(value);
  }

  /**
   * تسلسل بيانات المُصدِر
   */
  private serializeIssuer(issuer: ProfessionalReceiptDto['issuer']): string {
    const parts: string[] = [
      this.serializeValue(issuer.id),
      this.serializeValue(issuer.name),
      this.serializeValue(issuer.type),
      this.serializeValue(issuer.branchId || ''),
    ];
    return parts.join('');
  }

  /**
   * تسلسل بيانات المُستلِم
   */
  private serializeReceiver(receiver: ProfessionalReceiptDto['receiver']): string {
    const parts: string[] = [
      this.serializeValue(receiver.type),
      this.serializeValue(receiver.id || ''),
      this.serializeValue(receiver.name || ''),
      this.serializeValue(receiver.nationalId || ''),
      this.serializeValue(receiver.address || ''),
      this.serializeValue(receiver.email || ''),
      this.serializeValue(receiver.phone || ''),
    ];
    return parts.join('');
  }

  /**
   * تسلسل بند واحد
   */
  private serializeItem(item: ProfessionalReceiptDto['items'][0]): string {
    const parts: string[] = [
      this.serializeValue(item.internalCode),
      this.serializeValue(item.description),
      this.serializeValue(item.taxType),
      this.serializeValue(item.taxRate),
      this.serializeValue(item.quantity),
      this.serializeValue(item.unitPrice),
      this.serializeValue(item.discount || 0),
      this.serializeValue(item.netAmount),
      this.serializeValue(item.taxAmount),
      this.serializeValue(item.totalAmount),
    ];
    return parts.join('');
  }

  /**
   * تسلسل خصم إضافي
   */
  private serializeDiscount(
    discount: NonNullable<ProfessionalReceiptDto['extraReceiptDiscounts']>[0],
  ): string {
    const parts: string[] = [
      this.serializeValue(discount.description),
      this.serializeValue(discount.amount),
    ];
    return parts.join('');
  }

  /**
   * التحقق من صحة UUID
   */
  isValidUUID(uuid: string): boolean {
    // يجب أن يكون 64 حرف hex
    return /^[0-9a-f]{64}$/i.test(uuid);
  }

  /**
   * التحقق من أن UUID يتطابق مع محتوى الإيصال
   */
  verifyUUID(receipt: ProfessionalReceiptDto): boolean {
    const { uuid, ...receiptWithoutUuid } = receipt;
    const calculatedUuid = this.generateUUID(receiptWithoutUuid);
    return uuid.toLowerCase() === calculatedUuid.toLowerCase();
  }

  /**
   * إنشاء UUID للإيصال مع التحقق من السابق
   */
  generateUUIDWithPrevious(
    receipt: Omit<ProfessionalReceiptDto, 'uuid'>,
    previousUUID: string | null,
  ): string {
    // إضافة previousUUID إذا وُجد
    const receiptWithPrevious = {
      ...receipt,
      previousUUID: previousUUID || undefined,
    };

    return this.generateUUID(receiptWithPrevious);
  }

  /**
   * حساب UUID للإيصال السابق من نفس الـ POS
   */
  async getPreviousUUID(posDeviceId: string): Promise<string | null> {
    // سيتم تنفيذها في eta-receipt.service.ts
    // لأنها تحتاج للوصول لقاعدة البيانات
    return null;
  }
}
