// ═══════════════════════════════════════════════════════════════
// Branches Controller - واجهة API الفروع
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Branches')
@ApiBearerAuth()
@Controller('branches')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class BranchesController {
  constructor(
    private readonly branchesService: BranchesService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * الحصول على معرف المؤسسة (مكتب واحد فقط)
   */
  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Post()
  @RequirePermissions(PERMISSIONS.BRANCHES_WRITE)
  @ApiOperation({
    summary: 'إنشاء فرع جديد',
    description: 'Creates a new branch. Only one headquarters is allowed.',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء الفرع بنجاح',
  })
  @ApiResponse({
    status: 409,
    description: 'اسم الفرع أو كود ETA مسجل مسبقاً',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BRANCH_NAME_EXISTS',
          message: 'Branch name already exists',
          messageAr: 'اسم الفرع مسجل مسبقاً',
        },
      },
    },
  })
  async create(
    @Body() createBranchDto: CreateBranchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.branchesService.create(
      createBranchDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.BRANCHES_READ)
  @ApiOperation({
    summary: 'قائمة الفروع',
    description: 'Returns paginated list of branches with search and filters.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'البحث (اسم، مدينة، عنوان)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'فلترة حسب الحالة' })
  @ApiQuery({ name: 'isHeadquarters', required: false, type: Boolean, description: 'فلترة المقر الرئيسي' })
  @ApiQuery({ name: 'city', required: false, description: 'فلترة حسب المدينة' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('isHeadquarters') isHeadquarters?: string,
    @Query('city') city?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.branchesService.findAll(this.getOrganizationId(), {
      search,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      isHeadquarters: isHeadquarters === 'true' ? true : isHeadquarters === 'false' ? false : undefined,
      city,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('stats')
  @RequirePermissions(PERMISSIONS.BRANCHES_READ)
  @ApiOperation({
    summary: 'إحصائيات الفروع',
    description: 'Returns branch statistics including counts by city.',
  })
  async getStats() {
    return this.branchesService.getStats(this.getOrganizationId());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_READ)
  @ApiOperation({
    summary: 'تفاصيل الفرع',
    description: 'Returns branch details with related users, teams, and devices.',
  })
  @ApiParam({ name: 'id', description: 'معرف الفرع' })
  @ApiResponse({
    status: 404,
    description: 'الفرع غير موجود',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BRANCH_NOT_FOUND',
          message: 'Branch not found',
          messageAr: 'الفرع غير موجود',
        },
      },
    },
  })
  async findOne(@Param('id') id: string) {
    return this.branchesService.findOne(id, this.getOrganizationId());
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_WRITE)
  @ApiOperation({
    summary: 'تحديث الفرع',
    description: 'Updates branch information. Can change headquarters status.',
  })
  @ApiParam({ name: 'id', description: 'معرف الفرع' })
  @ApiResponse({
    status: 404,
    description: 'الفرع غير موجود',
  })
  @ApiResponse({
    status: 409,
    description: 'اسم الفرع أو كود ETA مسجل مسبقاً',
  })
  async update(
    @Param('id') id: string,
    @Body() updateBranchDto: UpdateBranchDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.branchesService.update(
      id,
      updateBranchDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.BRANCHES_DELETE)
  @ApiOperation({
    summary: 'حذف الفرع',
    description: 'Soft deletes a branch by setting isActive to false. Cannot delete headquarters or branches with active users/properties.',
  })
  @ApiParam({ name: 'id', description: 'معرف الفرع' })
  @ApiResponse({
    status: 400,
    description: 'لا يمكن حذف الفرع (مقر رئيسي أو به مستخدمين/عقارات نشطة)',
    schema: {
      example: {
        success: false,
        error: {
          code: 'BRANCH_HAS_ACTIVE_USERS',
          message: 'Cannot delete branch with active users',
          messageAr: 'لا يمكن حذف فرع به مستخدمين نشطين',
        },
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.branchesService.remove(id, this.getOrganizationId(), userId);
  }
}
