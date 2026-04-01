// ═══════════════════════════════════════════════════════════════
// Commissions Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { CommissionsService } from './commissions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CommissionsService', () => {
  let service: CommissionsService;
  let prisma: jest.Mocked<PrismaService>;

  const mockCommission = {
    id: 'commission-123',
    organizationId: 'org-123',
    dealId: 'deal-123',
    userId: 'user-123',
    commissionType: 'broker',
    baseAmount: 2000000,
    percentage: 2,
    amount: 40000,
    vatAmount: 5600,
    totalAmount: 45600,
    currency: 'EGP',
    status: 'CALCULATED',
    isLocked: false,
    createdAt: new Date(),
  };

  const mockDeal = {
    id: 'deal-123',
    organizationId: 'org-123',
    agreedPrice: 2000000,
    currency: 'EGP',
    stage: 'CLOSED',
    assignedBrokerId: 'user-123',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommissionsService,
        {
          provide: PrismaService,
          useValue: {
            commission: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
            },
            deal: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
          },
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
    it('should calculate commission for a deal', async () => {
      prisma.deal.findFirst.mockResolvedValue(mockDeal as any);
      prisma.user.findFirst.mockResolvedValue({
        id: 'user-123',
        role: 'BROKER',
      } as any);
      prisma.commission.create.mockResolvedValue(mockCommission as any);

      const result = await service.calculate('deal-123', 'org-123');

      expect(result.amount).toBe(40000);
      expect(result.vatAmount).toBe(5600); // 14% VAT
      expect(result.totalAmount).toBe(45600);
    });

    it('should throw NotFoundException for non-existent deal', async () => {
      prisma.deal.findFirst.mockResolvedValue(null);

      await expect(
        service.calculate('non-existent', 'org-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approve', () => {
    it('should approve a commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        ...mockCommission,
        isLocked: false,
      } as any);
      
      prisma.commission.update.mockResolvedValue({
        ...mockCommission,
        status: 'APPROVED',
      } as any);

      const result = await service.approve('commission-123', 'org-123', 'user-123');

      expect(result.status).toBe('APPROVED');
    });

    it('should throw BadRequestException for locked commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        ...mockCommission,
        isLocked: true,
      } as any);

      await expect(
        service.approve('commission-123', 'org-123', 'user-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('settle', () => {
    it('should settle an approved commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        ...mockCommission,
        status: 'APPROVED',
        isLocked: true,
      } as any);
      
      prisma.commission.update.mockResolvedValue({
        ...mockCommission,
        status: 'SETTLED',
      } as any);

      const result = await service.settle('commission-123', 'org-123');

      expect(result.status).toBe('SETTLED');
    });

    it('should throw BadRequestException for non-approved commission', async () => {
      prisma.commission.findFirst.mockResolvedValue({
        ...mockCommission,
        status: 'CALCULATED',
      } as any);

      await expect(
        service.settle('commission-123', 'org-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return commission statistics', async () => {
      prisma.commission.aggregate
        .mockResolvedValueOnce({ _sum: { totalAmount: 500000 } }) // total calculated
        .mockResolvedValueOnce({ _sum: { totalAmount: 300000 } }) // approved
        .mockResolvedValueOnce({ _sum: { totalAmount: 100000 } }); // paid

      prisma.commission.count.mockResolvedValue(50);

      const result = await service.getStats('org-123');

      expect(result.totalCalculated).toBe(500000);
      expect(result.totalApproved).toBe(300000);
    });
  });
});
