// ═══════════════════════════════════════════════════════════════
// Global Type Declarations - تعريفات الأنواع العامة
// ═══════════════════════════════════════════════════════════════

import { FastifyRequest as BaseFastifyRequest } from 'fastify';

// ═══════════════════════════════════════════════════════════════
// JWT User Payload - بيانات المستخدم من JWT
// ═══════════════════════════════════════════════════════════════

export interface JwtUserPayload {
  id: string;
  sub: string;
  email: string;
  role: string;
  branchId?: string;
  organizationId: string;
  permissions: string[];
  iat?: number;
  exp?: number;
}

// ═══════════════════════════════════════════════════════════════
// Augment Fastify Request - توسيع طلب Fastify
// ═══════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUserPayload;
  }
}

// ═══════════════════════════════════════════════════════════════
// Augment Express Request (for NestJS compatibility)
// ═══════════════════════════════════════════════════════════════

declare module 'express' {
  interface Request {
    user?: JwtUserPayload;
  }
}

// ═══════════════════════════════════════════════════════════════
// Organization Request Type - نوع طلب المؤسسة
// ═══════════════════════════════════════════════════════════════

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      DATABASE_URL: string;
      REDIS_URL: string;
      JWT_PRIVATE_KEY: string;
      JWT_PUBLIC_KEY: string;
      ENCRYPTION_KEY: string;
      SETUP_DONE?: string;
      ORG_ID?: string;
      ETA_IDENTITY_URL?: string;
      ETA_API_URL?: string;
      ETA_CLIENT_ID?: string;
      ETA_CLIENT_SECRET?: string;
      ANTHROPIC_API_KEY?: string;
      GOOGLE_AI_API_KEY?: string;
      FRONTEND_URL?: string;
    }
  }
}

export {};
