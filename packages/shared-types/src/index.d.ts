export declare enum UserRole {
    OWNER = "OWNER",
    GENERAL_MANAGER = "GENERAL_MANAGER",
    SALES_MANAGER = "SALES_MANAGER",
    BROKER = "BROKER",
    ACCOUNTANT = "ACCOUNTANT",
    COMPLIANCE_OFFICER = "COMPLIANCE_OFFICER",
    FIELD_AGENT = "FIELD_AGENT",
    RECEPTIONIST = "RECEPTIONIST",
    READ_ONLY = "READ_ONLY"
}
export declare enum LeadStage {
    NEW = "NEW",
    CONTACTED = "CONTACTED",
    QUALIFIED = "QUALIFIED",
    PROPERTY_PRESENTED = "PROPERTY_PRESENTED",
    VIEWING_SCHEDULED = "VIEWING_SCHEDULED",
    VIEWED = "VIEWED",
    NEGOTIATING = "NEGOTIATING",
    RESERVED = "RESERVED",
    CONTRACT_SENT = "CONTRACT_SENT",
    CONTRACT_SIGNED = "CONTRACT_SIGNED",
    CLOSED_WON = "CLOSED_WON",
    CLOSED_LOST = "CLOSED_LOST"
}
export declare const LEAD_STAGES: LeadStage[];
export declare const LEAD_STAGE_NAMES_AR: Record<LeadStage, string>;
export declare enum DealStage {
    LEAD = "LEAD",
    VIEWING = "VIEWING",
    NEGOTIATION = "NEGOTIATION",
    RESERVATION = "RESERVATION",
    CONTRACT_PREPARATION = "CONTRACT_PREPARATION",
    CONTRACT_SIGNED = "CONTRACT_SIGNED",
    PAYMENT_ACTIVE = "PAYMENT_ACTIVE",
    HANDOVER_PENDING = "HANDOVER_PENDING",
    CLOSED = "CLOSED",
    CANCELLED = "CANCELLED"
}
export declare const DEAL_STAGES: DealStage[];
export declare const DEAL_STAGE_NAMES_AR: Record<DealStage, string>;
export declare const DEAL_TYPES: readonly ["sale", "rent", "management"];
export type DealType = typeof DEAL_TYPES[number];
export declare const DEAL_TYPE_NAMES_AR: Record<DealType, string>;
export declare enum PropertyStatus {
    AVAILABLE = "AVAILABLE",
    RESERVED_TEMP = "RESERVED_TEMP",
    RESERVED_CONFIRMED = "RESERVED_CONFIRMED",
    SOLD = "SOLD",
    RENTED = "RENTED",
    SUSPENDED = "SUSPENDED",
    UNDER_MAINTENANCE = "UNDER_MAINTENANCE"
}
export declare enum PropertyType {
    APARTMENT = "APARTMENT",
    VILLA = "VILLA",
    DUPLEX = "DUPLEX",
    PENTHOUSE = "PENTHOUSE",
    STUDIO = "STUDIO",
    OFFICE = "OFFICE",
    SHOP = "SHOP",
    WAREHOUSE = "WAREHOUSE",
    LAND = "LAND",
    COMPOUND_UNIT = "COMPOUND_UNIT"
}
export declare enum FinishingType {
    FULLY_FINISHED = "FULLY_FINISHED",
    SEMI_FINISHED = "SEMI_FINISHED",
    CORE_SHELL = "CORE_SHELL",
    ULTRA_LUXURY = "ULTRA_LUXURY"
}
export declare enum DocumentStatus {
    PENDING_REVIEW = "PENDING_REVIEW",
    VERIFIED = "VERIFIED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED"
}
export declare enum CommissionStatus {
    CALCULATED = "CALCULATED",
    APPROVED = "APPROVED",
    SETTLED = "SETTLED",
    PAID = "PAID",
    DISPUTED = "DISPUTED"
}
export declare enum PaymentMethod {
    CASH = "CASH",
    CHECK = "CHECK",
    BANK_TRANSFER = "BANK_TRANSFER",
    INSTAPAY = "INSTAPAY",
    FAWRY = "FAWRY",
    PAYMOB_CARD = "PAYMOB_CARD",
    PAYMOB_WALLET = "PAYMOB_WALLET",
    PAYMOB_BNPL = "PAYMOB_BNPL"
}
export declare enum ETAReceiptStatus {
    PENDING = "PENDING",
    VALID = "VALID",
    INVALID = "INVALID",
    CANCELLED = "CANCELLED",
    QUEUED_FOR_RETRY = "QUEUED_FOR_RETRY"
}
export declare enum POSDeviceStatus {
    ACTIVE = "ACTIVE",
    INACTIVE = "INACTIVE",
    RETIRED = "RETIRED",
    SUSPENDED = "SUSPENDED"
}
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
export type DomainEventType = 'lead.created' | 'lead.stage_changed' | 'lead.assigned' | 'property.locked' | 'property.unlocked' | 'reservation.created' | 'reservation.cancelled' | 'contract.signed' | 'payment.received' | 'payment.overdue' | 'commission.calculated' | 'commission.approved' | 'document.uploaded' | 'document.ocr_completed' | 'compliance.alert' | 'eta.receipt.submitted' | 'eta.receipt.validated';
export interface DomainEvent {
    type: DomainEventType;
    entityId: string;
    entityType: string;
    data: Record<string, unknown>;
    timestamp: Date;
    userId?: string;
}
export declare const PERMISSIONS: {
    readonly DASHBOARD_VIEW: "dashboard:view";
    readonly LEADS_READ: "leads:read";
    readonly LEADS_WRITE: "leads:write";
    readonly LEADS_DELETE: "leads:delete";
    readonly LEADS_ASSIGN: "leads:assign";
    readonly PROPERTIES_READ: "properties:read";
    readonly PROPERTIES_WRITE: "properties:write";
    readonly PROPERTIES_DELETE: "properties:delete";
    readonly PROPERTIES_LOCK: "properties:lock";
    readonly CLIENTS_READ: "clients:read";
    readonly CLIENTS_WRITE: "clients:write";
    readonly CLIENTS_DELETE: "clients:delete";
    readonly DEALS_READ: "deals:read";
    readonly DEALS_WRITE: "deals:write";
    readonly DEALS_DELETE: "deals:delete";
    readonly PAYMENTS_READ: "payments:read";
    readonly PAYMENTS_WRITE: "payments:write";
    readonly COMMISSIONS_READ: "commissions:read";
    readonly COMMISSIONS_APPROVE: "commissions:approve";
    readonly COMMISSIONS_SETTLE: "commissions:settle";
    readonly COMMISSIONS_PAY: "commissions:pay";
    readonly FINANCE_READ: "finance:read";
    readonly FINANCE_WRITE: "finance:write";
    readonly ETA_VIEW: "eta:view";
    readonly ETA_READ: "eta:read";
    readonly ETA_CREATE: "eta:create";
    readonly ETA_MANAGE: "eta:manage";
    readonly COMPLIANCE_READ: "compliance:read";
    readonly COMPLIANCE_WRITE: "compliance:write";
    readonly USERS_READ: "users:read";
    readonly USERS_WRITE: "users:write";
    readonly USERS_DELETE: "users:delete";
    readonly ORG_SETTINGS_READ: "organization:settings:read";
    readonly ORG_SETTINGS_WRITE: "organization:settings:write";
    readonly INTEGRATIONS_READ: "integrations:read";
    readonly INTEGRATIONS_WRITE: "integrations:write";
    readonly AUDIT_READ: "audit:read";
    readonly AI_USE: "ai:use";
    readonly AI_CONFIG: "ai:config";
    readonly AUTOMATION_READ: "automation:read";
    readonly AUTOMATION_WRITE: "automation:write";
    readonly DOCUMENTS_READ: "documents:read";
    readonly DOCUMENTS_WRITE: "documents:write";
    readonly POS_VIEW: "pos:view";
    readonly POS_MANAGE: "pos:manage";
    readonly BRANCHES_READ: "branches:read";
    readonly BRANCHES_WRITE: "branches:write";
    readonly BRANCHES_DELETE: "branches:delete";
};
export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
export declare const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]>;
