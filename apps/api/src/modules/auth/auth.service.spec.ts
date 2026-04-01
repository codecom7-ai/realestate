// ═══════════════════════════════════════════════════════════════
// Auth Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prisma: jest.Mocked<PrismaService>;
  let jwtService: jest.Mocked<JwtService>;
  let cacheService: jest.Mocked<CacheService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'Test',
    lastName: 'User',
    role: 'BROKER',
    permissions: ['leads:read', 'leads:write'],
    organizationId: 'org-123',
    branchId: null,
    isActive: true,
    organization: {
      id: 'org-123',
      name: 'Test Office',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            refreshToken: {
              create: jest.fn(),
              findFirst: jest.fn(),
              deleteMany: jest.fn(),
            },
            organization: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-secret'),
          },
        },
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get(PrismaService);
    jwtService = module.get(JwtService);
    cacheService = module.get(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password123');

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      prisma.user.findFirst.mockResolvedValue(mockUser as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login('test@example.com', 'wrong-password'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      prisma.user.findFirst.mockResolvedValue({
        ...mockUser,
        isActive: false,
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login('test@example.com', 'password123'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should return new tokens on valid refresh token', async () => {
      const mockRefreshToken = {
        id: 'rt-123',
        userId: 'user-123',
        tokenHash: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: false,
        user: mockUser,
      };

      prisma.refreshToken.findFirst.mockResolvedValue(mockRefreshToken as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.refresh('valid-refresh-token');

      expect(result.success).toBe(true);
      expect(result.data.accessToken).toBeDefined();
    });

    it('should throw UnauthorizedException for revoked token', async () => {
      const mockRefreshToken = {
        id: 'rt-123',
        userId: 'user-123',
        tokenHash: 'hashed-refresh-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isRevoked: true,
        user: mockUser,
      };

      prisma.refreshToken.findFirst.mockResolvedValue(mockRefreshToken as any);

      await expect(
        service.refresh('revoked-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke all refresh tokens for user', async () => {
      prisma.refreshToken.deleteMany.mockResolvedValue({ count: 3 });

      await service.logout('user-123');

      expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
      });
    });
  });
});
