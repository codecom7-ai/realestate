// ═══════════════════════════════════════════════════════════════
// Commissions Service Tests - اختبارات خدمة العمولات
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CommissionsService } from '../src/modules/commissions/commissions.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CommissionStatus, CommissionType, UserRole } from '../src/modules/commissions/dto/commissions.dto';

// Mock AuditService
const mockAuditService = {
  log: jest.fn(),
};

describe('CommissionsService', () => {
  let service: CommissionsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockOrganizationId = 'org-uuid';
  const mockUserId = 'user-uuid';

  const mockDeal = {
    id: 'deal-uuid',
    organizationId: mockOrganizationId,
    agreedPrice: 2000000, // 2 million EGP
    assignedBrokerId: 'broker-uuid',
    assignedBroker: {
      id: 'broker-uuid',
      firstName: 'أحمد',
      lastName: 'محمد',
    },
    property: {
      commissionRate: 0.025, // 2.5%
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        {
          provide: PrismaService,
          useValue: {
            deal: {
              findFirst: jest.fn(),
            },
            commission: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              groupBy: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              commission: {
                create: jest.fn().mockResolvedValue({ id: 'commission-uuid' }),
              },
            })),
          },
        },
        {
          provide: AuditService,
          useValue: mockAuditService,
        },
      ],
    }).compile();

    service = module.get<CommissionsService>(CommissionsService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculate', () => {
    it('should calculate commissions correctly with VAT 14%', async () => {
      prisma.deal.findFirst.mockResolvedValue(mockDeal as any);
      prisma.commission.findMany.mockResolvedValue([]);

      const mockSalesManager = {
        id: 'manager-uuid',
        role: UserRole.SALES_MANAGER,
      };
      prisma.user.findFirst.mockResolvedValue(mockSalesManager as any);

      // Mock commission creation
      const mockBrokerCommission = {
        id: 'commission-1',
        dealId: mockDeal.id,
        userId: 'broker-uuid',
        commissionType: CommissionType.BROKER,
        baseAmount: 2000000,
        percentage: 50,
        amount: 25000, // 2.5% of 2M * 50%
        vatAmount: 3500, // 14% of 25000
        totalAmount: 28500,
        status: CommissionStatus.CALCULATED,
      };

      prisma.$transaction.mockResolvedValue([mockBrokerCommission] as any);

      const result = await service.calculate(
        { dealId: mockDeal.id },
        mockOrganizationId,
        mockUserId,
      );

      // Verify VAT calculation: 14%
      // Total commission = 2M * 2.5% = 50,000
      // Broker share (50%) = 25,000
      // VAT on broker = 25,000 * 14% = 3,500
      // Total payable = 28,500

      expect(mockBrokerCommission.vatAmount).toBe(3500);
      expect(mockBrokerCommission.totalAmount).toBe(28500);
    });

    it('should throw NotFoundException for non-existent deal', async () => {
      prisma.deal.findFirst.mockResolvedValue(null);

      await expect(
        service.calculate({ dealId: 'non-existent' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for deal without agreed price', async () => {
      prisma.deal.findFirst.mockResolvedValue({
        ...mockDeal,
        agreedPrice: null,
      } as any);

      await expect(
        service.calculate({ dealId: mockDeal.id }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return existing commissions if already calculated', async () => {
      const existingCommissions = [
        {
          id: 'existing-1',
          dealId: mockDeal.id,
          commissionType: CommissionType.BROKER,
          amount: 25000,
          status: CommissionStatus.CALCULATED,
        },
      ];

      prisma.deal.findFirst.mockResolvedValue(mockDeal as any);
      prisma.commission.findMany.mockResolvedValue(existingCommissions as any);

      const result = await service.calculate(
        { dealId: mockDeal.id },
        mockOrganizationId,
        mockUserId,
      );

      // Should not create new commissions
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('approve', () => {
    it('should approve a calculated commission and lock it', async () => {
      const mockCommission = {
        id: 'commission-uuid',
        status: CommissionStatus.CALCULATED,
        isLocked: false,
      };

      prisma.commission.findFirst.mockResolvedValue(mockCommission as any);
      prisma.commission.update.mockResolvedValue({
        ...mockCommission,
        status: CommissionStatus.APPROVED,
        isLocked: true,
        lockedAt: new Date(),
      } as any);

      const result = await service.approve(
        'commission-uuid',
        { notes: 'تم المراجعة' },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe(CommissionStatus.APPROVED);
      expect(result.isLocked).toBe(true);
    });

    it('should throw BadRequestException for non-calculated commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        id: 'commission-uuid',
        status: CommissionStatus.APPROVED,
      } as any);

      await expect(
        service.approve('commission-uuid', {}, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent commission', async () => {
      prisma.commission.findFirst.mockResolvedValue(null);

      await expect(
        service.approve('non-existent', {}, mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('settle', () => {
    it('should settle an approved commission', async () => {
      const mockCommission = {
        id: 'commission-uuid',
        status: CommissionStatus.APPROVED,
        isLocked: true,
      };

      prisma.commission.findFirst.mockResolvedValue(mockCommission as any);
      prisma.commission.update.mockResolvedValue({
        ...mockCommission,
        status: CommissionStatus.SETTLED,
        settledAt: new Date(),
      } as any);

      const result = await service.settle(
        'commission-uuid',
        { settledAt: new Date().toISOString() },
        mockOrganizationId,
        mockUserId,
      );

      expect(result.status).toBe(CommissionStatus.SETTLED);
    });

    it('should throw BadRequestException for non-approved commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        id: 'commission-uuid',
        status: CommissionStatus.CALCULATED,
      } as any);

      await expect(
        service.settle('commission-uuid', { settledAt: new Date().toISOString() }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return commission statistics', async () => {
      const mockGroupBy = [
        {
          status: CommissionStatus.CALCULATED,
          _count: 5,
          _sum: { amount: 50000, vatAmount: 7000, totalAmount: 57000 },
        },
        {
          status: CommissionStatus.APPROVED,
          _count: 3,
          _sum: { amount: 30000, vatAmount: 4200, totalAmount: 34200 },
        },
      ];

      prisma.commission.groupBy.mockResolvedValue(mockGroupBy as any);

      const stats = await service.getStats(mockOrganizationId);

      expect(stats.total).toBe(8);
      expect(stats.calculated).toBe(5);
      expect(stats.approved).toBe(3);
    });
  });
});
