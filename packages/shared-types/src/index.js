"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.PERMISSIONS = exports.POSDeviceStatus = exports.ETAReceiptStatus = exports.PaymentMethod = exports.CommissionStatus = exports.DocumentStatus = exports.FinishingType = exports.PropertyType = exports.PropertyStatus = exports.DEAL_TYPE_NAMES_AR = exports.DEAL_TYPES = exports.DEAL_STAGE_NAMES_AR = exports.DEAL_STAGES = exports.DealStage = exports.LEAD_STAGE_NAMES_AR = exports.LEAD_STAGES = exports.LeadStage = exports.UserRole = void 0;
var UserRole;
(function (UserRole) {
    UserRole["OWNER"] = "OWNER";
    UserRole["GENERAL_MANAGER"] = "GENERAL_MANAGER";
    UserRole["SALES_MANAGER"] = "SALES_MANAGER";
    UserRole["BROKER"] = "BROKER";
    UserRole["ACCOUNTANT"] = "ACCOUNTANT";
    UserRole["COMPLIANCE_OFFICER"] = "COMPLIANCE_OFFICER";
    UserRole["FIELD_AGENT"] = "FIELD_AGENT";
    UserRole["RECEPTIONIST"] = "RECEPTIONIST";
    UserRole["READ_ONLY"] = "READ_ONLY";
})(UserRole || (exports.UserRole = UserRole = {}));
var LeadStage;
(function (LeadStage) {
    LeadStage["NEW"] = "NEW";
    LeadStage["CONTACTED"] = "CONTACTED";
    LeadStage["QUALIFIED"] = "QUALIFIED";
    LeadStage["PROPERTY_PRESENTED"] = "PROPERTY_PRESENTED";
    LeadStage["VIEWING_SCHEDULED"] = "VIEWING_SCHEDULED";
    LeadStage["VIEWED"] = "VIEWED";
    LeadStage["NEGOTIATING"] = "NEGOTIATING";
    LeadStage["RESERVED"] = "RESERVED";
    LeadStage["CONTRACT_SENT"] = "CONTRACT_SENT";
    LeadStage["CONTRACT_SIGNED"] = "CONTRACT_SIGNED";
    LeadStage["CLOSED_WON"] = "CLOSED_WON";
    LeadStage["CLOSED_LOST"] = "CLOSED_LOST";
})(LeadStage || (exports.LeadStage = LeadStage = {}));
exports.LEAD_STAGES = [
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
exports.LEAD_STAGE_NAMES_AR = {
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
var DealStage;
(function (DealStage) {
    DealStage["LEAD"] = "LEAD";
    DealStage["VIEWING"] = "VIEWING";
    DealStage["NEGOTIATION"] = "NEGOTIATION";
    DealStage["RESERVATION"] = "RESERVATION";
    DealStage["CONTRACT_PREPARATION"] = "CONTRACT_PREPARATION";
    DealStage["CONTRACT_SIGNED"] = "CONTRACT_SIGNED";
    DealStage["PAYMENT_ACTIVE"] = "PAYMENT_ACTIVE";
    DealStage["HANDOVER_PENDING"] = "HANDOVER_PENDING";
    DealStage["CLOSED"] = "CLOSED";
    DealStage["CANCELLED"] = "CANCELLED";
})(DealStage || (exports.DealStage = DealStage = {}));
exports.DEAL_STAGES = [
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
exports.DEAL_STAGE_NAMES_AR = {
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
exports.DEAL_TYPES = ['sale', 'rent', 'management'];
exports.DEAL_TYPE_NAMES_AR = {
    sale: 'بيع',
    rent: 'إيجار',
    management: 'إدارة',
};
var PropertyStatus;
(function (PropertyStatus) {
    PropertyStatus["AVAILABLE"] = "AVAILABLE";
    PropertyStatus["RESERVED_TEMP"] = "RESERVED_TEMP";
    PropertyStatus["RESERVED_CONFIRMED"] = "RESERVED_CONFIRMED";
    PropertyStatus["SOLD"] = "SOLD";
    PropertyStatus["RENTED"] = "RENTED";
    PropertyStatus["SUSPENDED"] = "SUSPENDED";
    PropertyStatus["UNDER_MAINTENANCE"] = "UNDER_MAINTENANCE";
})(PropertyStatus || (exports.PropertyStatus = PropertyStatus = {}));
var PropertyType;
(function (PropertyType) {
    PropertyType["APARTMENT"] = "APARTMENT";
    PropertyType["VILLA"] = "VILLA";
    PropertyType["DUPLEX"] = "DUPLEX";
    PropertyType["PENTHOUSE"] = "PENTHOUSE";
    PropertyType["STUDIO"] = "STUDIO";
    PropertyType["OFFICE"] = "OFFICE";
    PropertyType["SHOP"] = "SHOP";
    PropertyType["WAREHOUSE"] = "WAREHOUSE";
    PropertyType["LAND"] = "LAND";
    PropertyType["COMPOUND_UNIT"] = "COMPOUND_UNIT";
})(PropertyType || (exports.PropertyType = PropertyType = {}));
var FinishingType;
(function (FinishingType) {
    FinishingType["FULLY_FINISHED"] = "FULLY_FINISHED";
    FinishingType["SEMI_FINISHED"] = "SEMI_FINISHED";
    FinishingType["CORE_SHELL"] = "CORE_SHELL";
    FinishingType["ULTRA_LUXURY"] = "ULTRA_LUXURY";
})(FinishingType || (exports.FinishingType = FinishingType = {}));
var DocumentStatus;
(function (DocumentStatus) {
    DocumentStatus["PENDING_REVIEW"] = "PENDING_REVIEW";
    DocumentStatus["VERIFIED"] = "VERIFIED";
    DocumentStatus["REJECTED"] = "REJECTED";
    DocumentStatus["EXPIRED"] = "EXPIRED";
})(DocumentStatus || (exports.DocumentStatus = DocumentStatus = {}));
var CommissionStatus;
(function (CommissionStatus) {
    CommissionStatus["CALCULATED"] = "CALCULATED";
    CommissionStatus["APPROVED"] = "APPROVED";
    CommissionStatus["SETTLED"] = "SETTLED";
    CommissionStatus["PAID"] = "PAID";
    CommissionStatus["DISPUTED"] = "DISPUTED";
})(CommissionStatus || (exports.CommissionStatus = CommissionStatus = {}));
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "CASH";
    PaymentMethod["CHECK"] = "CHECK";
    PaymentMethod["BANK_TRANSFER"] = "BANK_TRANSFER";
    PaymentMethod["INSTAPAY"] = "INSTAPAY";
    PaymentMethod["FAWRY"] = "FAWRY";
    PaymentMethod["PAYMOB_CARD"] = "PAYMOB_CARD";
    PaymentMethod["PAYMOB_WALLET"] = "PAYMOB_WALLET";
    PaymentMethod["PAYMOB_BNPL"] = "PAYMOB_BNPL";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var ETAReceiptStatus;
(function (ETAReceiptStatus) {
    ETAReceiptStatus["PENDING"] = "PENDING";
    ETAReceiptStatus["VALID"] = "VALID";
    ETAReceiptStatus["INVALID"] = "INVALID";
    ETAReceiptStatus["CANCELLED"] = "CANCELLED";
    ETAReceiptStatus["QUEUED_FOR_RETRY"] = "QUEUED_FOR_RETRY";
})(ETAReceiptStatus || (exports.ETAReceiptStatus = ETAReceiptStatus = {}));
var POSDeviceStatus;
(function (POSDeviceStatus) {
    POSDeviceStatus["ACTIVE"] = "ACTIVE";
    POSDeviceStatus["INACTIVE"] = "INACTIVE";
    POSDeviceStatus["RETIRED"] = "RETIRED";
    POSDeviceStatus["SUSPENDED"] = "SUSPENDED";
})(POSDeviceStatus || (exports.POSDeviceStatus = POSDeviceStatus = {}));
exports.PERMISSIONS = {
    DASHBOARD_VIEW: 'dashboard:view',
    LEADS_READ: 'leads:read',
    LEADS_WRITE: 'leads:write',
    LEADS_DELETE: 'leads:delete',
    LEADS_ASSIGN: 'leads:assign',
    PROPERTIES_READ: 'properties:read',
    PROPERTIES_WRITE: 'properties:write',
    PROPERTIES_DELETE: 'properties:delete',
    PROPERTIES_LOCK: 'properties:lock',
    CLIENTS_READ: 'clients:read',
    CLIENTS_WRITE: 'clients:write',
    CLIENTS_DELETE: 'clients:delete',
    DEALS_READ: 'deals:read',
    DEALS_WRITE: 'deals:write',
    DEALS_DELETE: 'deals:delete',
    PAYMENTS_READ: 'payments:read',
    PAYMENTS_WRITE: 'payments:write',
    COMMISSIONS_READ: 'commissions:read',
    COMMISSIONS_APPROVE: 'commissions:approve',
    COMMISSIONS_SETTLE: 'commissions:settle',
    COMMISSIONS_PAY: 'commissions:pay',
    FINANCE_READ: 'finance:read',
    FINANCE_WRITE: 'finance:write',
    ETA_VIEW: 'eta:view',
    ETA_READ: 'eta:read',
    ETA_CREATE: 'eta:create',
    ETA_MANAGE: 'eta:manage',
    COMPLIANCE_READ: 'compliance:read',
    COMPLIANCE_WRITE: 'compliance:write',
    USERS_READ: 'users:read',
    USERS_WRITE: 'users:write',
    USERS_DELETE: 'users:delete',
    ORG_SETTINGS_READ: 'organization:settings:read',
    ORG_SETTINGS_WRITE: 'organization:settings:write',
    INTEGRATIONS_READ: 'integrations:read',
    INTEGRATIONS_WRITE: 'integrations:write',
    AUDIT_READ: 'audit:read',
    AI_USE: 'ai:use',
    AI_CONFIG: 'ai:config',
    AUTOMATION_READ: 'automation:read',
    AUTOMATION_WRITE: 'automation:write',
    DOCUMENTS_READ: 'documents:read',
    DOCUMENTS_WRITE: 'documents:write',
    POS_VIEW: 'pos:view',
    POS_MANAGE: 'pos:manage',
    BRANCHES_READ: 'branches:read',
    BRANCHES_WRITE: 'branches:write',
    BRANCHES_DELETE: 'branches:delete',
};
exports.ROLE_PERMISSIONS = {
    [UserRole.OWNER]: Object.values(exports.PERMISSIONS),
    [UserRole.GENERAL_MANAGER]: [
        exports.PERMISSIONS.DASHBOARD_VIEW,
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.LEADS_WRITE,
        exports.PERMISSIONS.LEADS_ASSIGN,
        exports.PERMISSIONS.PROPERTIES_READ,
        exports.PERMISSIONS.PROPERTIES_WRITE,
        exports.PERMISSIONS.PROPERTIES_LOCK,
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.CLIENTS_WRITE,
        exports.PERMISSIONS.DEALS_READ,
        exports.PERMISSIONS.DEALS_WRITE,
        exports.PERMISSIONS.PAYMENTS_READ,
        exports.PERMISSIONS.PAYMENTS_WRITE,
        exports.PERMISSIONS.COMMISSIONS_READ,
        exports.PERMISSIONS.COMMISSIONS_APPROVE,
        exports.PERMISSIONS.COMMISSIONS_SETTLE,
        exports.PERMISSIONS.COMMISSIONS_PAY,
        exports.PERMISSIONS.FINANCE_READ,
        exports.PERMISSIONS.FINANCE_WRITE,
        exports.PERMISSIONS.ETA_VIEW,
        exports.PERMISSIONS.ETA_READ,
        exports.PERMISSIONS.ETA_CREATE,
        exports.PERMISSIONS.ETA_MANAGE,
        exports.PERMISSIONS.COMPLIANCE_READ,
        exports.PERMISSIONS.USERS_READ,
        exports.PERMISSIONS.USERS_WRITE,
        exports.PERMISSIONS.ORG_SETTINGS_READ,
        exports.PERMISSIONS.INTEGRATIONS_READ,
        exports.PERMISSIONS.INTEGRATIONS_WRITE,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.AI_USE,
        exports.PERMISSIONS.AI_CONFIG,
        exports.PERMISSIONS.AUTOMATION_READ,
        exports.PERMISSIONS.AUTOMATION_WRITE,
        exports.PERMISSIONS.POS_VIEW,
        exports.PERMISSIONS.POS_MANAGE,
        exports.PERMISSIONS.BRANCHES_READ,
        exports.PERMISSIONS.BRANCHES_WRITE,
        exports.PERMISSIONS.BRANCHES_DELETE,
    ],
    [UserRole.SALES_MANAGER]: [
        exports.PERMISSIONS.DASHBOARD_VIEW,
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.LEADS_WRITE,
        exports.PERMISSIONS.LEADS_ASSIGN,
        exports.PERMISSIONS.PROPERTIES_READ,
        exports.PERMISSIONS.PROPERTIES_WRITE,
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.CLIENTS_WRITE,
        exports.PERMISSIONS.DEALS_READ,
        exports.PERMISSIONS.DEALS_WRITE,
        exports.PERMISSIONS.COMMISSIONS_READ,
        exports.PERMISSIONS.AI_USE,
    ],
    [UserRole.BROKER]: [
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.LEADS_WRITE,
        exports.PERMISSIONS.PROPERTIES_READ,
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.CLIENTS_WRITE,
        exports.PERMISSIONS.DEALS_READ,
        exports.PERMISSIONS.DEALS_WRITE,
        exports.PERMISSIONS.COMMISSIONS_READ,
        exports.PERMISSIONS.AI_USE,
    ],
    [UserRole.ACCOUNTANT]: [
        exports.PERMISSIONS.DASHBOARD_VIEW,
        exports.PERMISSIONS.PAYMENTS_READ,
        exports.PERMISSIONS.PAYMENTS_WRITE,
        exports.PERMISSIONS.COMMISSIONS_READ,
        exports.PERMISSIONS.COMMISSIONS_APPROVE,
        exports.PERMISSIONS.COMMISSIONS_SETTLE,
        exports.PERMISSIONS.COMMISSIONS_PAY,
        exports.PERMISSIONS.FINANCE_READ,
        exports.PERMISSIONS.FINANCE_WRITE,
        exports.PERMISSIONS.ETA_VIEW,
        exports.PERMISSIONS.ETA_READ,
        exports.PERMISSIONS.ETA_CREATE,
        exports.PERMISSIONS.ETA_MANAGE,
        exports.PERMISSIONS.COMPLIANCE_READ,
        exports.PERMISSIONS.POS_VIEW,
        exports.PERMISSIONS.POS_MANAGE,
        exports.PERMISSIONS.BRANCHES_READ,
    ],
    [UserRole.COMPLIANCE_OFFICER]: [
        exports.PERMISSIONS.COMPLIANCE_READ,
        exports.PERMISSIONS.COMPLIANCE_WRITE,
        exports.PERMISSIONS.AUDIT_READ,
        exports.PERMISSIONS.DOCUMENTS_READ,
        exports.PERMISSIONS.DOCUMENTS_WRITE,
        exports.PERMISSIONS.USERS_READ,
    ],
    [UserRole.FIELD_AGENT]: [
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.LEADS_WRITE,
        exports.PERMISSIONS.PROPERTIES_READ,
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.AI_USE,
    ],
    [UserRole.RECEPTIONIST]: [
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.CLIENTS_WRITE,
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.LEADS_WRITE,
    ],
    [UserRole.READ_ONLY]: [
        exports.PERMISSIONS.LEADS_READ,
        exports.PERMISSIONS.PROPERTIES_READ,
        exports.PERMISSIONS.CLIENTS_READ,
        exports.PERMISSIONS.DEALS_READ,
        exports.PERMISSIONS.BRANCHES_READ,
    ],
};
//# sourceMappingURL=index.js.map