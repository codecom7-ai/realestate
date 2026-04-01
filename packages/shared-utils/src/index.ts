// ═══════════════════════════════════════════════════════════════
// Shared Utilities - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';

// ─────────────────────────────────────────────────────────────────
// Date Formatting (Arabic)
// ─────────────────────────────────────────────────────────────────

/**
 * تنسيق التاريخ بالعربية
 */
export function formatDateAr(date: Date | string, formatStr: string = 'dd MMMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ar });
}

/**
 * الوقت النسبي بالعربية (منذ 5 دقائق، إلخ)
 */
export function formatRelativeTimeAr(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true, locale: ar });
}

// ─────────────────────────────────────────────────────────────────
// Currency Formatting
// ─────────────────────────────────────────────────────────────────

/**
 * تنسيق المبلغ بالجنيه المصري
 */
export function formatEGP(amount: number): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * تنسيق المبلغ بالعملة المحددة
 */
export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * تنسيق الأرقام بالعربية
 */
export function formatNumberAr(num: number): string {
  return new Intl.NumberFormat('ar-EG').format(num);
}

// ─────────────────────────────────────────────────────────────────
// Phone Validation (Egyptian)
// ─────────────────────────────────────────────────────────────────

/**
 * التحقق من رقم الهاتف المصري
 * يقبل: +20xxxxxxxxxx أو 0xxxxxxxxxx
 */
export function isValidEgyptianPhone(phone: string): boolean {
  const phoneRegex = /^(\+20|0)[0-9]{10}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * تنسيق رقم الهاتف المصري
 */
export function formatEgyptianPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('+20')) {
    return cleaned.replace('+20', '0');
  }
  return cleaned;
}

/**
 * تحويل الرقم لصيغة دولية
 */
export function toInternationalPhone(phone: string): string {
  const cleaned = phone.replace(/\s/g, '');
  if (cleaned.startsWith('0')) {
    return '+20' + cleaned.slice(1);
  }
  if (cleaned.startsWith('+20')) {
    return cleaned;
  }
  return '+20' + cleaned;
}

// ─────────────────────────────────────────────────────────────────
// National ID Validation (Egyptian)
// ─────────────────────────────────────────────────────────────────

/**
 * التحقق من الرقم القومي المصري
 * يجب أن يكون 14 رقم
 */
export function isValidEgyptianNationalId(nationalId: string): boolean {
  const cleaned = nationalId.replace(/\s/g, '');
  if (!/^\d{14}$/.test(cleaned)) {
    return false;
  }
  
  // التحقق من القرن
  const century = cleaned[0];
  if (!['2', '3', '4'].includes(century)) {
    return false;
  }
  
  // التحقق من الشهر (01-12)
  const month = parseInt(cleaned.slice(3, 5), 10);
  if (month < 1 || month > 12) {
    return false;
  }
  
  // التحقق من اليوم (01-31)
  const day = parseInt(cleaned.slice(5, 7), 10);
  if (day < 1 || day > 31) {
    return false;
  }
  
  return true;
}

/**
 * استخراج معلومات من الرقم القومي
 */
export function extractNationalIdInfo(nationalId: string): {
  birthDate: Date;
  gender: 'male' | 'female';
  governorate: string;
} | null {
  if (!isValidEgyptianNationalId(nationalId)) {
    return null;
  }
  
  const cleaned = nationalId.replace(/\s/g, '');
  
  // استخراج سنة الميلاد
  const centuryCode = cleaned[0];
  const yearPart = cleaned.slice(1, 3);
  let year: number;
  
  switch (centuryCode) {
    case '2':
      year = 1900 + parseInt(yearPart, 10);
      break;
    case '3':
      year = 2000 + parseInt(yearPart, 10);
      break;
    case '4':
      year = 2000 + parseInt(yearPart, 10);
      break;
    default:
      year = 2000 + parseInt(yearPart, 10);
  }
  
  const month = parseInt(cleaned.slice(3, 5), 10) - 1;
  const day = parseInt(cleaned.slice(5, 7), 10);
  
  // تحديد الجنس (رقم فردي = ذكر، زوجي = أنثى)
  const genderCode = parseInt(cleaned.slice(12, 13), 10);
  const gender: 'male' | 'female' = genderCode % 2 === 1 ? 'male' : 'female';
  
  // كود المحافظة
  const governorateCode = cleaned.slice(7, 9);
  const governorates: Record<string, string> = {
    '01': 'القاهرة',
    '02': 'الإسكندرية',
    '03': 'بورسعيد',
    '04': 'السويس',
    '11': 'دمياط',
    '12': 'الدقهلية',
    '13': 'الشرقية',
    '14': 'القليوبية',
    '15': 'كفر الشيخ',
    '16': 'الغربية',
    '17': 'المنوفية',
    '18': 'البحيرة',
    '19': 'الإسماعيلية',
    '21': 'الجيزة',
    '22': 'بني سويف',
    '23': 'الفيوم',
    '24': 'المنيا',
    '25': 'أسيوط',
    '26': 'سوهاج',
    '27': 'قنا',
    '28': 'أسوان',
    '29': 'الأقصر',
    '31': 'البحر الأحمر',
    '32': 'الوادي الجديد',
    '33': 'مطروح',
    '34': 'شمال سيناء',
    '35': 'جنوب سيناء',
  };
  
  return {
    birthDate: new Date(year, month, day),
    gender,
    governorate: governorates[governorateCode] || 'غير معروف',
  };
}

// ─────────────────────────────────────────────────────────────────
// String Utilities
// ─────────────────────────────────────────────────────────────────

/**
 * اختصار النص مع إضافة ...
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * توليد معرف فريد
 */
export function generateId(): string {
  return crypto.randomUUID();
}

/**
 * توليد كود قصير
 */
export function generateShortCode(length: number = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────
// Validation Utilities
// ─────────────────────────────────────────────────────────────────

/**
 * التحقق من صحة البريد الإلكتروني
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * التحقق من قوة كلمة المرور
 * يجب أن تحتوي على 8 أحرف على الأقل، حرف كبير، حرف صغير، رقم
 */
export function isStrongPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('يجب أن تكون كلمة المرور 8 أحرف على الأقل');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف كبير واحد على الأقل');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('يجب أن تحتوي على حرف صغير واحد على الأقل');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('يجب أن تحتوي على رقم واحد على الأقل');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// ─────────────────────────────────────────────────────────────────
// Area/Size Utilities
// ─────────────────────────────────────────────────────────────────

/**
 * تنسيق المساحة بالمتر المربع
 */
export function formatArea(areaM2: number): string {
  return `${formatNumberAr(areaM2)} م²`;
}

/**
 * تحويل من متر مربع إلى قدم مربع
 */
export function m2ToSqft(areaM2: number): number {
  return areaM2 * 10.7639;
}

/**
 * تنسيق المساحة بالقدم المربع
 */
export function formatAreaSqft(areaM2: number): string {
  const sqft = m2ToSqft(areaM2);
  return `${formatNumberAr(Math.round(sqft))} قدم²`;
}

// ─────────────────────────────────────────────────────────────────
// Commission Calculation
// ─────────────────────────────────────────────────────────────────

/**
 * حساب ضريبة القيمة المضافة (14% في مصر)
 */
export function calculateVAT(amount: number, vatRate: number = 0.14): number {
  return amount * vatRate;
}

/**
 * حساب العمولة مع الضريبة
 */
export function calculateCommissionWithVAT(
  baseAmount: number,
  percentage: number
): {
  baseAmount: number;
  commissionAmount: number;
  vatAmount: number;
  totalAmount: number;
} {
  const commissionAmount = baseAmount * (percentage / 100);
  const vatAmount = calculateVAT(commissionAmount);
  
  return {
    baseAmount,
    commissionAmount,
    vatAmount,
    totalAmount: commissionAmount + vatAmount,
  };
}

// ─────────────────────────────────────────────────────────────────
// Search Utilities
// ─────────────────────────────────────────────────────────────────

/**
 * تطبيع النص العربي للبحث
 * يزيل التشكيل ويوحّد الألف والياء والتاء المربوطة
 */
export function normalizeArabicForSearch(text: string): string {
  return text
    .replace(/[أإآا]/g, 'ا')
    .replace(/[ئي]/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[ًٍٍَُِّْ~]/g, '') // إزالة التشكيل
    .toLowerCase();
}

/**
 * بحث في النص العربي
 */
export function searchArabic(text: string, query: string): boolean {
  const normalizedText = normalizeArabicForSearch(text);
  const normalizedQuery = normalizeArabicForSearch(query);
  return normalizedText.includes(normalizedQuery);
}
