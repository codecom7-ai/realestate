// ═══════════════════════════════════════════════════════════════
// Search Service - البحث الشامل مع دعم العربية
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  SearchQueryDto,
  SearchResponseDto,
  SearchResultItemDto,
  SearchResultsByTypeDto,
  SearchEntityType,
  ENTITY_TYPE_AR,
} from './dto/search.dto';

// Type definitions for search results
type ClientWithFields = {
  id: string;
  firstName: string;
  lastName: string;
  firstNameAr: string | null;
  lastNameAr: string | null;
  phone: string;
  phone2: string | null;
  email: string | null;
  companyName: string | null;
  clientType: string;
  isVip: boolean;
  source: string | null;
  createdAt: Date;
};

type LeadWithRelations = {
  id: string;
  stage: string;
  source: string | null;
  notes: string | null;
  budget: number | null;
  budgetCurrency: string;
  aiScore: number | null;
  createdAt: Date;
  client: {
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  assignedTo: {
    firstName: string;
    lastName: string;
  } | null;
};

type PropertyWithRelations = {
  id: string;
  title: string;
  titleAr: string | null;
  description: string | null;
  city: string;
  district: string | null;
  address: string | null;
  areaM2: number;
  status: string;
  askingPrice: number;
  currency: string;
  bedrooms: number | null;
  bathrooms: number | null;
  propertyType: string;
  createdAt: Date;
  images: { url: string; isPrimary: boolean }[];
  lock: { id: string } | null;
};

type DealWithRelations = {
  id: string;
  stage: string;
  dealType: string;
  agreedPrice: number | null;
  currency: string;
  notes: string | null;
  createdAt: Date;
  client: {
    firstName: string;
    lastName: string;
    phone: string | null;
  } | null;
  property: {
    title: string;
    titleAr: string | null;
  } | null;
  assignedBroker: {
    firstName: string;
    lastName: string;
  } | null;
};

// حالات العقارات بالعربية
const PROPERTY_STATUS_AR: Record<string, string> = {
  AVAILABLE: 'متاح',
  RESERVED_TEMP: 'محجوز مؤقتاً',
  RESERVED_CONFIRMED: 'محجوز مؤكد',
  SOLD: 'مباع',
  RENTED: 'مؤجر',
  SUSPENDED: 'معلق',
  UNDER_MAINTENANCE: 'تحت الصيانة',
};

// حالات الـ Lead بالعربية
const LEAD_STAGE_AR: Record<string, string> = {
  NEW: 'جديد',
  CONTACTED: 'تم التواصل',
  QUALIFIED: 'مؤهل',
  PROPERTY_PRESENTED: 'تم عرض عقار',
  VIEWING_SCHEDULED: 'معاينة مجدولة',
  VIEWED: 'تمت المعاينة',
  NEGOTIATING: 'في التفاوض',
  RESERVED: 'محجوز',
  CONTRACT_SENT: 'تم إرسال العقد',
  CONTRACT_SIGNED: 'تم توقيع العقد',
  CLOSED_WON: 'مغلق (نجاح)',
  CLOSED_LOST: 'مغلق (فقدان)',
};

// حالات الصفقة بالعربية
const DEAL_STAGE_AR: Record<string, string> = {
  LEAD: 'عميل محتمل',
  VIEWING: 'معاينة',
  NEGOTIATION: 'تفاوض',
  RESERVATION: 'حجز',
  CONTRACT_PREPARATION: 'إعداد العقد',
  CONTRACT_SIGNED: 'تم توقيع العقد',
  PAYMENT_ACTIVE: 'سداد نشط',
  HANDOVER_PENDING: 'في انتظار التسليم',
  CLOSED: 'مغلق',
  CANCELLED: 'ملغي',
};

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * البحث الشامل في جميع الكيانات
   * يدعم البحث بالعربية باستخدام pg_trgm
   */
  async search(
    query: SearchQueryDto,
    organizationId: string,
  ): Promise<SearchResponseDto> {
    const startTime = Date.now();
    const { q, types, limit = 5, includeDeleted = false } = query;

    // تحديد أنواع البحث
    const searchTypes = types
      ? types.split(',').map((t) => t.trim() as SearchEntityType)
      : Object.values(SearchEntityType);

    // تنظيف نص البحث
    const searchTerm = this.sanitizeSearchTerm(q);
    const results: SearchResultsByTypeDto[] = [];
    const allResults: SearchResultItemDto[] = [];

    // تنفيذ البحث بالتوازي
    const searchPromises = searchTypes.map(async (type) => {
      switch (type) {
        case SearchEntityType.CLIENT:
          return this.searchClients(searchTerm, organizationId, limit, includeDeleted);
        case SearchEntityType.LEAD:
          return this.searchLeads(searchTerm, organizationId, limit, includeDeleted);
        case SearchEntityType.PROPERTY:
          return this.searchProperties(searchTerm, organizationId, limit, includeDeleted);
        case SearchEntityType.DEAL:
          return this.searchDeals(searchTerm, organizationId, limit, includeDeleted);
        default:
          return [];
      }
    });

    const searchResults = await Promise.all(searchPromises);

    // تجميع النتائج
    searchTypes.forEach((type, index) => {
      const items = searchResults[index];
      if (items.length > 0) {
        const byType: SearchResultsByTypeDto = {
          type,
          typeAr: ENTITY_TYPE_AR[type],
          count: items.length,
          items,
        };
        results.push(byType);
        allResults.push(...items);
      }
    });

    // ترتيب جميع النتائج حسب التطابق
    allResults.sort((a, b) => b.relevance - a.relevance);

    const searchTimeMs = Date.now() - startTime;

    this.logger.log(`Search "${q}" completed in ${searchTimeMs}ms, found ${allResults.length} results`);

    return {
      query: q,
      totalResults: allResults.length,
      searchTimeMs,
      results,
      allResults,
    };
  }

  /**
   * البحث في العملاء
   */
  private async searchClients(
    searchTerm: string,
    organizationId: string,
    limit: number,
    includeDeleted: boolean,
  ): Promise<SearchResultItemDto[]> {
    const whereClause: any = {
      organizationId,
    };

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    // البحث باستخدام ILIKE و pg_trgm
    const clients = await this.prisma.client.findMany({
      where: {
        ...whereClause,
        OR: [
          { firstName: { contains: searchTerm } },
          { lastName: { contains: searchTerm } },
          { firstNameAr: { contains: searchTerm } },
          { lastNameAr: { contains: searchTerm } },
          { phone: { contains: searchTerm } },
          { phone2: { contains: searchTerm } },
          { email: { contains: searchTerm } },
          { companyName: { contains: searchTerm } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return clients.map((client: ClientWithFields) => {
      const fullName = `${client.firstName} ${client.lastName}`;
      const fullNameAr = client.firstNameAr && client.lastNameAr
        ? `${client.firstNameAr} ${client.lastNameAr}`
        : null;
      
      const relevance = this.calculateRelevance(
        searchTerm,
        [fullName, fullNameAr, client.phone, client.phone2, client.email, client.companyName].filter(Boolean),
      );

      return {
        id: client.id,
        type: SearchEntityType.CLIENT,
        typeAr: ENTITY_TYPE_AR[SearchEntityType.CLIENT],
        title: fullNameAr || fullName,
        subtitle: client.phone,
        description: client.companyName || client.email || undefined,
        status: client.clientType,
        statusAr: client.clientType === 'company' ? 'شركة' : 'فرد',
        metadata: {
          isVip: client.isVip,
          source: client.source,
        },
        relevance,
        createdAt: client.createdAt,
      };
    });
  }

  /**
   * البحث في العملاء المحتملين
   */
  private async searchLeads(
    searchTerm: string,
    organizationId: string,
    limit: number,
    includeDeleted: boolean,
  ): Promise<SearchResultItemDto[]> {
    const whereClause: any = {
      organizationId,
    };

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const leads = await this.prisma.lead.findMany({
      where: {
        ...whereClause,
        OR: [
          { source: { contains: searchTerm } },
          { notes: { contains: searchTerm } },
          {
            client: {
              OR: [
                { firstName: { contains: searchTerm } },
                { lastName: { contains: searchTerm } },
                { firstNameAr: { contains: searchTerm } },
                { lastNameAr: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
                { email: { contains: searchTerm } },
              ],
            },
          },
        ],
      },
      include: {
        client: true,
        assignedTo: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return leads.map((lead: LeadWithRelations) => {
      const clientName = lead.client
        ? `${lead.client.firstName} ${lead.client.lastName}`
        : 'بدون عميل';
      
      const relevance = this.calculateRelevance(
        searchTerm,
        [clientName, lead.client?.phone, lead.source, lead.notes].filter(Boolean),
      );

      return {
        id: lead.id,
        type: SearchEntityType.LEAD,
        typeAr: ENTITY_TYPE_AR[SearchEntityType.LEAD],
        title: clientName,
        subtitle: lead.client?.phone || 'بدون هاتف',
        description: lead.source || undefined,
        status: lead.stage,
        statusAr: LEAD_STAGE_AR[lead.stage] || lead.stage,
        metadata: {
          budget: lead.budget,
          budgetCurrency: lead.budgetCurrency,
          assignedTo: lead.assignedTo
            ? `${lead.assignedTo.firstName} ${lead.assignedTo.lastName}`
            : null,
          aiScore: lead.aiScore,
        },
        relevance,
        createdAt: lead.createdAt,
      };
    });
  }

  /**
   * البحث في العقارات
   */
  private async searchProperties(
    searchTerm: string,
    organizationId: string,
    limit: number,
    includeDeleted: boolean,
  ): Promise<SearchResultItemDto[]> {
    const whereClause: any = {
      organizationId,
    };

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const properties = await this.prisma.property.findMany({
      where: {
        ...whereClause,
        OR: [
          { title: { contains: searchTerm } },
          { titleAr: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { city: { contains: searchTerm } },
          { district: { contains: searchTerm } },
          { address: { contains: searchTerm } },
          { unitNumber: { contains: searchTerm } },
        ],
      },
      include: {
        images: {
          where: { isPrimary: true },
          take: 1,
        },
        lock: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return properties.map((property: PropertyWithRelations) => {
      const title = property.titleAr || property.title;
      
      const relevance = this.calculateRelevance(
        searchTerm,
        [title, property.description, property.city, property.district, property.address].filter(Boolean),
      );

      const description = `${property.city}${property.district ? ` - ${property.district}` : ''} • ${property.areaM2}م²`;

      return {
        id: property.id,
        type: SearchEntityType.PROPERTY,
        typeAr: ENTITY_TYPE_AR[SearchEntityType.PROPERTY],
        title,
        subtitle: description,
        description: property.description?.substring(0, 100) || undefined,
        thumbnailUrl: property.images[0]?.url || undefined,
        status: property.status,
        statusAr: PROPERTY_STATUS_AR[property.status] || property.status,
        metadata: {
          price: property.askingPrice,
          currency: property.currency,
          area: property.areaM2,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          propertyType: property.propertyType,
          isLocked: !!property.lock,
        },
        relevance,
        createdAt: property.createdAt,
      };
    });
  }

  /**
   * البحث في الصفقات
   */
  private async searchDeals(
    searchTerm: string,
    organizationId: string,
    limit: number,
    includeDeleted: boolean,
  ): Promise<SearchResultItemDto[]> {
    const whereClause: any = {
      organizationId,
    };

    if (!includeDeleted) {
      whereClause.deletedAt = null;
    }

    const deals = await this.prisma.deal.findMany({
      where: {
        ...whereClause,
        OR: [
          { notes: { contains: searchTerm } },
          {
            client: {
              OR: [
                { firstName: { contains: searchTerm } },
                { lastName: { contains: searchTerm } },
                { firstNameAr: { contains: searchTerm } },
                { lastNameAr: { contains: searchTerm } },
                { phone: { contains: searchTerm } },
              ],
            },
          },
          {
            property: {
              OR: [
                { title: { contains: searchTerm } },
                { titleAr: { contains: searchTerm } },
                { city: { contains: searchTerm } },
              ],
            },
          },
        ],
      },
      include: {
        client: true,
        property: true,
        assignedBroker: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return deals.map((deal: DealWithRelations) => {
      const clientName = deal.client
        ? `${deal.client.firstName} ${deal.client.lastName}`
        : 'بدون عميل';
      
      const propertyTitle = deal.property?.titleAr || deal.property?.title || 'بدون عقار';

      const relevance = this.calculateRelevance(
        searchTerm,
        [clientName, deal.client?.phone, propertyTitle, deal.notes].filter(Boolean),
      );

      return {
        id: deal.id,
        type: SearchEntityType.DEAL,
        typeAr: ENTITY_TYPE_AR[SearchEntityType.DEAL],
        title: clientName,
        subtitle: propertyTitle,
        description: deal.notes?.substring(0, 100) || undefined,
        status: deal.stage,
        statusAr: DEAL_STAGE_AR[deal.stage] || deal.stage,
        metadata: {
          dealType: deal.dealType,
          agreedPrice: deal.agreedPrice,
          currency: deal.currency,
          assignedBroker: deal.assignedBroker
            ? `${deal.assignedBroker.firstName} ${deal.assignedBroker.lastName}`
            : null,
        },
        relevance,
        createdAt: deal.createdAt,
      };
    });
  }

  /**
   * تنظيف نص البحث من الأحرف الخاصة
   */
  private sanitizeSearchTerm(term: string): string {
    // إزالة الأحرف الخاصة
    let sanitized = term.replace(/[^\p{L}\p{N}\s]/gu, ' ');
    // تقليص المسافات الزائدة
    sanitized = sanitized.replace(/\s+/g, ' ').trim();
    // إزالة الكلمات القصيرة جداً (أقل من حرفين)
    const words = sanitized.split(' ').filter((w) => w.length >= 2);
    return words.join(' ');
  }

  /**
   * حساب درجة التطابق
   */
  private calculateRelevance(
    searchTerm: string,
    fields: (string | null | undefined)[],
  ): number {
    const normalizedSearch = searchTerm.toLowerCase().trim();
    const searchWords = normalizedSearch.split(/\s+/);

    let maxScore = 0;

    for (const field of fields) {
      if (!field) continue;

      const normalizedField = field.toLowerCase();
      let fieldScore = 0;

      // تطابق كامل
      if (normalizedField === normalizedSearch) {
        fieldScore = 1.0;
      }
      // يبدأ بـ
      else if (normalizedField.startsWith(normalizedSearch)) {
        fieldScore = 0.9;
      }
      // يحتوي على
      else if (normalizedField.includes(normalizedSearch)) {
        fieldScore = 0.8;
      }
      // تطابق كلمات
      else {
        const matchedWords = searchWords.filter((word) =>
          normalizedField.includes(word),
        );
        if (matchedWords.length > 0) {
          fieldScore = matchedWords.length / searchWords.length * 0.6;
        }
      }

      maxScore = Math.max(maxScore, fieldScore);
    }

    return Math.round(maxScore * 100) / 100; // تقريب لرقمين عشريين
  }

  /**
   * اقتراحات البحث السريع
   */
  async getSuggestions(
    partial: string,
    organizationId: string,
    limit: number = 5,
  ): Promise<string[]> {
    const searchTerm = this.sanitizeSearchTerm(partial);
    if (searchTerm.length < 2) return [];

    // البحث السريع في العملاء
    const clients = await this.prisma.client.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { firstName: { startsWith: searchTerm } },
          { lastName: { startsWith: searchTerm } },
          { phone: { startsWith: searchTerm } },
        ],
      },
      select: { firstName: true, lastName: true, firstNameAr: true, lastNameAr: true },
      take: limit,
    });

    // استخراج الأسماء
    const suggestions = new Set<string>();
    clients.forEach((client: { firstName: string; lastName: string; firstNameAr: string | null; lastNameAr: string | null }) => {
      if (client.firstNameAr && client.lastNameAr) {
        suggestions.add(`${client.firstNameAr} ${client.lastNameAr}`);
      } else {
        suggestions.add(`${client.firstName} ${client.lastName}`);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  }
}
