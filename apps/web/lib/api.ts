// ═══════════════════════════════════════════════════════════════
// API Client - Axios with auto-refresh
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API URL - detect automatically based on environment
// IMPORTANT: In production, we ALWAYS use the current origin (window.location.origin)
// The NEXT_PUBLIC_API_URL is only used for development/SSR fallback

const getApiUrl = (): string => {
  // In browser (client-side), ALWAYS use current origin
  // This ensures API calls go to the same domain serving the app
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side (SSR/SSG): Use environment variable or fallback
  // In production Docker deployment, this should be set to the actual domain
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102';
};

// Dynamic API URL - evaluated at call time to ensure browser gets correct origin
let cachedApiUrl: string | null = null;

const getApiUrlCached = (): string => {
  if (cachedApiUrl) return cachedApiUrl;
  cachedApiUrl = getApiUrl();
  return cachedApiUrl;
};

// For initial axios setup, use a base URL that will be overridden per-request
const API_URL = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102');

// Create axios instance
export const api: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For refresh token cookies
});

/**
 * Get CSRF token from cookies
 */
const getCsrfToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

// Request interceptor - add locale header, CSRF token, and ensure correct baseURL
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // CRITICAL: Ensure we use the current origin for API calls in browser
    // This fixes the localhost:3102 issue in production
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin;
      // Update baseURL dynamically to use current origin
      config.baseURL = `${currentOrigin}/api/v1`;
    }
    
    // Tokens are handled via HttpOnly cookies automatically
    // No need to manually add Authorization header
    
    // Add Accept-Language header based on cookie or document lang
    if (typeof document !== 'undefined') {
      // Get locale from cookie or document
      const cookieMatch = document.cookie.match(/NEXT_LOCALE=([^;]+)/);
      const locale = cookieMatch?.[1] || document.documentElement.lang || 'ar';
      config.headers['Accept-Language'] = locale;
      
      // Add CSRF token for non-GET requests
      const method = config.method?.toUpperCase();
      if (method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
          config.headers['x-csrf-token'] = csrfToken;
        }
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle 401 and refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string) => void;
  reject: (error: Error) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else if (token) {
      promise.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // If error is 401 and we haven't tried to refresh yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Add to queue and wait
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Try to refresh token - cookies are sent automatically
        // Use current origin in browser, or API_URL on server
        const refreshUrl = typeof window !== 'undefined'
          ? `${window.location.origin}/api/v1/auth/refresh`
          : `${API_URL}/api/v1/auth/refresh`;
        
        const response = await axios.post(refreshUrl, {}, {
          withCredentials: true,
        });

        // Refresh successful - retry original request
        // The new access token is set as HttpOnly cookie by the server
        processQueue(null, 'refreshed');

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout user
        processQueue(refreshError as Error, null);
        
        if (typeof window !== 'undefined') {
          // Clear auth state and redirect to login
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// API helper functions
export const apiClient = {
  // Auth
  login: (email: string, password: string, totp?: string) =>
    api.post('/auth/login', { email, password, totp }),
  
  logout: () =>
    api.post('/auth/logout'),
  
  refresh: () =>
    api.post('/auth/refresh'),

  // Setup
  getSetupStatus: () =>
    api.get('/setup/status'),
  
  initializeSetup: (data: any) =>
    api.post('/setup/initialize', data),

  // Users
  getUsers: (params?: any) =>
    api.get('/users', { params }),
  
  getUser: (id: string) =>
    api.get(`/users/${id}`),
  
  createUser: (data: any) =>
    api.post('/users', data),
  
  updateUser: (id: string, data: any) =>
    api.patch(`/users/${id}`, data),
  
  deleteUser: (id: string) =>
    api.delete(`/users/${id}`),

  // Clients
  getClients: (params?: any) =>
    api.get('/clients', { params }),
  
  getClient: (id: string) =>
    api.get(`/clients/${id}`),
  
  createClient: (data: any) =>
    api.post('/clients', data),
  
  updateClient: (id: string, data: any) =>
    api.patch(`/clients/${id}`, data),
  
  mergeClient: (id: string, mergeIntoId: string) =>
    api.post(`/clients/${id}/merge`, { mergeIntoId }),

  // Leads
  getLeads: (params?: any) =>
    api.get('/leads', { params }),
  
  getLead: (id: string) =>
    api.get(`/leads/${id}`),
  
  createLead: (data: any) =>
    api.post('/leads', data),
  
  updateLead: (id: string, data: any) =>
    api.patch(`/leads/${id}`, data),
  
  changeLeadStage: (id: string, stage: string, reason?: string) =>
    api.patch(`/leads/${id}/stage`, { stage, reason }),
  
  assignLead: (id: string, userId: string) =>
    api.patch(`/leads/${id}/assign`, { userId }),

  // Properties
  getProperties: (params?: any) =>
    api.get('/properties', { params }),
  
  getProperty: (id: string) =>
    api.get(`/properties/${id}`),
  
  createProperty: (data: any) =>
    api.post('/properties', data),
  
  updateProperty: (id: string, data: any) =>
    api.patch(`/properties/${id}`, data),
  
  lockProperty: (id: string, dealId: string, lockType: string) =>
    api.post(`/properties/${id}/lock`, { dealId, lockType }),
  
  unlockProperty: (id: string) =>
    api.delete(`/properties/${id}/lock`),

  // Uploads
  getPresignedUrl: (data: {
    mimeType: string;
    entityType: string;
    entityId: string;
    originalFileName?: string;
    fileSize?: number;
  }) =>
    api.post('/uploads/presigned-url', data),
  
  confirmUpload: (data: {
    key: string;
    entityType: string;
    entityId: string;
    order?: number;
    isPrimary?: boolean;
  }) =>
    api.post('/uploads/confirm', data),
  
  deleteImage: (imageId: string, entityType: string) =>
    api.delete(`/uploads/${imageId}`, { params: { entityType } }),
  
  reorderImages: (data: {
    entityId: string;
    imageIds: string[];
    primaryImageId?: string;
  }) =>
    api.post('/uploads/reorder', data),
  
  getPropertyImages: (propertyId: string) =>
    api.get(`/uploads/property/${propertyId}`),

  // Deals
  getDeals: (params?: any) =>
    api.get('/deals', { params }),
  
  getDeal: (id: string) =>
    api.get(`/deals/${id}`),
  
  createDeal: (data: any) =>
    api.post('/deals', data),
  
  updateDeal: (id: string, data: any) =>
    api.patch(`/deals/${id}`, data),
  
  changeDealStage: (id: string, stage: string) =>
    api.patch(`/deals/${id}/stage`, { stage }),

  // Payments
  getPayments: (params?: {
    status?: string;
    method?: string;
    dealId?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/payments', { params }),

  getPayment: (id: string) =>
    api.get(`/payments/${id}`),

  createPayment: (data: {
    dealId: string;
    installmentId?: string;
    amount: number;
    method: string;
    reference?: string;
    receiptNumber?: string;
    bankName?: string;
    checkNumber?: string;
    checkDueDate?: string;
    paidAt?: string;
    notes?: string;
  }) =>
    api.post('/payments', data),

  updatePayment: (id: string, data: Partial<{
    amount: number;
    method: string;
    reference: string;
    receiptNumber: string;
    notes: string;
  }>) =>
    api.patch(`/payments/${id}`, data),

  confirmPayment: (id: string) =>
    api.post(`/payments/${id}/confirm`),

  refundPayment: (id: string, reason?: string) =>
    api.post(`/payments/${id}/refund`, { reason }),

  getPaymentStats: () =>
    api.get('/payments/stats'),

  // Commissions
  getCommissions: (params?: {
    status?: string;
    brokerId?: string;
    dealId?: string;
    from?: string;
    to?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/commissions', { params }),

  getCommission: (id: string) =>
    api.get(`/commissions/${id}`),

  approveCommission: (id: string) =>
    api.post(`/commissions/${id}/approve`),

  settleCommission: (id: string) =>
    api.post(`/commissions/${id}/settle`),

  payCommission: (id: string, paymentDetails?: {
    method: string;
    reference?: string;
    paidAt?: string;
  }) =>
    api.post(`/commissions/${id}/pay`, paymentDetails),

  disputeCommission: (id: string, reason: string) =>
    api.post(`/commissions/${id}/dispute`, { reason }),

  getCommissionStats: () =>
    api.get('/commissions/stats'),

  // Payment Schedules
  getPaymentSchedules: (params?: {
    dealId?: string;
    status?: string;
    overdue?: boolean;
    dueWithin?: number;
    page?: number;
    limit?: number;
  }) =>
    api.get('/payment-schedules', { params }),

  getPaymentSchedule: (dealId: string) =>
    api.get(`/payment-schedules/${dealId}`),

  getScheduleInstallments: (dealId: string, params?: {
    status?: string;
    overdue?: boolean;
  }) =>
    api.get(`/payment-schedules/${dealId}/installments`, { params }),

  getPaymentScheduleStats: () =>
    api.get('/payment-schedules/stats'),

  // Documents
  getDocumentUploadUrl: (data: any) =>
    api.post('/documents/upload-url', data),
  
  confirmDocument: (id: string) =>
    api.post(`/documents/${id}/confirm`),

  // AI
  aiCopilot: (message: string, context?: any) =>
    api.post('/ai/copilot', { message, context }),
  
  getLeadScore: (leadId: string) =>
    api.post(`/ai/lead-score/${leadId}`),

  // OCR - Optical Character Recognition
  ocrDocument: (imageBase64: string, documentType: string) =>
    api.post('/ai/ocr', { image: imageBase64, documentType }),

  // Organization
  getOrganization: () =>
    api.get('/organization'),
  
  updateOrganization: (data: any) =>
    api.patch('/organization', data),

  getOrganizationSettings: () =>
    api.get('/organization/settings'),
  
  updateOrganizationSettings: (data: any) =>
    api.patch('/organization/settings', data),

  // Branches
  getBranches: (params?: {
    search?: string;
    isActive?: boolean;
    isHeadquarters?: boolean;
    city?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/branches', { params }),
  
  getBranch: (id: string) =>
    api.get(`/branches/${id}`),
  
  createBranch: (data: any) =>
    api.post('/branches', data),
  
  updateBranch: (id: string, data: any) =>
    api.patch(`/branches/${id}`, data),
  
  deleteBranch: (id: string) =>
    api.delete(`/branches/${id}`),
  
  getBranchStats: () =>
    api.get('/branches/stats'),

  // Automation
  getAutomationRules: (params?: {
    trigger?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/automation/rules', { params }),
  
  getAutomationRule: (id: string) =>
    api.get(`/automation/rules/${id}`),
  
  createAutomationRule: (data: any) =>
    api.post('/automation/rules', data),
  
  updateAutomationRule: (id: string, data: any) =>
    api.patch(`/automation/rules/${id}`, data),
  
  deleteAutomationRule: (id: string) =>
    api.delete(`/automation/rules/${id}`),
  
  toggleAutomationRule: (id: string, isActive: boolean) =>
    api.post(`/automation/rules/${id}/toggle`, { isActive }),
  
  testAutomationRule: (id: string, testData: Record<string, any>) =>
    api.post(`/automation/rules/${id}/test`, testData),
  
  getAutomationStats: () =>
    api.get('/automation/rules/stats'),
  
  getAutomationTriggers: () =>
    api.get('/automation/triggers'),
  
  getAutomationActions: () =>
    api.get('/automation/actions'),
  
  getAutomationOperators: () =>
    api.get('/automation/operators'),

  // Audit Logs
  getAuditLogs: (params?: any) =>
    api.get('/audit-logs', { params }),
  
  getAuditLog: (id: string) =>
    api.get(`/audit-logs/${id}`),
  
  getEntityHistory: (entityType: string, entityId: string) =>
    api.get(`/audit-logs/entity/${entityType}/${entityId}`),
  
  exportAuditLogs: (params?: any) =>
    api.get('/audit-logs/export/csv', { params, responseType: 'blob' }),

  // Activities
  getActivities: (params?: any) =>
    api.get('/activities', { params }),
  
  getActivity: (id: string) =>
    api.get(`/activities/${id}`),
  
  createActivity: (data: any) =>
    api.post('/activities', data),
  
  updateActivity: (id: string, data: any) =>
    api.patch(`/activities/${id}`, data),
  
  deleteActivity: (id: string) =>
    api.delete(`/activities/${id}`),
  
  getEntityTimeline: (entityType: string, entityId: string, params?: any) =>
    api.get(`/activities/entity/${entityType}/${entityId}`, { params }),

  // Dashboard
  getDashboardStats: () =>
    api.get('/dashboard'),
  
  getDashboardKpis: () =>
    api.get('/dashboard/kpis'),
  
  refreshDashboard: () =>
    api.get('/dashboard/refresh'),

  // Search
  globalSearch: (query: string, types?: string, limit?: number) =>
    api.get('/search', {
      params: { q: query, types, limit },
    }),
  
  getSearchSuggestions: (partial: string, limit?: number) =>
    api.get('/search/suggestions', {
      params: { q: partial, limit },
    }),

  // Communication / Inbox
  getConversations: (params?: {
    status?: string;
    channel?: string;
    clientId?: string;
    leadId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/conversations', { params }),
  
  getConversationCounts: () =>
    api.get('/conversations/counts'),
  
  getConversation: (id: string, messagesLimit?: number) =>
    api.get(`/conversations/${id}`, { params: { messagesLimit } }),
  
  updateConversation: (id: string, data: { status?: string }) =>
    api.patch(`/conversations/${id}`, data),
  
  closeConversation: (id: string) =>
    api.post(`/conversations/${id}/close`),
  
  reopenConversation: (id: string) =>
    api.post(`/conversations/${id}/reopen`),
  
  sendConversationMessage: (conversationId: string, content: string, contentType?: string) =>
    api.post(`/conversations/${conversationId}/messages`, { content, contentType }),

  // WhatsApp
  sendWhatsAppText: (data: { to: string; text: string; conversationId?: string }) =>
    api.post('/whatsapp/send/text', data),
  
  sendWhatsAppTemplate: (data: {
    to: string;
    templateName: string;
    languageCode: string;
    components?: any[];
    conversationId?: string;
  }) =>
    api.post('/whatsapp/send/template', data),

  // ETA - Electronic Tax Authority Receipts
  getETAReceipts: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    startDate?: string;
    endDate?: string;
    posDeviceId?: string;
  }) =>
    api.get('/eta/receipts', { params }),
  
  getETAReceipt: (id: string) =>
    api.get(`/eta/receipts/${id}`),
  
  getETAReceiptStats: () =>
    api.get('/eta/receipts/stats'),
  
  createETAReceipt: (data: {
    paymentId: string;
    posDeviceId: string;
    serviceDescription: string;
    netAmount: number;
    taxRate?: number;
    remarks?: string;
  }) =>
    api.post('/eta/receipts', data),
  
  retryETAReceipt: (id: string, data?: { posDeviceId?: string; remarks?: string }) =>
    api.post(`/eta/receipts/${id}/retry`, data),
  
  getETAReceiptQR: (id: string) =>
    api.get(`/eta/receipts/${id}/qr`),
  
  getETATokenStatus: () =>
    api.get('/eta/token/status'),
  
  refreshETAToken: () =>
    api.post('/eta/token/refresh'),
  
  checkETAConfiguration: () =>
    api.get('/eta/config/check'),

  // Compliance
  getComplianceRecords: (params?: {
    page?: number;
    limit?: number;
    entityType?: string;
    entityId?: string;
    recordType?: string;
    status?: string;
    expiringWithinDays?: number;
  }) =>
    api.get('/compliance', { params }),
  
  getComplianceRecord: (id: string) =>
    api.get(`/compliance/${id}`),
  
  getComplianceStatus: () =>
    api.get('/compliance/status'),
  
  getBrokerRegistry: () =>
    api.get('/compliance/brokers'),
  
  getComplianceAlerts: () =>
    api.get('/compliance/alerts'),
  
  getExpiringDocuments: (days?: number) =>
    api.get('/compliance/expiring', { params: { days } }),
  
  createComplianceRecord: (data: {
    entityType: string;
    entityId: string;
    recordType: string;
    referenceNumber?: string;
    issuedAt?: string;
    expiresAt?: string;
    documentUrl?: string;
    notes?: string;
  }) =>
    api.post('/compliance', data),
  
  updateComplianceRecord: (id: string, data: any) =>
    api.patch(`/compliance/${id}`, data),
  
  deleteComplianceRecord: (id: string) =>
    api.delete(`/compliance/${id}`),

  // Reconciliation
  getReconciliationKPIs: (params?: {
    branchId?: string;
    period?: string;
  }) =>
    api.get('/reconciliation/kpis', { params }),

  getOverdueInstallments: (params?: {
    branchId?: string;
    delayStatus?: 'critical' | 'warning' | 'normal' | 'all';
    page?: number;
    limit?: number;
  }) =>
    api.get('/reconciliation/overdue', { params }),

  getMonthlyCollectionChart: (params?: {
    branchId?: string;
    period?: string;
  }) =>
    api.get('/reconciliation/chart', { params }),

  exportReconciliationReport: (format: 'csv' | 'pdf', params?: any) =>
    api.get('/reconciliation/export', { params: { format, ...params }, responseType: 'blob' }),

  // Reports
  getMonthlyRevenueReport: (params?: { year?: number; month?: number }) =>
    api.get('/reports/monthly-revenue', { params }),

  getETASummaryReport: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/eta-summary', { params }),

  getFinancialSummary: () =>
    api.get('/reports/financial-summary'),

  getCommissionSummaryReport: (params?: {
    branchId?: string;
    period?: string;
  }) =>
    api.get('/reports/commission-summary', { params }),

  getRevenueTrendChart: (params?: {
    branchId?: string;
    period?: string;
  }) =>
    api.get('/reports/revenue-trend', { params }),

  exportReport: (type: string, format: 'csv' | 'pdf', params?: any) =>
    api.get(`/reports/export/${type}`, { params: { format, ...params }, responseType: 'blob' }),

  // Viewings
  getViewings: (params?: {
    leadId?: string;
    propertyId?: string;
    status?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/viewings', { params }),
  
  getViewingsStats: () =>
    api.get('/viewings/stats'),
  
  getViewing: (id: string) =>
    api.get(`/viewings/${id}`),
  
  scheduleViewing: (data: {
    leadId: string;
    propertyId: string;
    scheduledAt: string;
    notes?: string;
  }) =>
    api.post('/viewings', data),
  
  updateViewing: (id: string, data: {
    scheduledAt?: string;
    status?: string;
    feedback?: string;
    rating?: number;
    notes?: string;
  }) =>
    api.patch(`/viewings/${id}`, data),
  
  cancelViewing: (id: string, reason?: string) =>
    api.post(`/viewings/${id}/cancel`, { reason }),

  // Contracts
  getContracts: (params?: {
    status?: string;
    dealId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/contracts', { params }),
  
  getContract: (id: string) =>
    api.get(`/contracts/${id}`),
  
  createContract: (data: {
    dealId: string;
    contractNumber?: string;
    contractDate?: string;
    notes?: string;
  }) =>
    api.post('/contracts', data),
  
  updateContract: (id: string, data: {
    contractNumber?: string;
    contractDate?: string;
    notes?: string;
  }) =>
    api.patch(`/contracts/${id}`, data),
  
  signContract: (id: string, data: { signedBy?: 'client' | 'office' }) =>
    api.post(`/contracts/${id}/sign`, data),
  
  cancelContract: (id: string, reason?: string) =>
    api.post(`/contracts/${id}/cancel`, { reason }),
  
  uploadContractFile: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/contracts/${id}/file`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Documents
  getDocuments: (params?: {
    entityType?: string;
    entityId?: string;
    documentType?: string;
    status?: string;
    ocrStatus?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get('/documents', { params }),
  
  getDocument: (id: string) =>
    api.get(`/documents/${id}`),
  
  uploadDocument: (data: {
    file: File;
    entityType: string;
    entityId: string;
    documentType: string;
    title?: string;
    expiresAt?: string;
    notes?: string;
  }) => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('entityType', data.entityType);
    formData.append('entityId', data.entityId);
    formData.append('documentType', data.documentType);
    if (data.title) formData.append('title', data.title);
    if (data.expiresAt) formData.append('expiresAt', data.expiresAt);
    if (data.notes) formData.append('notes', data.notes);
    return api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  verifyDocument: (id: string, notes?: string) =>
    api.post(`/documents/${id}/verify`, { notes }),
  
  rejectDocument: (id: string, reason: string) =>
    api.post(`/documents/${id}/reject`, { reason }),
  
  deleteDocument: (id: string) =>
    api.delete(`/documents/${id}`),
  
  getDocumentPresignedUrl: (id: string) =>
    api.get(`/documents/${id}/download`),
  
  reprocessOcr: (id: string) =>
    api.post(`/documents/${id}/ocr/reprocess`),
};

export default apiClient;
