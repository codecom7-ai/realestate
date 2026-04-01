// ═══════════════════════════════════════════════════════════════
// Clients Controller - واجهة API العملاء
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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Clients')
@ApiBearerAuth()
@Controller('clients')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ClientsController {
  constructor(
    private readonly clientsService: ClientsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * الحصول على معرف المؤسسة (مكتب واحد فقط)
   */
  private getOrganizationId(): string {
    return this.configService.get<string>('app.orgId') || '';
  }

  @Post()
  @RequirePermissions(PERMISSIONS.CLIENTS_WRITE)
  @ApiOperation({
    summary: 'إنشاء عميل جديد',
    description: 'Creates a new client. Returns warning if phone number exists.',
  })
  @ApiResponse({
    status: 201,
    description: 'تم إنشاء العميل بنجاح',
  })
  @ApiResponse({
    status: 409,
    description: 'رقم الهاتف مسجل مسبقاً',
    schema: {
      example: {
        success: false,
        error: {
          code: 'PHONE_EXISTS',
          message: 'Phone number already exists',
          messageAr: 'رقم الهاتف مسجل مسبقاً',
        },
      },
    },
  })
  async create(
    @Body() createClientDto: CreateClientDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clientsService.create(
      createClientDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Get()
  @RequirePermissions(PERMISSIONS.CLIENTS_READ)
  @ApiOperation({
    summary: 'قائمة العملاء',
    description: 'Returns paginated list of clients with search and filters.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'البحث (اسم، هاتف، إيميل)' })
  @ApiQuery({ name: 'isVip', required: false, type: Boolean, description: 'فلترة VIP' })
  @ApiQuery({ name: 'source', required: false, description: 'فلترة حسب المصدر' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async findAll(
    @Query('search') search?: string,
    @Query('isVip') isVip?: string,
    @Query('source') source?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.clientsService.findAll(this.getOrganizationId(), {
      search,
      isVip: isVip === 'true' ? true : isVip === 'false' ? false : undefined,
      source,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('duplicates')
  @RequirePermissions(PERMISSIONS.CLIENTS_READ)
  @ApiOperation({
    summary: 'البحث عن عملاء مكررين',
    description: 'Check if a phone number already exists in the system.',
  })
  @ApiQuery({ name: 'phone', required: true, description: 'رقم الهاتف للبحث' })
  async findDuplicates(@Query('phone') phone: string) {
    return this.clientsService.findDuplicates(phone, this.getOrganizationId());
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_READ)
  @ApiOperation({
    summary: 'تفاصيل العميل',
    description: 'Returns client details. Use ?includeDecrypted=true to see national ID.',
  })
  @ApiParam({ name: 'id', description: 'معرف العميل' })
  @ApiQuery({ name: 'includeDecrypted', required: false, type: Boolean })
  async findOne(
    @Param('id') id: string,
    @Query('includeDecrypted') includeDecrypted?: string,
  ) {
    return this.clientsService.findOne(
      id,
      this.getOrganizationId(),
      includeDecrypted === 'true',
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_WRITE)
  @ApiOperation({
    summary: 'تحديث العميل',
    description: 'Updates client information. Phone number cannot be changed.',
  })
  @ApiParam({ name: 'id', description: 'معرف العميل' })
  async update(
    @Param('id') id: string,
    @Body() updateClientDto: UpdateClientDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clientsService.update(
      id,
      updateClientDto,
      this.getOrganizationId(),
      userId,
    );
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.CLIENTS_DELETE)
  @ApiOperation({
    summary: 'حذف العميل',
    description: 'Soft deletes a client. Cannot delete clients with active deals.',
  })
  @ApiParam({ name: 'id', description: 'معرف العميل' })
  @ApiResponse({
    status: 400,
    description: 'لا يمكن حذف عميل لديه صفقات نشطة',
  })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clientsService.remove(id, this.getOrganizationId(), userId);
  }

  @Post(':id/merge')
  @RequirePermissions(PERMISSIONS.CLIENTS_WRITE)
  @ApiOperation({
    summary: 'دمج العميل',
    description: 'Merges this client into another. All data will be transferred.',
  })
  @ApiParam({ name: 'id', description: 'معرف العميل المصدر' })
  @ApiQuery({ name: 'targetId', required: true, description: 'معرف العميل المستهدف' })
  async merge(
    @Param('id') sourceId: string,
    @Query('targetId') targetId: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.clientsService.merge(
      sourceId,
      targetId,
      this.getOrganizationId(),
      userId,
    );
  }
}
