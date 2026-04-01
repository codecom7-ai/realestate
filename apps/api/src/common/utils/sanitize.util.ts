// ═══════════════════════════════════════════════════════════════
// XSS Sanitization Utility
// تنظيف النصوص من الأكواد الضارة
// ═══════════════════════════════════════════════════════════════

/**
 * إزالة HTML tags والأكواد الضارة من النص
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // إزالة script tags ومحتواها
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // إزالة جميع HTML tags
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // تحويل HTML entities خطيرة
  const htmlEntities: Record<string, string> = {
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#x60;': '`',
    '&#x3D;': '=',
  };

  // إزالة HTML entities المشفرة
  sanitized = sanitized.replace(/&(lt|gt|amp|quot|#x27|#x2F|#x60|#x3D);/gi, (match) => {
    return htmlEntities[match] || match;
  });

  // إزالة javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');

  // إزالة on* event handlers (onclick, onload, etc.)
  sanitized = sanitized.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');

  // إزالة data: URIs (للحماية من XSS via data URLs)
  sanitized = sanitized.replace(/data:\s*[^,]*,*/gi, '');

  // إزالة vbscript:
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // إزالة unicode control characters
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');

  // إزالة null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * تنظيف كائن بشكل متكرر
 */
export function sanitizeObject<T extends Record<string, unknown>>(
  obj: T,
  excludeFields: string[] = ['password', 'passwordHash', 'token', 'secret'],
): T {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const sanitized = { ...obj };

  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];

    // تجاهل الحقول الحساسة
    if (excludeFields.includes(key)) {
      continue;
    }

    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeString(item);
        } else if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item, excludeFields);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      (sanitized as Record<string, unknown>)[key] = sanitizeObject(
        value as Record<string, unknown>,
        excludeFields,
      );
    }
  }

  return sanitized;
}

/**
 * التحقق من وجود محتوى XSS
 */
export function containsXSS(input: string): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /<meta/gi,
    /<style/gi,
    /<form/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /expression\s*\(/gi,
    /behavior\s*:/gi,
    /-moz-binding/gi,
    /@import/gi,
    /document\.cookie/gi,
    /document\.write/gi,
    /eval\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /new\s+Function\s*\(/gi,
  ];

  return xssPatterns.some((pattern) => pattern.test(input));
}

/**
 * تنظيف للعرض في HTML (escape)
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }

  const htmlEscapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return input.replace(/[&<>"'`=/]/g, (char) => htmlEscapeMap[char] || char);
}
