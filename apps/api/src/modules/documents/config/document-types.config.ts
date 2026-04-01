// ═══════════════════════════════════════════════════════════════
// Document Types Configuration - نظام تشغيل المكتب العقاري المصري
// Phase 5.01 — Document Vault + OCR
// ═══════════════════════════════════════════════════════════════

import { DocumentType } from '../dto/documents.dto';

/**
 * حقول OCR المطلوبة لكل نوع مستند
 */
export interface OCRFieldConfig {
  field: string;
  label: string;
  labelAr: string;
  required: boolean;
  type: 'text' | 'date' | 'number' | 'select';
  options?: string[];
  encrypted?: boolean; // للبيانات الحساسة مثل الرقم القومي
}

/**
 * تكوين نوع المستند
 */
export interface DocumentTypeConfig {
  type: DocumentType;
  name: string;
  nameAr: string;
  description: string;
  descriptionAr: string;
  category: 'identity' | 'property' | 'business' | 'contract' | 'financial' | 'other';
  allowedMimeTypes: string[];
  maxSizeBytes: number;
  retentionDays: number; // فترة الاحتفاظ بالأيام
  requiresExpiryDate: boolean;
  requiresVerification: boolean;
  ocrEnabled: boolean;
  ocrPrompt?: string; // Prompt مخصص للـ OCR
  ocrFields: OCRFieldConfig[];
}

/**
 * تكوين جميع أنواع المستندات
 */
export const DOCUMENT_TYPES_CONFIG: Record<DocumentType, DocumentTypeConfig> = {
  // ═══════════════════════════════════════════════════════════════
  // المستندات الشخصية (Identity Documents)
  // ═══════════════════════════════════════════════════════════════
  [DocumentType.NATIONAL_ID]: {
    type: DocumentType.NATIONAL_ID,
    name: 'National ID Card',
    nameAr: 'بطاقة الرقم القومي',
    description: 'Egyptian National ID Card (Front and Back)',
    descriptionAr: 'بطاقة الرقم القومي المصرية (الوجه الأمامي والخلفي)',
    category: 'identity',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    retentionDays: 365 * 7, // 7 سنوات
    requiresExpiryDate: true,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من بطاقات الرقم القومي المصرية.
استخرج البيانات التالية من الصورة:
- الرقم القومي (14 رقم)
- الاسم بالعربية
- الاسم بالإنجليزية
- تاريخ الميلاد
- العنوان
- تاريخ الإصدار
- تاريخ الانتهاء
- النوع (ذكر/أنثى)
- الوظيفة

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'nationalId', label: 'National ID', labelAr: 'الرقم القومي', required: true, type: 'text', encrypted: true },
      { field: 'fullNameAr', label: 'Full Name (Arabic)', labelAr: 'الاسم بالعربية', required: true, type: 'text' },
      { field: 'fullNameEn', label: 'Full Name (English)', labelAr: 'الاسم بالإنجليزية', required: false, type: 'text' },
      { field: 'birthDate', label: 'Birth Date', labelAr: 'تاريخ الميلاد', required: true, type: 'date' },
      { field: 'address', label: 'Address', labelAr: 'العنوان', required: true, type: 'text' },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', required: true, type: 'date' },
      { field: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', required: true, type: 'date' },
      { field: 'gender', label: 'Gender', labelAr: 'النوع', required: true, type: 'select', options: ['male', 'female'] },
      { field: 'jobTitle', label: 'Job Title', labelAr: 'الوظيفة', required: false, type: 'text' },
    ],
  },

  [DocumentType.PASSPORT]: {
    type: DocumentType.PASSPORT,
    name: 'Passport',
    nameAr: 'جواز السفر',
    description: 'Valid Passport',
    descriptionAr: 'جواز سفر ساري',
    category: 'identity',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 5,
    requiresExpiryDate: true,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من جوازات السفر.
استخرج البيانات التالية من الصورة:
- رقم جواز السفر
- الاسم الكامل
- الجنسية
- تاريخ الميلاد
- تاريخ الإصدار
- تاريخ الانتهاء
- مكان الإصدار

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'passportNumber', label: 'Passport Number', labelAr: 'رقم جواز السفر', required: true, type: 'text' },
      { field: 'fullName', label: 'Full Name', labelAr: 'الاسم الكامل', required: true, type: 'text' },
      { field: 'nationality', label: 'Nationality', labelAr: 'الجنسية', required: true, type: 'text' },
      { field: 'birthDate', label: 'Birth Date', labelAr: 'تاريخ الميلاد', required: true, type: 'date' },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', required: true, type: 'date' },
      { field: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', required: true, type: 'date' },
      { field: 'placeOfIssue', label: 'Place of Issue', labelAr: 'مكان الإصدار', required: false, type: 'text' },
    ],
  },

  [DocumentType.DRIVER_LICENSE]: {
    type: DocumentType.DRIVER_LICENSE,
    name: 'Driver License',
    nameAr: 'رخصة القيادة',
    description: 'Valid Driver License',
    descriptionAr: 'رخصة قيادة سارية',
    category: 'identity',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 5,
    requiresExpiryDate: true,
    requiresVerification: false,
    ocrEnabled: true,
    ocrFields: [
      { field: 'licenseNumber', label: 'License Number', labelAr: 'رقم الرخصة', required: true, type: 'text' },
      { field: 'fullName', label: 'Full Name', labelAr: 'الاسم الكامل', required: true, type: 'text' },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', required: true, type: 'date' },
      { field: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', required: true, type: 'date' },
      { field: 'licenseType', label: 'License Type', labelAr: 'نوع الرخصة', required: false, type: 'text' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // مستندات الأعمال (Business Documents)
  // ═══════════════════════════════════════════════════════════════
  [DocumentType.BROKER_LICENSE]: {
    type: DocumentType.BROKER_LICENSE,
    name: 'Broker License',
    nameAr: 'رخصة السمسرة',
    description: 'Real Estate Broker License (Law 578/2025)',
    descriptionAr: 'رخصة مزاولة مهنة السمسرة العقارية (قانون 578/2025)',
    category: 'business',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 10,
    requiresExpiryDate: true,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من رخص السمسرة العقارية المصرية.
استخرج البيانات التالية من الصورة:
- رقم الترخيص
- اسم السمسري
- التصنيف (أ/ب/ج)
- تاريخ الإصدار
- تاريخ الانتهاء
- الجهة المصدرة

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'licenseNumber', label: 'License Number', labelAr: 'رقم الترخيص', required: true, type: 'text' },
      { field: 'brokerName', label: 'Broker Name', labelAr: 'اسم السمسري', required: true, type: 'text' },
      { field: 'classification', label: 'Classification', labelAr: 'التصنيف', required: true, type: 'select', options: ['A', 'B', 'C'] },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', required: true, type: 'date' },
      { field: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', required: true, type: 'date' },
      { field: 'issuingAuthority', label: 'Issuing Authority', labelAr: 'الجهة المصدرة', required: false, type: 'text' },
    ],
  },

  [DocumentType.COMMERCIAL_REG]: {
    type: DocumentType.COMMERCIAL_REG,
    name: 'Commercial Registration',
    nameAr: 'السجل التجاري',
    description: 'Commercial Registration Certificate',
    descriptionAr: 'شهادة السجل التجاري',
    category: 'business',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 10,
    requiresExpiryDate: true,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من السجلات التجارية المصرية.
استخرج البيانات التالية من الصورة:
- رقم السجل التجاري
- اسم الشركة
- نوع الشركة
- رأس المال
- المقر الرئيسي
- تاريخ التسجيل
- تاريخ الانتهاء
- النشاط التجاري

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'regNumber', label: 'Registration Number', labelAr: 'رقم السجل', required: true, type: 'text' },
      { field: 'companyName', label: 'Company Name', labelAr: 'اسم الشركة', required: true, type: 'text' },
      { field: 'companyType', label: 'Company Type', labelAr: 'نوع الشركة', required: true, type: 'text' },
      { field: 'capital', label: 'Capital', labelAr: 'رأس المال', required: false, type: 'number' },
      { field: 'headquarters', label: 'Headquarters', labelAr: 'المقر الرئيسي', required: false, type: 'text' },
      { field: 'registrationDate', label: 'Registration Date', labelAr: 'تاريخ التسجيل', required: true, type: 'date' },
      { field: 'expiryDate', label: 'Expiry Date', labelAr: 'تاريخ الانتهاء', required: true, type: 'date' },
      { field: 'businessActivity', label: 'Business Activity', labelAr: 'النشاط التجاري', required: false, type: 'text' },
    ],
  },

  [DocumentType.TAX_ID]: {
    type: DocumentType.TAX_ID,
    name: 'Tax ID Card',
    nameAr: 'البطاقة الضريبية',
    description: 'Tax Registration Card (RIN)',
    descriptionAr: 'بطاقة التسجيل الضريبي',
    category: 'business',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 10,
    requiresExpiryDate: false,
    requiresVerification: true,
    ocrEnabled: true,
    ocrFields: [
      { field: 'taxId', label: 'Tax ID', labelAr: 'الرقم الضريبي', required: true, type: 'text' },
      { field: 'taxpayerName', label: 'Taxpayer Name', labelAr: 'اسم المكلف', required: true, type: 'text' },
      { field: 'taxOffice', label: 'Tax Office', labelAr: 'مأمورية الضرائب', required: false, type: 'text' },
      { field: 'issueDate', label: 'Issue Date', labelAr: 'تاريخ الإصدار', required: false, type: 'date' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // العقود (Contracts)
  // ═══════════════════════════════════════════════════════════════
  [DocumentType.CONTRACT]: {
    type: DocumentType.CONTRACT,
    name: 'Contract',
    nameAr: 'عقد',
    description: 'Sale or Rent Contract',
    descriptionAr: 'عقد بيع أو إيجار',
    category: 'contract',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 20 * 1024 * 1024, // 20 MB
    retentionDays: 365 * 15, // 15 سنة
    requiresExpiryDate: false,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من العقود العقارية المصرية.
استخرج البيانات التالية من العقد:
- رقم العقد
- تاريخ العقد
- أطراف العقد (البائع/المؤجر والمشتري/المستأجر)
- وصف العقار
- السعر/الإيجار
- طريقة الدفع
- مدة العقد (للإيجار)
- شروط خاصة

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'contractNumber', label: 'Contract Number', labelAr: 'رقم العقد', required: false, type: 'text' },
      { field: 'contractDate', label: 'Contract Date', labelAr: 'تاريخ العقد', required: true, type: 'date' },
      { field: 'contractType', label: 'Contract Type', labelAr: 'نوع العقد', required: true, type: 'select', options: ['sale', 'rent'] },
      { field: 'firstParty', label: 'First Party', labelAr: 'الطرف الأول', required: true, type: 'text' },
      { field: 'secondParty', label: 'Second Party', labelAr: 'الطرف الثاني', required: true, type: 'text' },
      { field: 'propertyDescription', label: 'Property Description', labelAr: 'وصف العقار', required: true, type: 'text' },
      { field: 'price', label: 'Price/Rent', labelAr: 'السعر/الإيجار', required: true, type: 'number' },
      { field: 'duration', label: 'Duration', labelAr: 'المدة', required: false, type: 'text' },
    ],
  },

  [DocumentType.RESERVATION]: {
    type: DocumentType.RESERVATION,
    name: 'Reservation Agreement',
    nameAr: 'محضر حجز',
    description: 'Property Reservation Agreement',
    descriptionAr: 'محضر حجز وحدة عقارية',
    category: 'contract',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 5,
    requiresExpiryDate: false,
    requiresVerification: true,
    ocrEnabled: false,
    ocrFields: [],
  },

  [DocumentType.PROPERTY_DEED]: {
    type: DocumentType.PROPERTY_DEED,
    name: 'Property Deed',
    nameAr: 'عقد ملكية العقار',
    description: 'Property Ownership Deed',
    descriptionAr: 'عقد ملكية العقار',
    category: 'property',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 20 * 1024 * 1024,
    retentionDays: 365 * 15,
    requiresExpiryDate: false,
    requiresVerification: true,
    ocrEnabled: true,
    ocrPrompt: `أنت نظام OCR متخصص في استخراج البيانات من عقود الملكية العقارية المصرية.
استخرج البيانات التالية:
- رقم العقد
- تاريخ العقد
- نوع العقد (ابتدائي/نهائي)
- أطراف العقد
- وصف العقار
- المساحة
- رقم الشهر العقاري

أرجع البيانات بتنسيق JSON.`,
    ocrFields: [
      { field: 'deedNumber', label: 'Deed Number', labelAr: 'رقم العقد', required: true, type: 'text' },
      { field: 'deedDate', label: 'Deed Date', labelAr: 'تاريخ العقد', required: true, type: 'date' },
      { field: 'deedType', label: 'Deed Type', labelAr: 'نوع العقد', required: true, type: 'select', options: ['preliminary', 'final'] },
      { field: 'ownerName', label: 'Owner Name', labelAr: 'اسم المالك', required: true, type: 'text' },
      { field: 'propertyDescription', label: 'Property Description', labelAr: 'وصف العقار', required: true, type: 'text' },
      { field: 'area', label: 'Area', labelAr: 'المساحة', required: false, type: 'number' },
      { field: 'registrationNumber', label: 'Registration Number', labelAr: 'رقم الشهر العقاري', required: false, type: 'text' },
    ],
  },

  [DocumentType.POWER_OF_ATTORNEY]: {
    type: DocumentType.POWER_OF_ATTORNEY,
    name: 'Power of Attorney',
    nameAr: 'توكيل',
    description: 'Legal Power of Attorney',
    descriptionAr: 'توكيل رسمي',
    category: 'contract',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 10,
    requiresExpiryDate: false,
    requiresVerification: true,
    ocrEnabled: true,
    ocrFields: [
      { field: 'attorneyNumber', label: 'Attorney Number', labelAr: 'رقم التوكيل', required: true, type: 'text' },
      { field: 'attorneyDate', label: 'Attorney Date', labelAr: 'تاريخ التوكيل', required: true, type: 'date' },
      { field: 'principal', label: 'Principal', labelAr: 'الموكل', required: true, type: 'text' },
      { field: 'agent', label: 'Agent', labelAr: 'الوكيل', required: true, type: 'text' },
      { field: 'scope', label: 'Scope', labelAr: 'نطاق التوكيل', required: true, type: 'text' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // المستندات المالية (Financial Documents)
  // ═══════════════════════════════════════════════════════════════
  [DocumentType.BANK_STATEMENT]: {
    type: DocumentType.BANK_STATEMENT,
    name: 'Bank Statement',
    nameAr: 'كشف حساب بنكي',
    description: 'Bank Account Statement',
    descriptionAr: 'كشف حساب بنكي',
    category: 'financial',
    allowedMimeTypes: ['application/pdf'],
    maxSizeBytes: 10 * 1024 * 1024,
    retentionDays: 365 * 5,
    requiresExpiryDate: false,
    requiresVerification: false,
    ocrEnabled: false,
    ocrFields: [],
  },

  [DocumentType.UTILITY_BILL]: {
    type: DocumentType.UTILITY_BILL,
    name: 'Utility Bill',
    nameAr: 'فاتورة مرافق',
    description: 'Utility Bill (Electricity, Water, Gas)',
    descriptionAr: 'فاتورة مرافق (كهرباء، ماء، غاز)',
    category: 'financial',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 5 * 1024 * 1024,
    retentionDays: 365 * 2,
    requiresExpiryDate: false,
    requiresVerification: false,
    ocrEnabled: false,
    ocrFields: [],
  },

  [DocumentType.OTHER]: {
    type: DocumentType.OTHER,
    name: 'Other Document',
    nameAr: 'مستند آخر',
    description: 'Other type of document',
    descriptionAr: 'نوع آخر من المستندات',
    category: 'other',
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    maxSizeBytes: 20 * 1024 * 1024,
    retentionDays: 365 * 5,
    requiresExpiryDate: false,
    requiresVerification: false,
    ocrEnabled: false,
    ocrFields: [],
  },
};

/**
 * أنواع المستندات حسب الفئة
 */
export const DOCUMENTS_BY_CATEGORY = {
  identity: [DocumentType.NATIONAL_ID, DocumentType.PASSPORT, DocumentType.DRIVER_LICENSE],
  business: [DocumentType.BROKER_LICENSE, DocumentType.COMMERCIAL_REG, DocumentType.TAX_ID],
  contract: [DocumentType.CONTRACT, DocumentType.RESERVATION, DocumentType.POWER_OF_ATTORNEY],
  property: [DocumentType.PROPERTY_DEED],
  financial: [DocumentType.BANK_STATEMENT, DocumentType.UTILITY_BILL],
  other: [DocumentType.OTHER],
};

/**
 * أنواع المستندات التي تدعم OCR
 */
export const OCR_ENABLED_DOCUMENT_TYPES: DocumentType[] = Object.values(DOCUMENT_TYPES_CONFIG)
  .filter((config) => config.ocrEnabled)
  .map((config) => config.type);

/**
 * أنواع المستندات التي تتطلب تاريخ انتهاء
 */
export const EXPIRY_REQUIRED_DOCUMENT_TYPES: DocumentType[] = Object.values(DOCUMENT_TYPES_CONFIG)
  .filter((config) => config.requiresExpiryDate)
  .map((config) => config.type);

/**
 * الحصول على تكوين نوع المستند
 */
export function getDocumentTypeConfig(type: DocumentType): DocumentTypeConfig | undefined {
  return DOCUMENT_TYPES_CONFIG[type];
}

/**
 * التحقق من صحة نوع الملف
 */
export function isMimeTypeAllowed(type: DocumentType, mimeType: string): boolean {
  const config = DOCUMENT_TYPES_CONFIG[type];
  if (!config) return false;
  return config.allowedMimeTypes.includes(mimeType);
}

/**
 * التحقق من حجم الملف
 */
export function isFileSizeValid(type: DocumentType, sizeBytes: number): boolean {
  const config = DOCUMENT_TYPES_CONFIG[type];
  if (!config) return false;
  return sizeBytes <= config.maxSizeBytes;
}

/**
 * الحصول على حقول OCR لنوع المستند
 */
export function getOCRFields(type: DocumentType): OCRFieldConfig[] {
  const config = DOCUMENT_TYPES_CONFIG[type];
  return config?.ocrFields || [];
}

/**
 * الحصول على prompt OCR لنوع المستند
 */
export function getOCRPrompt(type: DocumentType): string | undefined {
  const config = DOCUMENT_TYPES_CONFIG[type];
  return config?.ocrPrompt;
}
