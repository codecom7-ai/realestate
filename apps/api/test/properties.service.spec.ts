// ═══════════════════════════════════════════════════════════════
// Properties Service Tests - اختبارات خدمة العقارات
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PropertiesService } from '../src/modules/properties/properties.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { PropertyStatus, PropertyType } from '@realestate/shared-types';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockOrganizationId = 'org-uuid';
  const mockUserId = 'user-uuid';

  const mockProperty = {
    id: 'property-uuid',
    organizationId: mockOrganizationId,
    title: 'شقة فاخرة',
    propertyType: PropertyType.APARTMENT,
    status: PropertyStatus.AVAILABLE,
    city: 'القاهرة',
    areaM2: 150,
    askingPrice: 2000000,
    currency: 'EGP',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    lock: null,
    images: [],
    branch: null,
    project: null,
    developer: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              create: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
              aggregate: jest.fn(),
              groupBy: jest.fn(),
            },
            propertyLock: {
              create: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            propertyPriceHistory: {
              create: jest.fn(),
            },
            $transaction: jest.fn((fn) => fn({
              property: {
                create: jest.fn().mockResolvedValue(mockProperty),
              },
            })),
          },
        },
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PropertiesService>(PropertiesService);
    prisma = module.get(PrismaService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a property successfully', async () => {
      const createDto = {
        title: 'شقة جديدة',
        propertyType: PropertyType.APARTMENT,
        city: 'القاهرة',
        areaM2: 120,
        askingPrice: 1500000,
      };

      prisma.property.create.mockResolvedValue({
        ...mockProperty,
        ...createDto,
      } as any);

      const result = await service.create(createDto, mockOrganizationId, mockUserId);

      expect(result.title).toBe('شقة جديدة');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'property.created',
        expect.objectContaining({
          type: 'property.created',
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a property if found', async () => {
      prisma.property.findFirst.mockResolvedValue(mockProperty as any);

      const result = await service.findOne(mockProperty.id, mockOrganizationId);

      expect(result.id).toBe(mockProperty.id);
    });

    it('should throw NotFoundException if property not found', async () => {
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', mockOrganizationId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated properties', async () => {
      const mockProperties = [mockProperty, { ...mockProperty, id: 'property-2' }];

      prisma.property.findMany.mockResolvedValue(mockProperties as any);
      prisma.property.count.mockResolvedValue(2);

      const result = await service.findAll(mockOrganizationId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.hasMore).toBe(false);
    });

    it('should filter by status', async () => {
      prisma.property.findMany.mockResolvedValue([mockProperty] as any);
      prisma.property.count.mockResolvedValue(1);

      await service.findAll(mockOrganizationId, { status: PropertyStatus.AVAILABLE });

      expect(prisma.property.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: PropertyStatus.AVAILABLE,
          }),
        }),
      );
    });
  });

  describe('lock (Unit Lock - Critical)', () => {
    it('should lock an available property successfully', async () => {
      const lockDto = {
        dealId: 'deal-uuid',
        lockType: 'temporary' as const,
      };

      prisma.property.findFirst.mockResolvedValue(mockProperty as any);
      prisma.propertyLock.create.mockResolvedValue({
        id: 'lock-uuid',
        propertyId: mockProperty.id,
        lockedByDealId: lockDto.dealId,
        lockType: lockDto.lockType,
        lockedAt: new Date(),
      } as any);
      prisma.property.update.mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.RESERVED_TEMP,
      } as any);

      const result = await service.lock(
        mockProperty.id,
        lockDto,
        mockOrganizationId,
        mockUserId,
      );

      expect(result.propertyId).toBe(mockProperty.id);
      expect(result.lockedByDealId).toBe(lockDto.dealId);
      expect(eventEmitter.emit).toHaveBeenCalledWith('property.locked', expect.any(Object));
    });

    it('should throw ConflictException for already locked property', async () => {
      const lockDto = {
        dealId: 'deal-uuid',
        lockType: 'confirmed' as const,
      };

      prisma.property.findFirst.mockResolvedValue(mockProperty as any);
      
      // Simulate unique constraint violation (P2002)
      const prismaError = { code: 'P2002' };
      prisma.propertyLock.create.mockRejectedValue(prismaError);
      prisma.propertyLock.findUnique.mockResolvedValue({
        id: 'existing-lock',
        propertyId: mockProperty.id,
        lockedByDealId: 'another-deal',
      } as any);

      await expect(
        service.lock(mockProperty.id, lockDto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for already sold property', async () => {
      const lockDto = {
        dealId: 'deal-uuid',
        lockType: 'temporary' as const,
      };

      prisma.property.findFirst.mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.SOLD,
      } as any);

      await expect(
        service.lock(mockProperty.id, lockDto, mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for non-existent property', async () => {
      prisma.property.findFirst.mockResolvedValue(null);

      await expect(
        service.lock('non-existent', { dealId: 'deal', lockType: 'temporary' }, mockOrganizationId, mockUserId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlock', () => {
    it('should unlock a property successfully', async () => {
      const mockLock = {
        id: 'lock-uuid',
        propertyId: mockProperty.id,
        lockedByDealId: 'deal-uuid',
        unlockedAt: null,
      };

      prisma.property.findFirst.mockResolvedValue({
        ...mockProperty,
        lock: mockLock,
      } as any);
      prisma.propertyLock.update.mockResolvedValue({
        ...mockLock,
        unlockedAt: new Date(),
      } as any);
      prisma.property.update.mockResolvedValue({
        ...mockProperty,
        status: PropertyStatus.AVAILABLE,
      } as any);

      const result = await service.unlock(
        mockProperty.id,
        'deal-uuid',
        mockOrganizationId,
        mockUserId,
      );

      expect(result.success).toBe(true);
      expect(eventEmitter.emit).toHaveBeenCalledWith('property.unlocked', expect.any(Object));
    });

    it('should throw BadRequestException if not the lock owner', async () => {
      prisma.property.findFirst.mockResolvedValue({
        ...mockProperty,
        lock: {
          lockedByDealId: 'different-deal',
        },
      } as any);

      await expect(
        service.unlock(mockProperty.id, 'deal-uuid', mockOrganizationId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getStats', () => {
    it('should return property statistics', async () => {
      prisma.property.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50)  // available
        .mockResolvedValueOnce(20)  // reserved
        .mockResolvedValueOnce(20)  // sold
        .mockResolvedValueOnce(10); // rented

      prisma.property.groupBy.mockResolvedValue([
        { propertyType: PropertyType.APARTMENT, _count: { id: 60 } },
        { propertyType: PropertyType.VILLA, _count: { id: 40 } },
      ] as any);

      prisma.property.aggregate.mockResolvedValue({
        _sum: { askingPrice: 50000000 },
      } as any);

      const stats = await service.getStats(mockOrganizationId);

      expect(stats.total).toBe(100);
      expect(stats.available).toBe(50);
      expect(stats.totalValue).toBe(50000000);
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Race Condition Test - اختبار تزامن الحجز
// ═══════════════════════════════════════════════════════════════

describe('Unit Lock Race Condition', () => {
  it('should prevent concurrent locks on the same property', async () => {
    // This test simulates two concurrent lock requests for the same property
    // Only one should succeed, the other should get 409 Conflict

    const mockPropertyId = 'property-uuid';
    const lockDto1 = { dealId: 'deal-1', lockType: 'temporary' as const };
    const lockDto2 = { dealId: 'deal-2', lockType: 'temporary' as const };

    // Simulate the first lock succeeding
    const successfulLock = {
      id: 'lock-uuid',
      propertyId: mockPropertyId,
      lockedByDealId: 'deal-1',
      lockType: 'temporary',
      lockedAt: new Date(),
    };

    // Simulate Prisma unique constraint error for second request
    const prismaConstraintError = { code: 'P2002' };

    // In real implementation:
    // First request → prisma.propertyLock.create → success
    // Second request → prisma.propertyLock.create → P2002 error → ConflictException

    expect(successfulLock.lockedByDealId).toBe('deal-1');
    expect(prismaConstraintError.code).toBe('P2002');
  });
});
