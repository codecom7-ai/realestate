// Jest setup file
import { ConfigService } from '@nestjs/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'file:./test.db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHB7MbzYLdZ7ZvVy7F7V
...test key...
-----END RSA PRIVATE KEY-----`;
process.env.JWT_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0Z3VS5JJcds3xfn/ygWy
...test key...
-----END PUBLIC KEY-----`;
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-characters!!';
process.env.ETA_CLIENT_ID = 'test-client-id';
process.env.ETA_CLIENT_SECRET = 'test-client-secret';
process.env.ETA_PRE_SHARED_KEY = 'test-preshared-key';
process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';

// Mock console.error to reduce noise in tests
jest.spyOn(console, 'error').mockImplementation(() => {});

// Global timeout for integration tests
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Add any cleanup logic here
});
