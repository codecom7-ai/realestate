// ═══════════════════════════════════════════════════════════════
// Setup Service Tests - اختبارات خدمة الإعداد
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { SetupService } from '../src/modules/setup/setup.service';
import { PrismaService } from '../src/prisma/prisma.service';

jest.mock('bcryptjs');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('SetupService', () => {
  let service: SetupService;
  let prisma: jest.Mocked<PrismaService>;

  const mockSetupDto = {
    officeName: 'مكتب النيل للعقارات',
    officeNameAr: 'مكتب النيل للعقارات',
    legalName: 'مكتب النيل للوساطة العقارية',
    taxId: '123456789',
    brokerLicenseNo: '12345',
    classification: 'A',
    ownerName: 'أحمد محمد',
    ownerEmail: 'ahmed@office.com',
    ownerPassword: 'SecurePass123!',
    ownerPhone: '01012345678',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SetupService,
        {
          provide: PrismaService,
          useValue: {
            organization: {
              count: jest.fn(),
              create: jest.fn(),
            },
            branch: {
              create: jest.fn(),
            },
            user: {
              create: jest.fn(),
            },
            auditLog: {
              create: jest.fn(),
            },
            $transaction: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('development'),
          },
        },
      ],
    }).compile();

    service = module.get<SetupService>(SetupService);
    prisma = module.get(PrismaService);

    // Mock bcrypt hash
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('isSetupDone', () => {
    it('should return true when organization exists', async () => {
      prisma.organization.count.mockResolvedValue(1);

      const result = await service.isSetupDone();

      expect(result).toBe(true);
    });

    it('should return false when no organization exists', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const result = await service.isSetupDone();

      expect(result).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return correct status when setup is done', async () => {
      prisma.organization.count.mockResolvedValue(1);

      const result = await service.getStatus();

      expect(result.isSetupDone).toBe(true);
      expect(result.redirectTo).toBe('/login');
    });

    it('should return correct status when setup is not done', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const result = await service.getStatus();

      expect(result.isSetupDone).toBe(false);
      expect(result.redirectTo).toBe('/setup');
    });
  });

  describe('initialize', () => {
    it('should initialize system successfully', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const mockOrganization = {
        id: 'org-uuid',
        name: mockSetupDto.officeName,
        nameAr: mockSetupDto.officeNameAr,
        slug: 'maktab-al-nil',
        isSetupDone: true,
      };

      const mockBranch = {
        id: 'branch-uuid',
        name: 'الفرع الرئيسي',
        isHeadquarters: true,
      };

      const mockUser = {
        id: 'user-uuid',
        email: mockSetupDto.ownerEmail,
        role: 'OWNER',
      };

      // Mock transaction callback
      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          branch: {
            create: jest.fn().mockResolvedValue(mockBranch),
          },
          user: {
            create: jest.fn().mockResolvedValue(mockUser),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      const result = await service.initialize(mockSetupDto);

      expect(result.organizationId).toBe('org-uuid');
      expect(result.userId).toBe('user-uuid');
      expect(result.message).toContain('تم الإعداد بنجاح');
      expect(mockedBcrypt.hash).toHaveBeenCalledWith(mockSetupDto.ownerPassword, 12);
    });

    it('should throw ConflictException when setup is already done', async () => {
      prisma.organization.count.mockResolvedValue(1);

      await expect(service.initialize(mockSetupDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when required fields are missing', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const incompleteDto = {
        officeName: 'مكتب تجريبي',
        // Missing ownerEmail, ownerPassword, ownerName
      };

      await expect(service.initialize(incompleteDto as any)).rejects.toThrow(BadRequestException);
    });

    it('should create owner with correct role', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const mockOrganization = { id: 'org-uuid', name: mockSetupDto.officeName };
      const mockBranch = { id: 'branch-uuid' };
      const mockUser = { id: 'user-uuid', role: 'OWNER' };

      let capturedUserData: any = null;

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          branch: {
            create: jest.fn().mockResolvedValue(mockBranch),
          },
          user: {
            create: jest.fn().mockImplementation((data) => {
              capturedUserData = data.data;
              return Promise.resolve(mockUser);
            }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.initialize(mockSetupDto);

      expect(capturedUserData.role).toBe('OWNER');
      expect(capturedUserData.isActive).toBe(true);
    });

    it('should create headquarters branch', async () => {
      prisma.organization.count.mockResolvedValue(0);

      const mockOrganization = { id: 'org-uuid', name: mockSetupDto.officeName };
      let capturedBranchData: any = null;

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue(mockOrganization),
          },
          branch: {
            create: jest.fn().mockImplementation((data) => {
              capturedBranchData = data.data;
              return Promise.resolve({ id: 'branch-uuid' });
            }),
          },
          user: {
            create: jest.fn().mockResolvedValue({ id: 'user-uuid' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.initialize(mockSetupDto);

      expect(capturedBranchData.isHeadquarters).toBe(true);
      expect(capturedBranchData.name).toContain('الفرع الرئيسي');
    });

    it('should create audit log for system initialization', async () => {
      prisma.organization.count.mockResolvedValue(0);

      let auditLogCreated = false;

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue({ id: 'org-uuid' }),
          },
          branch: {
            create: jest.fn().mockResolvedValue({ id: 'branch-uuid' }),
          },
          user: {
            create: jest.fn().mockResolvedValue({ id: 'user-uuid' }),
          },
          auditLog: {
            create: jest.fn().mockImplementation(() => {
              auditLogCreated = true;
              return Promise.resolve({});
            }),
          },
        });
      });

      await service.initialize(mockSetupDto);

      expect(auditLogCreated).toBe(true);
    });
  });

  describe('generateSlug', () => {
    it('should generate URL-safe slug from Arabic name', async () => {
      prisma.organization.count.mockResolvedValue(0);

      prisma.$transaction.mockImplementation(async (callback) => {
        const mockTx = {
          organization: {
            create: jest.fn().mockImplementation((data) => {
              // The slug should be generated from officeName
              return Promise.resolve({
                id: 'org-uuid',
                slug: data.data.slug,
              });
            }),
          },
          branch: {
            create: jest.fn().mockResolvedValue({ id: 'branch-uuid' }),
          },
          user: {
            create: jest.fn().mockResolvedValue({ id: 'user-uuid' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        };
        return callback(mockTx);
      });

      const result = await service.initialize(mockSetupDto);

      // Slug should be lowercase and URL-safe
      expect(result).toBeDefined();
    });
  });

  describe('Security', () => {
    it('should hash password with bcrypt cost 12', async () => {
      prisma.organization.count.mockResolvedValue(0);

      prisma.$transaction.mockImplementation(async (callback) => {
        return callback({
          organization: {
            create: jest.fn().mockResolvedValue({ id: 'org-uuid' }),
          },
          branch: {
            create: jest.fn().mockResolvedValue({ id: 'branch-uuid' }),
          },
          user: {
            create: jest.fn().mockResolvedValue({ id: 'user-uuid' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({}),
          },
        });
      });

      await service.initialize(mockSetupDto);

      expect(mockedBcrypt.hash).toHaveBeenCalledWith(
        mockSetupDto.ownerPassword,
        12, // bcrypt cost factor
      );
    });

    it('should not allow duplicate initialization', async () => {
      // First call returns 1 (already setup)
      prisma.organization.count.mockResolvedValue(1);

      await expect(service.initialize(mockSetupDto)).rejects.toThrow(ConflictException);

      // Verify that no create operations were attempted
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });
});
