// ═══════════════════════════════════════════════════════════════
// Cache Service - خدمة التخزين المؤقت
// ═══════════════════════════════════════════════════════════════

import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('redis.url') || 'redis://localhost:6379';

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: () => 100,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        this.logger.log('Redis connected successfully');
      });

      this.redis.on('error', (error) => {
        this.logger.warn(`Redis connection error: ${error.message}`);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      });

      // محاولة الاتصال
      await this.redis.connect().catch(() => {
        this.logger.warn('Redis connection failed - running without cache');
      });
    } catch (error) {
      this.logger.warn(`Redis initialization failed: ${error.message}`);
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // الحصول على قيمة
  // ═══════════════════════════════════════════════════════════════

  async get<T>(key: string): Promise<T | null> {
    if (!this.redis || !this.isConnected) {
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (!value) {
        return null;
      }
      return JSON.parse(value) as T;
    } catch (error) {
      this.logger.warn(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // تعيين قيمة
  // ═══════════════════════════════════════════════════════════════

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      this.logger.warn(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // حذف مفتاح
  // ═══════════════════════════════════════════════════════════════

  async del(key: string): Promise<boolean> {
    if (!this.redis || !this.isConnected) {
      return false;
    }

    try {
      await this.redis.del(key);
      return true;
    } catch (error) {
      this.logger.warn(`Cache del error for key ${key}: ${error.message}`);
      return false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // حذف مفاتيح بنمط معين
  // ═══════════════════════════════════════════════════════════════

  async delPattern(pattern: string): Promise<number> {
    if (!this.redis || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      await this.redis.del(...keys);
      return keys.length;
    } catch (error) {
      this.logger.warn(`Cache delPattern error for pattern ${pattern}: ${error.message}`);
      return 0;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // الحصول على القيمة أو حسابها
  // ═══════════════════════════════════════════════════════════════

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    // محاولة الحصول من الـ cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // حساب القيمة
    const value = await factory();

    // تخزين في الـ cache
    await this.set(key, value, ttlSeconds);

    return value;
  }

  // ═══════════════════════════════════════════════════════════════
  // التحقق من الاتصال
  // ═══════════════════════════════════════════════════════════════

  isReady(): boolean {
    return this.isConnected && this.redis !== null;
  }
}
