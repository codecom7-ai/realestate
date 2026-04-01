// ═══════════════════════════════════════════════════════════════
// App Configuration
// ═══════════════════════════════════════════════════════════════

import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  setupDone: process.env.SETUP_DONE === 'true',
  orgId: process.env.ORG_ID || '',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || '',
  privateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
  publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n') || '',
  accessTokenExpiry: '15m',
  refreshTokenExpiry: '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
}));

export const etaConfig = registerAs('eta', () => ({
  identityUrl: process.env.ETA_IDENTITY_URL || 'https://id.preprod.eta.gov.eg',
  apiUrl: process.env.ETA_API_URL || 'https://api.preprod.invoicing.eta.gov.eg',
  clientId: process.env.ETA_CLIENT_ID || '',
  clientSecret: process.env.ETA_CLIENT_SECRET || '',
  presharedKey: process.env.ETA_PRESHARED_KEY || '',
}));

export const aiConfig = registerAs('ai', () => ({
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  googleAiApiKey: process.env.GOOGLE_AI_API_KEY || '',
  openrouterApiKey: process.env.OPENROUTER_API_KEY || '',
  minimaxApiKey: process.env.MINIMAX_API_KEY || '',
}));

export const storageConfig = registerAs('storage', () => ({
  r2AccountId: process.env.R2_ACCOUNT_ID || '',
  r2AccessKey: process.env.R2_ACCESS_KEY || '',
  r2SecretKey: process.env.R2_SECRET_KEY || '',
  r2BucketName: process.env.R2_BUCKET_NAME || 'realestate-os',
  r2PublicUrl: process.env.R2_PUBLIC_URL || '',
}));

export const whatsappConfig = registerAs('whatsapp', () => ({
  token: process.env.WHATSAPP_TOKEN || '',
  phoneId: process.env.WHATSAPP_PHONE_ID || '',
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
}));

export const paymentsConfig = registerAs('payments', () => ({
  paymobApiKey: process.env.PAYMOB_API_KEY || '',
  fawryMerchantCode: process.env.FAWRY_MERCHANT_CODE || '',
  fawrySecurityHash: process.env.FAWRY_SECURITY_HASH || '',
}));
