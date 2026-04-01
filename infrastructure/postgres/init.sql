-- ═══════════════════════════════════════════════════════════════
-- PostgreSQL Init Script
-- نظام تشغيل المكتب العقاري المصري
-- ═══════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_trgm for Arabic full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enable btree_gin for composite indexes
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- ═══════════════════════════════════════════════════════════════
-- Create app user (optional - for production)
-- ═══════════════════════════════════════════════════════════════
-- CREATE USER app_user WITH PASSWORD 'secure_password';
-- GRANT ALL PRIVILEGES ON DATABASE realestate_os TO app_user;

-- ═══════════════════════════════════════════════════════════════
-- Arabic Text Search Configuration
-- ═══════════════════════════════════════════════════════════════
-- Note: For proper Arabic search, consider using pg_trgm with GIN indexes
-- on text columns that need Arabic search capability

-- Example GIN index for Arabic search (will be created after tables):
-- CREATE INDEX idx_clients_name_trgm ON clients USING gin (first_name gin_trgm_ops);
-- CREATE INDEX idx_properties_title_trgm ON properties USING gin (title gin_trgm_ops);

-- ═══════════════════════════════════════════════════════════════
-- Audit Log Rules (Append-Only)
-- ═══════════════════════════════════════════════════════════════
-- These will be applied after the audit_logs table is created by Prisma
-- Rule: Prevent UPDATE and DELETE on audit_logs

-- ═══════════════════════════════════════════════════════════════
-- Commission Lock Rule
-- ═══════════════════════════════════════════════════════════════
-- Prevent modification of locked commissions
-- This will be applied after the commissions table is created by Prisma

-- ═══════════════════════════════════════════════════════════════
-- Grant permissions
-- ═══════════════════════════════════════════════════════════════
-- GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- ═══════════════════════════════════════════════════════════════
-- Initial Setup
-- ═══════════════════════════════════════════════════════════════
-- Log initialization
DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL initialized for Real Estate OS';
    RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, btree_gin';
END $$;
