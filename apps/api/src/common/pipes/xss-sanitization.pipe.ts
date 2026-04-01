// ═══════════════════════════════════════════════════════════════
// XSS Sanitization Pipe
// تنظيف البيانات المدخلة من الأكواد الضارة
// ═══════════════════════════════════════════════════════════════

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { sanitizeString, sanitizeObject, containsXSS } from '../utils/sanitize.util';

@Injectable()
export class XssSanitizationPipe implements PipeTransform {
  /**
   * حقول مستثناة من التنظيف (كلمات المرور، التوكنات، إلخ)
   */
  private readonly excludeFields: string[] = [
    'password',
    'passwordHash',
    'passwordConfirm',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'privateKey',
    'mfaSecret',
  ];

  /**
   * تحديد ما إذا كان يجب رمي خطأ عند اكتشاف XSS
   */
  private readonly throwOnXss: boolean;

  constructor(options?: { excludeFields?: string[]; throwOnXss?: boolean }) {
    if (options?.excludeFields) {
      this.excludeFields = [...this.excludeFields, ...options.excludeFields];
    }
    this.throwOnXss = options?.throwOnXss ?? false;
  }

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // تجاهل الـ query params و params لأنها عادة strings بسيطة
    if (metadata.type === 'param') {
      if (typeof value === 'string') {
        const sanitized = sanitizeString(value);
        this.checkForXss(sanitized, metadata);
        return sanitized;
      }
      return value;
    }

    // تنظيف الـ body و query
    if (typeof value === 'string') {
      const sanitized = sanitizeString(value);
      this.checkForXss(sanitized, metadata);
      return sanitized;
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.transform(item, metadata));
    }

    if (value && typeof value === 'object') {
      const sanitized = sanitizeObject(
        value as Record<string, unknown>,
        this.excludeFields,
      );
      
      // فحص وجود XSS في الكائن المنظف
      this.checkObjectForXss(sanitized, metadata);
      
      return sanitized;
    }

    return value;
  }

  /**
   * فحص وجود XSS في نص
   */
  private checkForXss(value: string, metadata: ArgumentMetadata): void {
    if (this.throwOnXss && containsXSS(value)) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'XSS_DETECTED',
          message: 'Potentially malicious content detected',
          messageAr: 'تم اكتشاف محتوى ضار محتمل',
          field: metadata.data,
        },
      });
    }
  }

  /**
   * فحص وجود XSS في كائن
   */
  private checkObjectForXss(
    obj: Record<string, unknown>,
    metadata: ArgumentMetadata,
  ): void {
    if (!this.throwOnXss) return;

    for (const [key, value] of Object.entries(obj)) {
      if (this.excludeFields.includes(key)) continue;

      if (typeof value === 'string' && containsXSS(value)) {
        throw new BadRequestException({
          success: false,
          error: {
            code: 'XSS_DETECTED',
            message: 'Potentially malicious content detected',
            messageAr: 'تم اكتشاف محتوى ضار محتمل',
            field: `${metadata.data}.${key}`,
          },
        });
      }
    }
  }
}
