// ═══════════════════════════════════════════════════════════════
// Properties Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { PropertiesService } from './properties.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';

describe('PropertiesService', () => {
  let service: PropertiesService;
  let prisma: jest.Mocked<PrismaService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockProperty = {
    id: 'property-123',
    organizationId: 'org-123',
    title: 'شقة في المعادي',
    titleAr: 'شقة في المعادي',
    propertyType: 'APARTMENT',
    status: 'AVAILABLE',
    city: 'القاهرة',
    district: 'المعادي',
    areaM2: 150,
    bedrooms: 3,
    bathrooms: 2,
    askingPrice: 2000000,
    currency: 'EGP',
    createdAt: new Date(),
    images: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertiesService,
        {
          provide: PrismaService,
          useValue: {
            property: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            propertyLock: {
              create: jest.fn(),
              findFirst: jest.fn(),
              delete: jest.fn(),
            },
            propertyPriceHistory: {
              create: jest.fn(),
            },
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
      prisma.property.create.mockResolvedValue(mockProperty as any);

      const createDto = {
        title: 'شقة في المعادي',
        propertyType: 'APARTMENT',
        city: 'القاهرة',
        areaM2: 150,
        askingPrice: 2000000,
      };

      const result = await service.create('org-123', createDto, 'user-123');

      expect(result.title).toBe('شقة في المعادي');
      expect(prisma.property.create).toHaveBeenCalled();
    });
  });

  describe('lock', () => {
    it('should lock a property successfully', async () => {
      prisma.property.findFirst.mockResolvedValue({
        ...mockProperty,
        status: 'AVAILABLE',
      } as any);
      
      prisma.propertyLock.create.mockResolvedValue({
        id: 'lock-123',
        propertyId: 'property-123',
        dealId: 'deal-123',
        lockType: 'confirmed',
      } as any);

      const result = await service.lock('property-123', 'org-123', {
        dealId: 'deal-123',
        lockType: 'confirmed',
      });

      expect(result.propertyId).toBe('property-123');
      expect(eventEmitter.emit).toHaveBeenCalledWith('property.locked', expect.any(Object));
    });

    it('should throw ConflictException for already locked property', async () => {
      prisma.property.findFirst.mockResolvedValue({
        ...mockProperty,
        status: 'RESERVED_CONFIRMED',
      } as any);

      await expect(
        service.lock('property-123', 'org-123', {
          dealId: 'deal-123',
          lockType: 'confirmed',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('unlock', () => {
    it('should unlock a property successfully', async () => {
      prisma.propertyLock.findFirst.mockResolvedValue({
        id: 'lock-123',
        propertyId: 'property-123',
        dealId: 'deal-123',
      } as any);
      
      prisma.propertyLock.delete.mockResolvedValue({} as any);
      prisma.property.update.mockResolvedValue(mockProperty as any);

      const result = await service.unlock('property-123', 'org-123', 'deal-123');

      expect(prisma.propertyLock.delete).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('property.unlocked', expect.any(Object));
    });
  });

  describe('getStats', () => {
    it('should return property statistics', async () => {
      prisma.property.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(50)  // available
        .mockResolvedValueOnce(20)  // reserved
        .mockResolvedValueOnce(30); // sold

      prisma.property.findMany.mockResolvedValue([]);

      const result = await service.getStats('org-123');

      expect(result.total).toBe(100);
      expect(result.available).toBe(50);
    });
  });
});
