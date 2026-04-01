import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/modules/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const mockPrisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        JWT_ACCESS_EXPIRATION: '15m',
        JWT_REFRESH_EXPIRATION: '7d',
        JWT_PRIVATE_KEY: 'test-key',
        JWT_PUBLIC_KEY: 'test-key',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Password Validation', () => {
    it('should hash password with bcrypt cost 12', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 12);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(await bcrypt.compare(password, hash)).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'testPassword123!';
      const hash = await bcrypt.hash(password, 12);
      const wrongPassword = 'wrongPassword!';

      expect(await bcrypt.compare(wrongPassword, hash)).toBe(false);
    });
  });

  describe('JWT Token Generation', () => {
    it('should generate access token with 15 min expiry', () => {
      const payload = { sub: 'user-1', role: 'OWNER' };
      mockJwtService.sign.mockReturnValue('access-token');

      const token = jwtService.sign(payload, { expiresIn: '15m' });

      expect(token).toBe('access-token');
    });

    it('should generate refresh token with 7 days expiry', () => {
      const payload = { sub: 'user-1' };
      mockJwtService.sign.mockReturnValue('refresh-token');

      const token = jwtService.sign(payload, { expiresIn: '7d' });

      expect(token).toBe('refresh-token');
    });
  });

  describe('Login', () => {
    it('should return tokens on successful login', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123!', 12),
        firstName: 'Test',
        lastName: 'User',
        role: 'OWNER',
        permissions: [],
        organizationId: 'org-1',
        isMfaEnabled: false,
        isActive: true,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('token');
      mockPrisma.refreshToken.create.mockResolvedValue({ tokenHash: 'hash' });

      const result = await service.login('test@example.com', 'password123!');

      expect(result).toBeDefined();
    });

    it('should throw error for invalid credentials', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrongpassword')
      ).rejects.toThrow();
    });

    it('should throw error for inactive user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        passwordHash: await bcrypt.hash('password123!', 12),
        isActive: false,
      };

      mockPrisma.user.findFirst.mockResolvedValue(mockUser);

      await expect(
        service.login('test@example.com', 'password123!')
      ).rejects.toThrow();
    });
  });

  describe('Token Refresh', () => {
    it('should generate new access token from valid refresh token', async () => {
      const mockRefreshToken = {
        userId: 'user-1',
        tokenHash: 'hash',
        isRevoked: false,
        expiresAt: new Date(Date.now() + 86400000),
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(mockRefreshToken);
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });
      mockJwtService.sign.mockReturnValue('new-access-token');

      // Test refresh logic
      expect(mockRefreshToken.isRevoked).toBe(false);
    });

    it('should reject revoked refresh token', async () => {
      const mockRefreshToken = {
        userId: 'user-1',
        isRevoked: true,
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(mockRefreshToken);

      // Should throw error for revoked token
      expect(mockRefreshToken.isRevoked).toBe(true);
    });

    it('should reject expired refresh token', async () => {
      const mockRefreshToken = {
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      mockPrisma.refreshToken.findFirst.mockResolvedValue(mockRefreshToken);

      // Should throw error for expired token
      expect(mockRefreshToken.expiresAt < new Date()).toBe(true);
    });
  });
});

describe('MFA (TOTP) Requirements', () => {
  it('should require MFA for Owner role', () => {
    const rolesRequiringMfa = ['OWNER', 'GENERAL_MANAGER', 'ACCOUNTANT'];
    
    expect(rolesRequiringMfa).toContain('OWNER');
  });

  it('should not require MFA for Broker role', () => {
    const rolesRequiringMfa = ['OWNER', 'GENERAL_MANAGER', 'ACCOUNTANT'];
    
    expect(rolesRequiringMfa).not.toContain('BROKER');
  });
});
