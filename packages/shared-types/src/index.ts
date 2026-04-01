// ═══════════════════════════════════════════════════════════════
// Shared Types - نظام تشغيل المكتب العقاري المصري
// ═══════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────

export enum UserRole {
  OWNER = 'OWNER',
  GENERAL_MANAGER = 'GENERAL_MANAGER',
  SALES_MANAGER = 'SALES_MANAGER',
  BROKER = 'BROKER',
  ACCOUNTANT = 'ACCOUNTANT',
  COMPLIANCE_OFFICER = 'COMPLIANCE_OFFICER',
  FIELD_AGENT = 'FIELD_AGENT',
  RECEPTIONIST = 'RECEPTIONIST',
  READ_ONLY = 'READ_ONLY',
}

export enum LeadStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  PROPERTY_PRESENTED = 'PROPERTY_PRESENTED',
  VIEWING_SCHEDULED = 'VIEWING_SCHEDULED',
  VIEWED = 'VIEWED',
  NEGOTIATING = 'NEGOTIATING',
  RESERVED = 'RESERVED',
  CONTRACT_SENT = 'CONTRACT_SENT',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  CLOSED_WON = 'CLOSED_WON',
  CLOSED_LOST = 'CLOSED_LOST',
}

// Lead Stages Array for iteration
export const LEAD_STAGES: LeadStage[] = [
  LeadStage.NEW,
  LeadStage.CONTACTED,
  LeadStage.QUALIFIED,
  LeadStage.PROPERTY_PRESENTED,
  LeadStage.VIEWING_SCHEDULED,
  LeadStage.VIEWED,
  LeadStage.NEGOTIATING,
  LeadStage.RESERVED,
  LeadStage.CONTRACT_SENT,
  LeadStage.CONTRACT_SIGNED,
  LeadStage.CLOSED_WON,
  LeadStage.CLOSED_LOST,
];

// Lead Stage Names in Arabic
export const LEAD_STAGE_NAMES_AR: Record<LeadStage, string> = {
  [LeadStage.NEW]: 'جديد',
  [LeadStage.CONTACTED]: 'تم التواصل',
  [LeadStage.QUALIFIED]: 'مؤهل',
  [LeadStage.PROPERTY_PRESENTED]: 'تم عرض عقار',
  [LeadStage.VIEWING_SCHEDULED]: 'معاينة مجدولة',
  [LeadStage.VIEWED]: 'تمت المعاينة',
  [LeadStage.NEGOTIATING]: 'في التفاوض',
  [LeadStage.RESERVED]: 'محجوز',
  [LeadStage.CONTRACT_SENT]: 'تم إرسال العقد',
  [LeadStage.CONTRACT_SIGNED]: 'تم توقيع العقد',
  [LeadStage.CLOSED_WON]: 'مغلق (نجاح)',
  [LeadStage.CLOSED_LOST]: 'مغلق (فقدان)',
};

export enum DealStage {
  LEAD = 'LEAD',
  VIEWING = 'VIEWING',
  NEGOTIATION = 'NEGOTIATION',
  RESERVATION = 'RESERVATION',
  CONTRACT_PREPARATION = 'CONTRACT_PREPARATION',
  CONTRACT_SIGNED = 'CONTRACT_SIGNED',
  PAYMENT_ACTIVE = 'PAYMENT_ACTIVE',
  HANDOVER_PENDING = 'HANDOVER_PENDING',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

// Deal Stages Array for iteration
export const DEAL_STAGES: DealStage[] = [
  DealStage.LEAD,
  DealStage.VIEWING,
  DealStage.NEGOTIATION,
  DealStage.RESERVATION,
  DealStage.CONTRACT_PREPARATION,
  DealStage.CONTRACT_SIGNED,
  DealStage.PAYMENT_ACTIVE,
  DealStage.HANDOVER_PENDING,
  DealStage.CLOSED,
];

// Deal Stage Names in Arabic
export const DEAL_STAGE_NAMES_AR: Record<DealStage, string> = {
  [DealStage.LEAD]: 'عميل محتمل',
  [DealStage.VIEWING]: 'معاينة',
  [DealStage.NEGOTIATION]: 'تفاوض',
  [DealStage.RESERVATION]: 'حجز',
  [DealStage.CONTRACT_PREPARATION]: 'إعداد العقد',
  [DealStage.CONTRACT_SIGNED]: 'تم توقيع العقد',
  [DealStage.PAYMENT_ACTIVE]: 'سداد نشط',
  [DealStage.HANDOVER_PENDING]: 'في انتظار التسليم',
  [DealStage.CLOSED]: 'مغلق',
  [DealStage.CANCELLED]: 'ملغي',
};

// Deal Types
export const DEAL_TYPES = ['sale', 'rent', 'management'] as const;
export type DealType = typeof DEAL_TYPES[number];

// Deal Type Names in Arabic
export const DEAL_TYPE_NAMES_AR: Record<DealType, string> = {
  sale: 'بيع',
  rent: 'إيجار',
  management: 'إدارة',
};

export enum PropertyStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED_TEMP = 'RESERVED_TEMP',
  RESERVED_CONFIRMED = 'RESERVED_CONFIRMED',
  SOLD = 'SOLD',
  RENTED = 'RENTED',
  SUSPENDED = 'SUSPENDED',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
}

export enum PropertyType {
  APARTMENT = 'APARTMENT',
  VILLA = 'VILLA',
  DUPLEX = 'DUPLEX',
  PENTHOUSE = 'PENTHOUSE',
  STUDIO = 'STUDIO',
  OFFICE = 'OFFICE',
  SHOP = 'SHOP',
  WAREHOUSE = 'WAREHOUSE',
  LAND = 'LAND',
  COMPOUND_UNIT = 'COMPOUND_UNIT',
}

export enum FinishingType {
  FULLY_FINISHED = 'FULLY_FINISHED',
  SEMI_FINISHED = 'SEMI_FINISHED',
  CORE_SHELL = 'CORE_SHELL',
  ULTRA_LUXURY = 'ULTRA_LUXURY',
}

export enum DocumentStatus {
  PENDING_REVIEW = 'PENDING_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum CommissionStatus {
  CALCULATED = 'CALCULATED',
  APPROVED = 'APPROVED',
  SETTLED = 'SETTLED',
  PAID = 'PAID',
  DISPUTED = 'DISPUTED',
}

export enum PaymentMethod {
  CASH = 'CASH',
  CHECK = 'CHECK',
  BANK_TRANSFER = 'BANK_TRANSFER',
  INSTAPAY = 'INSTAPAY',
  FAWRY = 'FAWRY',
  PAYMOB_CARD = 'PAYMOB_CARD',
  PAYMOB_WALLET = 'PAYMOB_WALLET',
  PAYMOB_BNPL = 'PAYMOB_BNPL',
}

export enum ETAReceiptStatus {
  PENDING = 'PENDING',
  VALID = 'VALID',
  INVALID = 'INVALID',
  CANCELLED = 'CANCELLED',
  QUEUED_FOR_RETRY = 'QUEUED_FOR_RETRY',
}

export enum POSDeviceStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  RETIRED = 'RETIRED',
  SUSPENDED = 'SUSPENDED',
}

// ─────────────────────────────────────────────────────────────────
// API Response Types
// ─────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
  traceId: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    messageAr: string;
    details?: FieldError[];
    traceId: string;
  };
}

export interface FieldError {
  field: string;
  message: string;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Entity Types (Base)
// ─────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  organizationId: string;
  branchId?: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  role: UserRole;
  permissions: string[];
  avatarUrl?: string;
  brokerLicenseNo?: string;
  brokerLicenseExp?: Date;
  brokerClassification?: string;
  isMfaEnabled: boolean;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Client {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  firstNameAr?: string;
  lastNameAr?: string;
  phone: string;
  phone2?: string;
  email?: string;
  nationalId?: string;
  nationality: string;
  clientType: 'individual' | 'company';
  companyName?: string;
  taxId?: string;
  source?: string;
  tags: string[];
  notes?: string;
  isVip: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  organizationId: string;
  clientId?: string;
  assignedToId?: string;
  stage: LeadStage;
  source?: string;
  budget?: number;
  budgetCurrency: string;
  preferredAreas: string[];
  propertyTypes: PropertyType[];
  minSize?: number;
  maxSize?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  notes?: string;
  aiScore?: number;
  aiScoreDetails?: Record<string, unknown>;
  expectedCloseDate?: Date;
  lostReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Property {
  id: string;
  organizationId: string;
  branchId?: string;
  projectId?: string;
  developerId?: string;
  title: string;
  titleAr?: string;
  description?: string;
  propertyType: PropertyType;
  finishingType?: FinishingType;
  status: PropertyStatus;
  city: string;
  district?: string;
  address?: string;
  floor?: number;
  unitNumber?: string;
  areaM2: number;
  bedrooms?: number;
  bathrooms?: number;
  parking?: number;
  askingPrice: number;
  currency: string;
  isListed: boolean;
  isOffPlan: boolean;
  commissionRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  organizationId: string;
  branchId?: string;
  leadId?: string;
  clientId?: string;
  propertyId?: string;
  assignedBrokerId?: string;
  cobrokerUserId?: string;
  externalBroker?: string;
  stage: DealStage;
  dealType: 'sale' | 'rent' | 'management';
  agreedPrice?: number;
  currency: string;
  notes?: string;
  closedAt?: Date;
  closedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Commission {
  id: string;
  organizationId: string;
  dealId: string;
  userId?: string;
  commissionType: 'broker' | 'manager' | 'company' | 'external';
  baseAmount: number;
  percentage?: number;
  amount: number;
  vatAmount: number;
  totalAmount: number;
  currency: string;
  status: CommissionStatus;
  isLocked: boolean;
  lockedAt?: Date;
  lockedById?: string;
  settledAt?: Date;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  organizationId: string;
  installmentId?: string;
  dealId?: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded';
  checkNumber?: string;
  bankName?: string;
  transactionRef?: string;
  gatewayRef?: string;
  paidAt?: Date;
  dueDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─────────────────────────────────────────────────────────────────
// ETA Types
// ─────────────────────────────────────────────────────────────────

export interface ETAReceiptPayload {
  header: {
    uuid: string;
    submissionUUID?: string;
    previousUUID?: string;
    referenceOldUUID?: string;
    longId?: string;
    internalID: string;
    taxpayerActivityCode: string;
    branchID: string;
    taxpayerRIN: string;
  };
  documentType: string;
  documentTypeVersion: string;
  issuanceDateTime: string;
  issuer: {
    id: string;
    name: string;
    type: 'P' | 'B';
    branchID: string;
  };
  receiver: {
    id?: string;
    name?: string;
    type: 'P' | 'B';
  };
  documentPurpose: 'receipt' | 'return';
  currencyExchangeRate?: number;
  currency?: string;
  totalAmount: number;
  totalDiscountAmount?: number;
  netAmount: number;
  taxTotals: {
    taxType: string;
    amount: number;
  }[];
  lines: ETAReceiptLine[];
}

export interface ETAReceiptLine {
  description: string;
  itemCode?: string;
  unitType: string;
  quantity: number;
  internalCode?: string;
  salesTotal: number;
  currency?: string;
  currencyExchangeRate?: number;
  discount?: {
    amount: number;
    rate?: number;
  };
  taxableItems: {
    taxType: string;
    amount: number;
    rate?: number;
    subType?: string;
  }[];
  netTotal: number;
  total: number;
  valueDifference?: number;
  taxableFees?: {
    taxType: string;
    amount: number;
  }[];
}

export interface ETAReceiptResponse {
  submissionUUID: string;
  acceptedDocuments: {
    uuid: string;
    longId: string;
    receiptNumber: string;
  }[];
  rejectedDocuments: {
    receiptNumber: string;
    uuid: string;
    error: {
      message: string;
      target?: string;
      propertyPath?: string;
    };
  }[];
}

// ─────────────────────────────────────────────────────────────────
// Domain Events
// ─────────────────────────────────────────────────────────────────

export type DomainEventType =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'lead.assigned'
  | 'property.locked'
  | 'property.unlocked'
  | 'reservation.created'
  | 'reservation.cancelled'
  | 'contract.signed'
  | 'payment.received'
  | 'payment.overdue'
  | 'commission.calculated'
  | 'commission.approved'
  | 'document.uploaded'
  | 'document.ocr_completed'
  | 'compliance.alert'
  | 'eta.receipt.submitted'
  | 'eta.receipt.validated';

export interface DomainEvent {
  type: DomainEventType;
  entityId: string;
  entityType: string;
  data: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

// ─────────────────────────────────────────────────────────────────
// Permissions
// ─────────────────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Dashboard
  DASHBOARD_VIEW: 'dashboard:view',

  // Leads
  LEADS_READ: 'leads:read',
  LEADS_WRITE: 'leads:write',
  LEADS_DELETE: 'leads:delete',
  LEADS_ASSIGN: 'leads:assign',
  
  // Properties
  PROPERTIES_READ: 'properties:read',
  PROPERTIES_WRITE: 'properties:write',
  PROPERTIES_DELETE: 'properties:delete',
  PROPERTIES_LOCK: 'properties:lock',
  
  // Clients
  CLIENTS_READ: 'clients:read',
  CLIENTS_WRITE: 'clients:write',
  CLIENTS_DELETE: 'clients:delete',
  
  // Deals
  DEALS_READ: 'deals:read',
  DEALS_WRITE: 'deals:write',
  DEALS_DELETE: 'deals:delete',
  
  // Payments
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_WRITE: 'payments:write',
  
  // Commissions
  COMMISSIONS_READ: 'commissions:read',
  COMMISSIONS_APPROVE: 'commissions:approve',
  COMMISSIONS_SETTLE: 'commissions:settle',
  COMMISSIONS_PAY: 'commissions:pay',
  
  // Finance
  FINANCE_READ: 'finance:read',
  FINANCE_WRITE: 'finance:write',
  
  // ETA
  ETA_VIEW: 'eta:view',
  ETA_READ: 'eta:read',
  ETA_CREATE: 'eta:create',
  ETA_MANAGE: 'eta:manage',
  
  // Compliance
  COMPLIANCE_READ: 'compliance:read',
  COMPLIANCE_WRITE: 'compliance:write',
  
  // Users
  USERS_READ: 'users:read',
  USERS_WRITE: 'users:write',
  USERS_DELETE: 'users:delete',
  
  // Organization
  ORG_SETTINGS_READ: 'organization:settings:read',
  ORG_SETTINGS_WRITE: 'organization:settings:write',
  
  // Integrations Settings (AI, Payments, etc.)
  INTEGRATIONS_READ: 'integrations:read',
  INTEGRATIONS_WRITE: 'integrations:write',
  
  // Audit
  AUDIT_READ: 'audit:read',
  
  // AI
  AI_USE: 'ai:use',
  AI_CONFIG: 'ai:config',
  
  // Automation
  AUTOMATION_READ: 'automation:read',
  AUTOMATION_WRITE: 'automation:write',
  
  // Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_WRITE: 'documents:write',

  // POS Devices
  POS_VIEW: 'pos:view',
  POS_MANAGE: 'pos:manage',

  // Branches
  BRANCHES_READ: 'branches:read',
  BRANCHES_WRITE: 'branches:write',
  BRANCHES_DELETE: 'branches:delete',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

// ─────────────────────────────────────────────────────────────────
// Role Permissions Mapping
// ─────────────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  [UserRole.OWNER]: Object.values(PERMISSIONS) as readonly Permission[],
  [UserRole.GENERAL_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.PROPERTIES_LOCK,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.COMMISSIONS_APPROVE,
    PERMISSIONS.COMMISSIONS_SETTLE,
    PERMISSIONS.COMMISSIONS_PAY,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ETA_VIEW,
    PERMISSIONS.ETA_READ,
    PERMISSIONS.ETA_CREATE,
    PERMISSIONS.ETA_MANAGE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.USERS_READ,
    PERMISSIONS.USERS_WRITE,
    PERMISSIONS.ORG_SETTINGS_READ,
    PERMISSIONS.INTEGRATIONS_READ,
    PERMISSIONS.INTEGRATIONS_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.AI_USE,
    PERMISSIONS.AI_CONFIG,
    PERMISSIONS.AUTOMATION_READ,
    PERMISSIONS.AUTOMATION_WRITE,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_MANAGE,
    PERMISSIONS.BRANCHES_READ,
    PERMISSIONS.BRANCHES_WRITE,
    PERMISSIONS.BRANCHES_DELETE,
  ] as const,
  [UserRole.SALES_MANAGER]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.LEADS_ASSIGN,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.PROPERTIES_WRITE,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.AI_USE,
  ] as const,
  [UserRole.BROKER]: [
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.DEALS_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.AI_USE,
  ] as const,
  [UserRole.ACCOUNTANT]: [
    PERMISSIONS.DASHBOARD_VIEW,
    PERMISSIONS.PAYMENTS_READ,
    PERMISSIONS.PAYMENTS_WRITE,
    PERMISSIONS.COMMISSIONS_READ,
    PERMISSIONS.COMMISSIONS_APPROVE,
    PERMISSIONS.COMMISSIONS_SETTLE,
    PERMISSIONS.COMMISSIONS_PAY,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.FINANCE_WRITE,
    PERMISSIONS.ETA_VIEW,
    PERMISSIONS.ETA_READ,
    PERMISSIONS.ETA_CREATE,
    PERMISSIONS.ETA_MANAGE,
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.POS_VIEW,
    PERMISSIONS.POS_MANAGE,
    PERMISSIONS.BRANCHES_READ,
  ] as const,
  [UserRole.COMPLIANCE_OFFICER]: [
    PERMISSIONS.COMPLIANCE_READ,
    PERMISSIONS.COMPLIANCE_WRITE,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.DOCUMENTS_READ,
    PERMISSIONS.DOCUMENTS_WRITE,
    PERMISSIONS.USERS_READ,
  ] as const,
  [UserRole.FIELD_AGENT]: [
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.AI_USE,
  ] as const,
  [UserRole.RECEPTIONIST]: [
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.CLIENTS_WRITE,
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.LEADS_WRITE,
  ] as const,
  [UserRole.READ_ONLY]: [
    PERMISSIONS.LEADS_READ,
    PERMISSIONS.PROPERTIES_READ,
    PERMISSIONS.CLIENTS_READ,
    PERMISSIONS.DEALS_READ,
    PERMISSIONS.BRANCHES_READ,
  ] as const,
};
