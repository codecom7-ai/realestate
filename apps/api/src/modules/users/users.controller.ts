// ═══════════════════════════════════════════════════════════════
// Users Controller
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
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator';
import { PERMISSIONS } from '@realestate/shared-types';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'branchId', required: false })
  @ApiQuery({ name: 'isActive', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Req() req: any,
    @Query('role') role?: string,
    @Query('branchId') branchId?: string,
    @Query('isActive') isActive?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.usersService.findAll(req.user.organizationId, {
      role,
      branchId,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });

    return {
      success: true,
      ...result,
      traceId: crypto.randomUUID(),
    };
  }

  @Get(':id')
  @RequirePermissions(PERMISSIONS.USERS_READ)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = await this.usersService.findOne(id, req.user.organizationId);
    return {
      success: true,
      data: user,
      traceId: crypto.randomUUID(),
    };
  }

  @Post()
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() dto: CreateUserDto, @Req() req: any) {
    const user = await this.usersService.create(
      dto,
      req.user.organizationId,
      req.user.id,
    );
    return {
      success: true,
      data: user,
      message: 'User created successfully',
      traceId: crypto.randomUUID(),
    };
  }

  @Patch(':id')
  @RequirePermissions(PERMISSIONS.USERS_WRITE)
  @ApiOperation({ summary: 'Update user' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Req() req: any,
  ) {
    const user = await this.usersService.update(
      id,
      dto,
      req.user.organizationId,
      req.user.id,
    );
    return {
      success: true,
      data: user,
      message: 'User updated successfully',
      traceId: crypto.randomUUID(),
    };
  }

  @Delete(':id')
  @RequirePermissions(PERMISSIONS.USERS_DELETE)
  @ApiOperation({ summary: 'Delete user' })
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.usersService.remove(id, req.user.organizationId, req.user.id);
    return {
      success: true,
      message: 'User deleted successfully',
      traceId: crypto.randomUUID(),
    };
  }
}
