// ═══════════════════════════════════════════════════════════════
// Search Controller - واجهة البحث الشامل
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SearchService } from './search.service';
import {
  SearchQueryDto,
  SearchResponseDto,
} from './dto/search.dto';

@ApiTags('البحث')
@ApiBearerAuth()
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  /**
   * GET /search
   * البحث الشامل في جميع الكيانات
   * Rate limit: 60 طلب في الدقيقة لكل مستخدم
   */
  @Get()
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 طلب/دقيقة
  @ApiOperation({
    summary: 'البحث الشامل',
    description: 'البحث في العملاء والعملاء المحتملين والعقارات والصفقات. يدعم العربية والإنجليزية.',
  })
  @ApiQuery({
    name: 'q',
    description: 'نص البحث',
    required: true,
    example: 'أحمد محمد',
  })
  @ApiQuery({
    name: 'types',
    description: 'أنواع الكيانات (مفصولة بفاصلة)',
    required: false,
    example: 'client,lead,property',
  })
  @ApiQuery({
    name: 'limit',
    description: 'الحد الأقصى للنتائج لكل نوع',
    required: false,
    example: 5,
  })
  @ApiQuery({
    name: 'includeDeleted',
    description: 'تضمين المحذوفين',
    required: false,
    example: false,
  })
  @ApiResponse({
    status: 200,
    description: 'نتائج البحث',
    type: SearchResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'نص البحث قصير جداً',
    schema: {
      example: {
        success: false,
        error: {
          code: 'SEARCH_TERM_TOO_SHORT',
          message: 'Search term must be at least 2 characters',
          messageAr: 'نص البحث يجب أن يكون حرفين على الأقل',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'تجاوز حد الطلبات',
    schema: {
      example: {
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many search requests',
          messageAr: 'تم تجاوز حد البحث المسموح',
        },
      },
    },
  })
  async search(
    @Query() query: SearchQueryDto,
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<SearchResponseDto> {
    // التحقق من طول نص البحث
    if (!query.q || query.q.trim().length < 2) {
      throw new Error('SEARCH_TERM_TOO_SHORT');
    }

    return this.searchService.search(query, organizationId);
  }

  /**
   * GET /search/suggestions
   * اقتراحات البحث السريع
   */
  @Get('suggestions')
  @Throttle({ default: { limit: 120, ttl: 60000 } }) // 120 طلب/دقيقة
  @ApiOperation({
    summary: 'اقتراحات البحث',
    description: 'اقتراحات سريعة أثناء الكتابة',
  })
  @ApiQuery({
    name: 'q',
    description: 'نص البحث الجزئي',
    required: true,
    example: 'أحم',
  })
  @ApiQuery({
    name: 'limit',
    description: 'عدد الاقتراحات',
    required: false,
    example: 5,
  })
  @ApiResponse({
    status: 200,
    description: 'قائمة الاقتراحات',
    schema: {
      type: 'array',
      items: { type: 'string' },
      example: ['أحمد محمد', 'أحمد علي', 'أحمد محمود'],
    },
  })
  async getSuggestions(
    @Query('q') partial: string,
    @Query('limit') limit: string = '5',
    @CurrentUser('organizationId') organizationId: string,
  ): Promise<string[]> {
    return this.searchService.getSuggestions(
      partial,
      organizationId,
      parseInt(limit, 10),
    );
  }
}
