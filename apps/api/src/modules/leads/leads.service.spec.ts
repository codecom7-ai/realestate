// ═══════════════════════════════════════════════════════════════
// Leads Service Unit Tests
// ═══════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../cache/cache.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: jest.Mocked<PrismaService>;
  let cacheService: jest.Mocked<CacheService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockLead = {
    id: 'lead-123',
    organizationId: 'org-123',
    clientId: 'client-123',
    assignedToId: 'user-123',
    stage: 'NEW',
    source: 'whatsapp',
    budget: 1000000,
    budgetCurrency: 'EGP',
    preferredAreas: ['Maadi', 'Nasr City'],
    propertyTypes: ['APARTMENT'],
    aiScore: 75,
    createdAt: new Date(),
    updatedAt: new Date(),
    client: {
      id: 'client-123',
      firstName: 'Ahmed',
      lastName: 'Mohamed',
      phone: '+201234567890',
    },
    assignedTo: {
      id: 'user-123',
      firstName: 'Agent',
      lastName: 'One',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: {
            lead: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              count: jest.fn(),
            },
            client: {
              findFirst: jest.fn(),
            },
            user: {
              findFirst: jest.fn(),
            },
            activity: {
              create: jest.fn(),
            },
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
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get(PrismaService);
    cacheService = module.get(CacheService);
    eventEmitter = module.get(EventEmitter2);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a lead successfully', async () => {
      prisma.client.findFirst.mockResolvedValue({ id: 'client-123' } as any);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-123' } as any);
      prisma.lead.create.mockResolvedValue(mockLead as any);

      const createDto = {
        clientId: 'client-123',
        assignedToId: 'user-123',
        source: 'whatsapp',
        budget: 1000000,
      };

      const result = await service.create('org-123', createDto, 'user-123');

      expect(result.id).toBe('lead-123');
      expect(prisma.lead.create).toHaveBeenCalled();
      expect(eventEmitter.emit).toHaveBeenCalledWith('lead.created', expect.any(Object));
    });

    it('should throw NotFoundException for non-existent client', async () => {
      prisma.client.findFirst.mockResolvedValue(null);

      const createDto = {
        clientId: 'non-existent-client',
        source: 'whatsapp',
      };

      await expect(
        service.create('org-123', createDto, 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated leads', async () => {
      prisma.lead.findMany.mockResolvedValue([mockLead] as any);
      prisma.lead.count.mockResolvedValue(1);

      const result = await service.findAll('org-123', { page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter leads by stage', async () => {
      prisma.lead.findMany.mockResolvedValue([mockLead] as any);
      prisma.lead.count.mockResolvedValue(1);

      await service.findAll('org-123', { stage: 'NEW' });

      expect(prisma.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            stage: 'NEW',
          }),
        }),
      );
    });
  });

  describe('changeStage', () => {
    it('should change lead stage successfully', async () => {
      prisma.lead.findFirst.mockResolvedValue(mockLead as any);
      prisma.lead.update.mockResolvedValue({
        ...mockLead,
        stage: 'CONTACTED',
      } as any);

      const result = await service.changeStage(
        'lead-123',
        'org-123',
        'CONTACTED',
        'user-123',
      );

      expect(result.stage).toBe('CONTACTED');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'lead.stage_changed',
        expect.any(Object),
      );
    });

    it('should throw NotFoundException for non-existent lead', async () => {
      prisma.lead.findFirst.mockResolvedValue(null);

      await expect(
        service.changeStage('non-existent', 'org-123', 'CONTACTED', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('should assign lead to user successfully', async () => {
      prisma.lead.findFirst.mockResolvedValue(mockLead as any);
      prisma.user.findFirst.mockResolvedValue({ id: 'user-456' } as any);
      prisma.lead.update.mockResolvedValue({
        ...mockLead,
        assignedToId: 'user-456',
      } as any);

      const result = await service.assign('lead-123', 'org-123', 'user-456', 'user-123');

      expect(result.assignedToId).toBe('user-456');
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'lead.assigned',
        expect.any(Object),
      );
    });
  });
});
