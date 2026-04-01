// ═══════════════════════════════════════════════════════════════
// Setup Controller - One-time system initialization
// ═══════════════════════════════════════════════════════════════

import { Controller, Get, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

import { SetupService } from './setup.service';
import { SetupDto, SetupStatusDto } from './dto/setup.dto';

@ApiTags('Setup')
@Controller('setup')
export class SetupController {
  constructor(private readonly setupService: SetupService) {}

  @Get('status')
  @ApiOperation({ summary: 'Check if setup is complete' })
  @ApiResponse({
    status: 200,
    description: 'Setup status',
    type: SetupStatusDto,
  })
  async getStatus(): Promise<SetupStatusDto> {
    return this.setupService.getStatus();
  }

  @Post('initialize')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Initialize the system (one-time only)' })
  @ApiResponse({
    status: 201,
    description: 'System initialized successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            organizationId: { type: 'string' },
            userId: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'System already initialized',
    schema: {
      properties: {
        success: { type: 'boolean', example: false },
        error: {
          type: 'object',
          properties: {
            code: { type: 'string', example: 'ALREADY_SETUP' },
            message: { type: 'string' },
            messageAr: { type: 'string' },
          },
        },
      },
    },
  })
  async initialize(@Body() dto: SetupDto) {
    const result = await this.setupService.initialize(dto);
    return {
      success: true,
      data: result,
      traceId: crypto.randomUUID(),
    };
  }
}
