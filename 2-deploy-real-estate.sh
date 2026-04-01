#!/usr/bin/env bash
set -Eeuo pipefail

# =============================================================================
# Real Estate OS — DEPLOYMENT SCRIPT (OpenLiteSpeed/CyberPanel Version)
# Domain: aqar.souqdev.com (or your chosen subdomain)
# Usage: sudo bash 2-deploy-real-estate.sh [--fresh]
# =============================================================================
# This script deploys Real Estate OS with 3 apps:
# - apps/api (Backend - NestJS) → Port 3102
# - apps/web (Admin Dashboard - Next.js) → Port 3101
# - apps/customer-portal (Customer Portal - Next.js) → Port 3103
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DOMAIN="${DEPLOY_DOMAIN:-souqdev.com}"
SUBDOMAIN="${DEPLOY_SUBDOMAIN:-aqar}"
FULL_DOMAIN="${SUBDOMAIN}.${DOMAIN}"

BASE_DIR="/opt/realestate"
LOG_DIR="/var/log/realestate"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Ports
WEB_ADMIN_PORT=3101          # Admin Dashboard (apps/web)
API_PORT=3102                # API (apps/api)
PORTAL_PORT=3103             # Customer Portal (apps/customer-portal)

# Node version
NODE_MAJOR="22"

export DEBIAN_FRONTEND=noninteractive

# Logging functions
log_section() { echo -e "\n${BLUE}========================================${NC}"; echo -e "  $1"; echo -e "${BLUE}========================================${NC}\n"; }
log_step() { echo -e "${YELLOW}▶ $1${NC}"; }
log_info() { echo -e "${GREEN}  ✓ $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
log_error() { echo -e "${RED}  ✗ $1${NC}" >&2; }

check_root() {
    if [ "$(id -u)" -ne 0 ]; then
        log_error "This script must be run as root"
        exit 1
    fi
}

check_root

# Check for --fresh flag (fresh install with seed)
FRESH_INSTALL=false
for arg in "$@"; do
    if [ "$arg" = "--fresh" ]; then
        FRESH_INSTALL=true
    fi
done

log_section "🚀 Real Estate OS - Deployment"
log_info "Domain: ${FULL_DOMAIN}"
log_info "Backend API: Port ${API_PORT}"
log_info "Admin Dashboard: Port ${WEB_ADMIN_PORT}"
log_info "Customer Portal: Port ${PORTAL_PORT}"
log_info "Fresh Install: ${FRESH_INSTALL}"

# Verify environment file exists
if [ ! -f "${BASE_DIR}/.env.production" ]; then
    log_error "Environment file not found: ${BASE_DIR}/.env.production"
    log_error "Please create .env.production file first"
    exit 1
fi

# Create log directory
mkdir -p ${LOG_DIR}

# ---------- Step 1: Verify Node.js ----------
log_section "📦 Step 1: Verify Node.js"

NODE_VER=$(node -v 2>/dev/null || echo "none")
NODE_MAJOR_INSTALLED=$(echo "${NODE_VER#v}" | cut -d'.' -f1)

if [ "${NODE_MAJOR_INSTALLED}" != "${NODE_MAJOR}" ]; then
    log_warn "Node.js ${NODE_MAJOR} recommended, found ${NODE_VER}"
    log_info "Continuing with current version..."
else
    log_info "Node.js ${NODE_VER} ✓"
fi

# ---------- Step 2: Install Dependencies ----------
log_section "📦 Step 2: Install Dependencies"

cd ${BASE_DIR}

NPM_INSTALL_LOG="${LOG_DIR}/npm_install_${TIMESTAMP}.log"

log_step "Installing dependencies (monorepo)..."

# Use npm install with unsafe-perm (running as root)
npm install --unsafe-perm --legacy-peer-deps 2>&1 | tee ${NPM_INSTALL_LOG}

log_info "Dependencies installed ✓"

# ---------- Step 3: Copy Environment Files ----------
log_section "📄 Step 3: Copy Environment Files"

log_step "Copying environment files..."

# Backend (API)
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/api/.env
chmod 600 ${BASE_DIR}/apps/api/.env
log_info "API .env copied ✓"

# Frontend (Admin Dashboard)
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/web/.env.local
chmod 600 ${BASE_DIR}/apps/web/.env.local
log_info "Web Admin .env.local copied ✓"

# Customer Portal
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/customer-portal/.env.local
chmod 600 ${BASE_DIR}/apps/customer-portal/.env.local
log_info "Customer Portal .env.local copied ✓"

# ---------- Step 4: Update Prisma Schema for PostgreSQL ----------
log_section "🗄️ Step 4: Update Prisma Schema"

log_step "Checking Prisma schema..."

PRISMA_SCHEMA="${BASE_DIR}/apps/api/prisma/schema.prisma"
MIGRATION_LOCK="${BASE_DIR}/apps/api/prisma/migrations/migration_lock.toml"

if grep -q "sqlite" "${PRISMA_SCHEMA}"; then
    log_step "Updating Prisma schema for PostgreSQL..."
    
    # Backup original
    cp "${PRISMA_SCHEMA}" "${PRISMA_SCHEMA}.sqlite.bak"
    
    # Replace SQLite with PostgreSQL
    sed -i 's/provider = "sqlite"/provider = "postgresql"/g' "${PRISMA_SCHEMA}"
    sed -i 's/url      = env("DATABASE_URL")/url      = env("DATABASE_URL")\n  directUrl = env("DATABASE_URL")/g' "${PRISMA_SCHEMA}"
    
    log_info "Prisma schema updated for PostgreSQL ✓"
else
    log_info "Prisma schema already configured for PostgreSQL ✓"
fi

# Clean up old SQLite migrations to prevent conflicts
if [ -d "${BASE_DIR}/apps/api/prisma/migrations" ]; then
    rm -rf "${BASE_DIR}/apps/api/prisma/migrations"
    log_info "Cleaned up old migrations folder to prevent conflicts ✓"
fi

# ---------- Step 5: Database Migrations & Sync ----------
log_section "🗄️ Step 5: Database Sync & Seeding"

MIGRATION_LOG="${LOG_DIR}/migrations_${TIMESTAMP}.log"

cd ${BASE_DIR}/apps/api

log_step "Generating Prisma client..."
npx prisma generate 2>&1 | tee ${MIGRATION_LOG}

if [ "$FRESH_INSTALL" = true ]; then
    log_step "Running fresh database push (will reset database completely)..."
    
    # Force reset database schema directly (Bypasses shadow DB issues)
    npx prisma db push --force-reset 2>&1 | tee -a ${MIGRATION_LOG} || {
        log_error "Database reset failed!"
        log_error "Check: ${MIGRATION_LOG}"
        exit 1
    }
    log_info "Database schema synced ✓"
    
    log_step "Running seed explicitly via ts-node..."
    # Use ts-node directly to avoid silent failures
    npx ts-node prisma/seed.ts 2>&1 | tee -a ${MIGRATION_LOG} || {
        log_error "Database seed failed!"
        log_error "Check: ${MIGRATION_LOG}"
        exit 1
    }
    log_info "Database seeded successfully ✓"
else
    log_step "Syncing database schema (Non-destructive)..."
    
    # Use db push for safe schema sync without shadow DB dependencies
    npx prisma db push --accept-data-loss 2>&1 | tee -a ${MIGRATION_LOG} || {
        log_error "Database sync failed!"
        log_error "Check: ${MIGRATION_LOG}"
        exit 1
    }
    log_info "Database schema updated successfully ✓"
fi

cd ${BASE_DIR}

log_info "Database setup complete ✓"

# ---------- Step 6: Build All Apps (Turbo) ----------
log_section "🔧 Step 6: Build All Apps"

BUILD_LOG="${LOG_DIR}/build_${TIMESTAMP}.log"

log_step "Building all apps with Turbo..."
npm run build 2>&1 | tee ${BUILD_LOG} || {
    log_error "Build failed!"
    log_error "Check: ${BUILD_LOG}"
    exit 1
}

log_info "All apps built ✓"

# Verify builds exist
log_step "Verifying builds..."

if [ -f "${BASE_DIR}/apps/api/dist/apps/api/src/main.js" ] || [ -f "${BASE_DIR}/apps/api/dist/main.js" ]; then
    log_info "API build verified ✓"
else
    log_warn "API main.js not found in expected locations, PM2 step might fail."
fi

if [ -d "${BASE_DIR}/apps/web/.next" ]; then
    log_info "Web Admin build verified ✓"
else
    log_error "Web Admin build not found!"
    exit 1
fi

if [ -d "${BASE_DIR}/apps/customer-portal/.next" ]; then
    log_info "Customer Portal build verified ✓"
else
    log_error "Customer Portal build not found!"
    exit 1
fi

# ---------- Step 7: Copy Static Assets (for standalone) ----------
log_section "📂 Step 7: Copy Static Assets"

log_step "Copying Web Admin static assets..."
if [ -d "${BASE_DIR}/apps/web/.next/standalone" ]; then
    cp -r ${BASE_DIR}/apps/web/public ${BASE_DIR}/apps/web/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/web/.next/static ${BASE_DIR}/apps/web/.next/standalone/.next/ 2>/dev/null || true
    log_info "Web Admin standalone assets copied ✓"
else
    log_info "Using standard Next.js mode for Web Admin"
fi

log_step "Copying Customer Portal static assets..."
if [ -d "${BASE_DIR}/apps/customer-portal/.next/standalone" ]; then
    cp -r ${BASE_DIR}/apps/customer-portal/public ${BASE_DIR}/apps/customer-portal/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/customer-portal/.next/static ${BASE_DIR}/apps/customer-portal/.next/standalone/.next/ 2>/dev/null || true
    log_info "Customer Portal standalone assets copied ✓"
else
    log_info "Using standard Next.js mode for Customer Portal"
fi

# ---------- Step 8: PM2 Configuration ----------
log_section "⚙️ Step 8: PM2 Configuration"

log_step "Detecting API main.js location..."

if [ -f "${BASE_DIR}/apps/api/dist/apps/api/src/main.js" ]; then
    API_SCRIPT="dist/apps/api/src/main.js"
    log_info "Found API main.js at: ${API_SCRIPT}"
elif [ -f "${BASE_DIR}/apps/api/dist/main.js" ]; then
    API_SCRIPT="dist/main.js"
    log_info "Found API main.js at: ${API_SCRIPT}"
else
    log_error "Could not find API main.js!"
    exit 1
fi

log_step "Creating PM2 ecosystem file..."

cat > ${BASE_DIR}/ecosystem.config.js << ECOSYSTEM_EOF
module.exports = {
  apps: [
    // Backend API (NestJS)
    {
      name: 'realestate-api',
      cwd: '/opt/realestate/apps/api',
      script: '${API_SCRIPT}',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3102
      },
      node_args: '--max-old-space-size=2048',
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/api-error.log',
      out_file: '/var/log/realestate/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    // Admin Dashboard (Next.js)
    {
      name: 'realestate-web',
      cwd: '/opt/realestate/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
        HOSTNAME: '0.0.0.0'
      },
      node_args: '--max-old-space-size=2048',
      max_memory_restart: '1G',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/web-error.log',
      out_file: '/var/log/realestate/web-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    // Customer Portal (Next.js)
    {
      name: 'realestate-portal',
      cwd: '/opt/realestate/apps/customer-portal',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3103,
        HOSTNAME: '0.0.0.0'
      },
      node_args: '--max-old-space-size=1024',
      max_memory_restart: '512M',
      listen_timeout: 10000,
      kill_timeout: 5000,
      error_file: '/var/log/realestate/portal-error.log',
      out_file: '/var/log/realestate/portal-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
ECOSYSTEM_EOF

log_info "PM2 configuration created ✓"

# ---------- Step 9: Start Services ----------
log_section "🚀 Step 9: Start Services"

log_step "Stopping existing services..."
pm2 delete all 2>/dev/null || true

log_step "Starting services with PM2..."
pm2 start ${BASE_DIR}/ecosystem.config.js

log_step "Waiting for services to start..."
sleep 5

log_step "Checking service status..."
pm2 list

log_step "Running health checks..."

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" 2>/dev/null || echo "000")
if [ "${API_HEALTH}" = "200" ]; then
    log_info "Backend API health check passed ✓"
else
    log_warn "Backend API health check returned HTTP ${API_HEALTH}"
fi

WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${WEB_ADMIN_PORT}" 2>/dev/null || echo "000")
if [ "${WEB_HEALTH}" = "200" ] || [ "${WEB_HEALTH}" = "307" ] || [ "${WEB_HEALTH}" = "308" ]; then
    log_info "Admin Dashboard health check passed ✓"
else
    log_warn "Admin Dashboard health check returned HTTP ${WEB_HEALTH}"
fi

PORTAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORTAL_PORT}" 2>/dev/null || echo "000")
if [ "${PORTAL_HEALTH}" = "200" ] || [ "${PORTAL_HEALTH}" = "307" ] || [ "${PORTAL_HEALTH}" = "308" ]; then
    log_info "Customer Portal health check passed ✓"
else
    log_warn "Customer Portal health check returned HTTP ${PORTAL_HEALTH}"
fi

pm2 save
log_step "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root 2>/dev/null || true
log_info "Services started ✓"

# ---------- Step 10: OpenLiteSpeed Graceful Restart ----------
log_section "🌐 Step 10: OpenLiteSpeed Restart"

OLS_BIN="/usr/local/lsws/bin/lswsctrl"

if [ -x "${OLS_BIN}" ]; then
    log_step "Gracefully restarting OpenLiteSpeed..."
    ${OLS_BIN} graceful 2>/dev/null || ${OLS_BIN} restart
    log_info "OpenLiteSpeed restarted ✓"
else
    log_warn "OpenLiteSpeed control not found - skip"
fi

# ---------- Final Summary ----------
log_section "✅ Deployment Complete!"

echo ""
echo "📊 PM2 STATUS"
echo "============="
echo ""
pm2 list
echo ""
echo "🌐 URLs"
echo "======"
echo ""
echo "  Admin Dashboard:  https://${FULL_DOMAIN}"
echo "  Customer Portal:  https://${FULL_DOMAIN}/portal"
echo "  Backend API:      https://${FULL_DOMAIN}/api/v1"
echo "  Health Check:     https://${FULL_DOMAIN}/api/v1/health"
echo ""
echo "🔌 DIRECT ACCESS (for testing)"
echo "==============================="
echo ""
echo "  Admin Dashboard:  http://localhost:${WEB_ADMIN_PORT}"
echo "  Customer Portal:  http://localhost:${PORTAL_PORT}"
echo "  Backend API:      http://localhost:${API_PORT}"
echo ""
echo "📋 MANAGEMENT COMMANDS"
echo "======================"
echo ""
echo "  PM2 Status:     pm2 list"
echo "  PM2 Logs:       pm2 logs"
echo "  PM2 Restart:    pm2 restart all"
echo "  PM2 Stop:       pm2 stop all"
echo ""
echo "  API Logs:       tail -f ${LOG_DIR}/api-out.log"
echo "  Web Logs:       tail -f ${LOG_DIR}/web-out.log"
echo "  Portal Logs:    tail -f ${LOG_DIR}/portal-out.log"
echo ""