// ═══════════════════════════════════════════════════════════════
// Customer Portal API Client
// عميل API للبوابة الإلكترونية للعملاء
// ═══════════════════════════════════════════════════════════════

import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';

// API Configuration - default to port 3102 (matches deployment script)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3102/api/v1';

// Types
export interface PropertyPublic {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  propertyType: string;
  finishingType: string | null;
  city: string;
  district: string | null;
  address: string | null;
  floor: number | null;
  unitNumber: string | null;
  areaM2: number;
  bedrooms: number | null;
  bathrooms: number | null;
  parking: number | null;
  askingPrice: number;
  currency: string;
  status: string;
  images: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface ViewingRequestInput {
  propertyId: string;
  name: string;
  phone: string;
  email?: string;
  message?: string;
  preferredDate?: string;
  preferredTime?: string;
}

export interface ViewingRequestResult {
  success: boolean;
  requestId: string;
  message: string;
  messageAr: string;
}

export interface ClientByPhone {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string;
  email: string | null;
  isVip: boolean;
}

export interface ClientData {
  name: string;
  phone: string;
  email: string | null;
  viewings: ClientViewing[];
  deals: ClientDeal[];
  payments: ClientPayment[];
}

export interface ClientViewing {
  id: string;
  property: {
    id: string;
    title: string;
    titleAr: string | null;
    city: string;
    district: string | null;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    askingPrice: number;
    currency: string;
    images: { url: string; isPrimary: boolean }[];
  };
  scheduledAt: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  feedback?: string;
  rating?: number;
}

export interface ClientDeal {
  id: string;
  property: {
    id: string;
    title: string;
    titleAr: string | null;
    city: string;
    district: string | null;
    areaM2: number;
    bedrooms: number | null;
    bathrooms: number | null;
    askingPrice: number;
    currency: string;
    images: { url: string; isPrimary: boolean }[];
  };
  stage: string;
  agreedPrice: number;
  currency: string;
  createdAt: string;
}

export interface ClientPayment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    messageAr?: string;
    details?: Record<string, any>;
  };
}

// Custom Error Class
export class CustomerPortalError extends Error {
  public code: string;
  public details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'CustomerPortalError';
    this.code = code;
    this.details = details;
  }
}

// API Client Class
class CustomerPortalClient {
  private client: AxiosInstance;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError<ApiError>) => {
        const config = error.config as AxiosRequestConfig & { _retryCount?: number };

        // Network errors - retry
        if (!error.response && config._retryCount !== undefined && config._retryCount < this.retryCount) {
          config._retryCount++;
          await this.delay(this.retryDelay * config._retryCount);
          return this.client.request(config);
        }

        // API Error
        if (error.response?.data?.error) {
          const apiError = error.response.data.error;
          throw new CustomerPortalError(
            apiError.messageAr || apiError.message,
            apiError.code,
            apiError.details
          );
        }

        // Generic error
        throw new CustomerPortalError(
          'حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.',
          'NETWORK_ERROR'
        );
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * الحصول على قائمة العقارات المتاحة (بدون مصادقة)
   */
  async getPublicProperties(filters?: {
    propertyType?: string;
    minPrice?: string;
    maxPrice?: string;
    city?: string;
    bedrooms?: string;
  }): Promise<PropertyPublic[]> {
    const params = new URLSearchParams();
    if (filters?.propertyType) params.append('propertyType', filters.propertyType);
    if (filters?.minPrice) params.append('minPrice', filters.minPrice);
    if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice);
    if (filters?.city) params.append('city', filters.city);
    if (filters?.bedrooms) params.append('bedrooms', filters.bedrooms);
    
    const query = params.toString();
    const response = await this.client.get(`/public/properties${query ? `?${query}` : ''}`);
    return response.data.data;
  }

  /**
   * الحصول على بيانات عقار عامة (بدون مصادقة)
   */
  async getPropertyPublic(propertyId: string): Promise<PropertyPublic> {
    const response = await this.client.get(`/public/properties/${propertyId}`);
    return response.data.data;
  }

  /**
   * إنشاء طلب معاينة (بدون مصادقة)
   */
  async createViewingRequest(data: ViewingRequestInput): Promise<ViewingRequestResult> {
    const response = await this.client.post('/public/requests', data);
    return response.data;
  }

  /**
   * التحقق من العميل برقم الهاتف
   */
  async getClientByPhone(phone: string): Promise<ClientByPhone | null> {
    try {
      const response = await this.client.get(`/public/clients/phone/${encodeURIComponent(phone)}`);
      return response.data.data;
    } catch (error) {
      if (error instanceof CustomerPortalError && error.code === 'CLIENT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * الحصول على بيانات العميل الكاملة
   */
  async getClientData(phone: string): Promise<ClientData | null> {
    try {
      const response = await this.client.get(`/public/clients/phone/${encodeURIComponent(phone)}/data`);
      return response.data.data;
    } catch (error) {
      if (error instanceof CustomerPortalError && error.code === 'CLIENT_NOT_FOUND') {
        return null;
      }
      throw error;
    }
  }

  /**
   * تأكيد حضور المعاينة
   */
  async confirmViewing(viewingId: string, phone: string): Promise<{ success: boolean }> {
    const response = await this.client.post(`/public/viewings/${viewingId}/confirm`, { phone });
    return response.data;
  }
}

// Export singleton instance
export const customerPortalApi = new CustomerPortalClient();

// Helper functions
export function formatCurrency(amount: number, currency: string = 'EGP'): string {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ar-EG', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function validateEgyptianPhone(phone: string): { valid: boolean; formatted?: string; error?: string } {
  // Remove spaces and dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Egyptian phone patterns
  const patterns = [
    /^(\+20|0020)?1[0-25][0-9]{8}$/, // Mobile
    /^(\+20|0020)?[2-9][0-9]{7}$/,   // Landline
  ];

  for (const pattern of patterns) {
    if (pattern.test(cleaned)) {
      // Format to +20XXXXXXXXXX
      let formatted = cleaned;
      if (cleaned.startsWith('0020')) {
        formatted = '+20' + cleaned.slice(4);
      } else if (!cleaned.startsWith('+20')) {
        formatted = '+20' + cleaned;
      }
      return { valid: true, formatted };
    }
  }

  return {
    valid: false,
    error: 'رقم الهاتف غير صحيح. يجب أن يكون رقم مصري صحيح.',
  };
}

export function getDealStageName(stage: string): string {
  const stages: Record<string, string> = {
    'LEAD': 'عميل محتمل',
    'VIEWING': 'في المعاينة',
    'NEGOTIATION': 'في التفاوض',
    'RESERVATION': 'محجوز',
    'CONTRACT_PREPARATION': 'إعداد العقد',
    'CONTRACT_SIGNED': 'العقد موقع',
    'PAYMENT_ACTIVE': 'سداد نشط',
    'HANDOVER_PENDING': 'في انتظار التسليم',
    'CLOSED': 'مغلق',
    'CANCELLED': 'ملغي',
  };
  return stages[stage] || stage;
}

export function getViewingStatusName(status: string): string {
  const statuses: Record<string, string> = {
    'scheduled': 'مجدولة',
    'completed': 'مكتملة',
    'cancelled': 'ملغاة',
    'no_show': 'لم يحضر',
  };
  return statuses[status] || status;
}

export function getPaymentStatusName(status: string): string {
  const statuses: Record<string, string> = {
    'pending': 'معلق',
    'paid': 'مدفوع',
    'overdue': 'متأخر',
    'cancelled': 'ملغي',
    'refunded': 'مسترد',
  };
  return statuses[status] || status;
}

export function getPaymentStatusColor(status: string): string {
  const colors: Record<string, string> = {
    'pending': 'bg-yellow-100 text-yellow-700',
    'paid': 'bg-green-100 text-green-700',
    'overdue': 'bg-red-100 text-red-700',
    'cancelled': 'bg-gray-100 text-gray-700',
    'refunded': 'bg-blue-100 text-blue-700',
  };
  return colors[status] || 'bg-gray-100 text-gray-700';
}
