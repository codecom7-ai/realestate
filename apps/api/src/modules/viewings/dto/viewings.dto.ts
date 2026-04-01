// ═══════════════════════════════════════════════════════════════
// Viewings DTOs - جدولة المعاينات
// ═══════════════════════════════════════════════════════════════

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * حالة المعاينة
 */
export enum ViewingStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

/**
 * جدولة معاينة جديدة
 */
export class ScheduleViewingDto {
  @ApiProperty({
    description: 'معرف العميل المحتمل',
    example: 'uuid-1234',
  })
  leadId: string;

  @ApiProperty({
    description: 'معرف العقار',
    example: 'uuid-5678',
  })
  propertyId: string;

  @ApiProperty({
    description: 'تاريخ ووقت المعاينة',
    example: '2024-01-20T14:00:00Z',
  })
  scheduledAt: Date;

  @ApiPropertyOptional({
    description: 'ملاحظات',
    example: 'العميل يرغب في رؤية الشقة في الصباح',
  })
  notes?: string;
}

/**
 * تحديث المعاينة
 */
export class UpdateViewingDto {
  @ApiPropertyOptional({
    description: 'تاريخ ووقت المعاينة الجديد',
  })
  scheduledAt?: Date;

  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ViewingStatus,
  })
  status?: ViewingStatus;

  @ApiPropertyOptional({
    description: 'ملاحظات بعد المعاينة',
  })
  feedback?: string;

  @ApiPropertyOptional({
    description: 'تقييم من 1 إلى 5',
    minimum: 1,
    maximum: 5,
  })
  rating?: number;

  @ApiPropertyOptional({
    description: 'ملاحظات',
  })
  notes?: string;
}

/**
 * إلغاء المعاينة
 */
export class CancelViewingDto {
  @ApiPropertyOptional({
    description: 'سبب الإلغاء',
    example: 'العميل اعتذر',
  })
  reason?: string;
}

/**
 * معاينة
 */
export class ViewingDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  leadId: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  scheduledAt: Date;

  @ApiProperty()
  status: ViewingStatus;

  @ApiPropertyOptional()
  conductedAt?: Date;

  @ApiPropertyOptional()
  duration?: number;

  @ApiPropertyOptional()
  feedback?: string;

  @ApiPropertyOptional()
  rating?: number;

  @ApiPropertyOptional()
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiPropertyOptional()
  lead?: {
    id: string;
    stage: string;
    client?: {
      firstName: string;
      lastName: string;
      phone: string;
    };
  };

  @ApiPropertyOptional()
  property?: {
    id: string;
    title: string;
    city: string;
    district?: string;
  };
}

/**
 * استعلام المعاينات
 */
export class GetViewingsDto {
  @ApiPropertyOptional({
    description: 'معرف العميل المحتمل',
  })
  leadId?: string;

  @ApiPropertyOptional({
    description: 'معرف العقار',
  })
  propertyId?: string;

  @ApiPropertyOptional({
    description: 'الحالة',
    enum: ViewingStatus,
  })
  status?: ViewingStatus;

  @ApiPropertyOptional({
    description: 'من تاريخ',
  })
  from?: string;

  @ApiPropertyOptional({
    description: 'إلى تاريخ',
  })
  to?: string;

  @ApiPropertyOptional({
    description: 'رقم الصفحة',
    default: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'عدد العناصر',
    default: 20,
  })
  limit?: number;
}

/**
 * إحصائيات المعاينات
 */
export class ViewingStatsDto {
  @ApiProperty()
  scheduled: number;

  @ApiProperty()
  completed: number;

  @ApiProperty()
  cancelled: number;

  @ApiProperty()
  noShow: number;

  @ApiProperty()
  today: number;

  @ApiProperty()
  thisWeek: number;
}
