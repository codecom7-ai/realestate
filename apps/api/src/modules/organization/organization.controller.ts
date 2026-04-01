// ═══════════════════════════════════════════════════════════════
// Organization Controller - متحكم المنظمة/المكتب
// ═══════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { OrganizationService } from './organization.service';
import {
  UpdateOrganizationDto,
  UpdateOrganizationSettingsDto,
  UploadLogoDto,
  OrganizationResponseDto,
  OrganizationSettingsResponseDto,
} from './dto/organization.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Organization')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('organization')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  // ═══════════════════════════════════════════════════════════════
  // GET /organization - Get Organization Data
  // ═══════════════════════════════════════════════════════════════

  @Get()
  @RequirePermissions(PERMISSIONS.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'Get organization/office data' })
  @ApiResponse({
    status: 200,
    description: 'Organization data retrieved successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganization(@Req() req: any) {
    const organization = await this.organizationService.getOrganization(
      req.user.organizationId,
    );

    return {
      success: true,
      data: organization,
      traceId: crypto.randomUUID(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH /organization - Update Organization Data
  // ═══════════════════════════════════════════════════════════════

  @Patch()
  @RequirePermissions(PERMISSIONS.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update organization/office data (Owner/GM only)' })
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    type: OrganizationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid data or slug already exists' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateOrganization(
    @Body() dto: UpdateOrganizationDto,
    @Req() req: any,
  ) {
    const organization = await this.organizationService.updateOrganization(
      req.user.organizationId,
      dto,
      req.user.id,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: organization,
      message: 'Organization updated successfully — تم تحديث بيانات المكتب',
      traceId: crypto.randomUUID(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // POST /organization/logo - Upload Logo
  // ═══════════════════════════════════════════════════════════════

  @Post('logo')
  @RequirePermissions(PERMISSIONS.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Upload organization logo (Owner/GM only)' })
  @ApiResponse({
    status: 201,
    description: 'Logo uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            logoUrl: { type: 'string' },
          },
        },
        message: { type: 'string' },
        traceId: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid upload data' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async uploadLogo(
    @Body() dto: UploadLogoDto,
    @Req() req: any,
  ) {
    // Construct logo URL from key
    // In production, this would be the full CDN URL
    const logoUrl = dto.key;

    const result = await this.organizationService.uploadLogo(
      req.user.organizationId,
      dto,
      req.user.id,
      logoUrl,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: result,
      message: 'Logo uploaded successfully — تم رفع الشعار بنجاح',
      traceId: crypto.randomUUID(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // GET /organization/settings - Get Organization Settings
  // ═══════════════════════════════════════════════════════════════

  @Get('settings')
  @RequirePermissions(PERMISSIONS.ORG_SETTINGS_READ)
  @ApiOperation({ summary: 'Get organization settings' })
  @ApiResponse({
    status: 200,
    description: 'Settings retrieved successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getSettings(@Req() req: any) {
    const settings = await this.organizationService.getSettings(
      req.user.organizationId,
    );

    return {
      success: true,
      data: settings,
      traceId: crypto.randomUUID(),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // PATCH /organization/settings - Update Organization Settings
  // ═══════════════════════════════════════════════════════════════

  @Patch('settings')
  @RequirePermissions(PERMISSIONS.ORG_SETTINGS_WRITE)
  @ApiOperation({ summary: 'Update organization settings (Owner/GM only)' })
  @ApiResponse({
    status: 200,
    description: 'Settings updated successfully',
    type: OrganizationSettingsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid settings data' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async updateSettings(
    @Body() dto: UpdateOrganizationSettingsDto,
    @Req() req: any,
  ) {
    const settings = await this.organizationService.updateSettings(
      req.user.organizationId,
      dto,
      req.user.id,
      req.ip,
      req.headers['user-agent'],
    );

    return {
      success: true,
      data: settings,
      message: 'Settings updated successfully — تم تحديث الإعدادات',
      traceId: crypto.randomUUID(),
    };
  }
}
