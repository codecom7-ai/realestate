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

# =============================================================================
# CRITICAL: Force npm as package manager
# This prevents Next.js 16 from trying to use pnpm for lockfile patching
# =============================================================================
export npm_package_manager=npm
export NEXT_SKIP_LOCKFILE_PATCH=1

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
log_info "Package Manager: npm (forced)"

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

# ---------- Step 2: Clean Lockfiles (Prevent pnpm conflicts) ----------
log_section "🧹 Step 2: Clean Lockfiles"

cd ${BASE_DIR}

log_step "Removing conflicting lockfiles..."

# Remove pnpm lockfile if exists (prevents Next.js from trying pnpm)
if [ -f "${BASE_DIR}/pnpm-lock.yaml" ]; then
    rm -f ${BASE_DIR}/pnpm-lock.yaml
    log_info "Removed pnpm-lock.yaml ✓"
fi

# Remove bun lockfile if exists
if [ -f "${BASE_DIR}/bun.lock" ]; then
    rm -f ${BASE_DIR}/bun.lock
    log_info "Removed bun.lock ✓"
fi

# Remove yarn lockfile if exists
if [ -f "${BASE_DIR}/yarn.lock" ]; then
    rm -f ${BASE_DIR}/yarn.lock
    log_info "Removed yarn.lock ✓"
fi

# Ensure .npmrc exists with correct settings
if [ ! -f "${BASE_DIR}/.npmrc" ]; then
    log_step "Creating .npmrc file..."
    cat > ${BASE_DIR}/.npmrc << 'EOF'
# Force npm as package manager
package-lock=true
lockfile-version=3

# Use npm registry
registry=https://registry.npmjs.org/
EOF
    log_info ".npmrc created ✓"
else
    log_info ".npmrc exists ✓"
fi

# ---------- Step 3: Install Dependencies ----------
log_section "📦 Step 3: Install Dependencies"

NPM_INSTALL_LOG="${LOG_DIR}/npm_install_${TIMESTAMP}.log"

log_step "Installing dependencies (monorepo)..."

# Use npm install with unsafe-perm (running as root)
# CRITICAL: Set environment variables to prevent pnpm detection
export npm_package_manager=npm
export NEXT_SKIP_LOCKFILE_PATCH=1

npm install --unsafe-perm --legacy-peer-deps 2>&1 | tee ${NPM_INSTALL_LOG}

log_info "Dependencies installed ✓"

# ---------- Step 4: Copy Environment Files ----------
log_section "📄 Step 4: Copy Environment Files"

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

# ---------- Step 5: Update Prisma Schema for PostgreSQL ----------
log_section "🗄️ Step 5: Update Prisma Schema"

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

# Fix migration_lock.toml if needed (prevent P3019 error)
if [ -f "${MIGRATION_LOCK}" ]; then
    if grep -q "sqlite" "${MIGRATION_LOCK}"; then
        log_step "Fixing migration_lock.toml for PostgreSQL..."
        sed -i 's/provider = "sqlite"/provider = "postgresql"/g' "${MIGRATION_LOCK}"
        log_info "migration_lock.toml updated ✓"
    fi
fi

# ---------- Step 6: Database Migrations ----------
log_section "🗄️ Step 6: Database Migrations"

MIGRATION_LOG="${LOG_DIR}/migrations_${TIMESTAMP}.log"

log_step "Generating Prisma client..."
npx prisma generate --schema=apps/api/prisma/schema.prisma 2>&1 | tee ${MIGRATION_LOG}

cd ${BASE_DIR}/apps/api

if [ "$FRESH_INSTALL" = true ]; then
    log_step "Running fresh migrations (will reset database)..."
    npx prisma migrate reset --force 2>&1 | tee -a ${MIGRATION_LOG} || {
        log_error "Migration reset failed!"
        log_error "Check: ${MIGRATION_LOG}"
        exit 1
    }
    
    log_step "Running seed..."
    npx prisma db seed 2>&1 | tee -a ${MIGRATION_LOG} || log_warn "Seed may have warnings"
else
    log_step "Running migrations..."
    
    # Try migrate deploy first
    if ! npx prisma migrate deploy 2>&1 | tee -a ${MIGRATION_LOG}; then
        # Check if it's a baseline issue (P3005 - database not empty)
        if grep -q "P3005\|database schema is not empty\|baseline" ${MIGRATION_LOG} 2>/dev/null; then
            log_warn "Database not empty, attempting baseline..."
            
            # Get the first MIGRATION DIRECTORY (not file) - must be a directory starting with date
            FIRST_MIGRATION=$(find prisma/migrations -maxdepth 1 -type d -name "[0-9]*" | sort | head -1 | xargs basename 2>/dev/null)
            
            if [ -n "$FIRST_MIGRATION" ]; then
                log_step "Marking migration '${FIRST_MIGRATION}' as applied (baseline)..."
                npx prisma migrate resolve --applied "${FIRST_MIGRATION}" 2>&1 | tee -a ${MIGRATION_LOG}
                
                # Try migrate deploy again
                log_step "Running remaining migrations..."
                npx prisma migrate deploy 2>&1 | tee -a ${MIGRATION_LOG} || {
                    log_error "Migrations still failed after baseline!"
                    log_error "Check: ${MIGRATION_LOG}"
                    exit 1
                }
            else
                log_error "No migration directory found for baseline!"
                log_info "Available directories:"
                ls -la prisma/migrations/
                exit 1
            fi
        else
            log_error "Migrations failed!"
            log_error "Check: ${MIGRATION_LOG}"
            exit 1
        fi
    fi
fi

cd ${BASE_DIR}

log_info "Database migrations complete ✓"

# ---------- Step 7: Build All Apps (Turbo) ----------
log_section "🔧 Step 7: Build All Apps"

BUILD_LOG="${LOG_DIR}/build_${TIMESTAMP}.log"

log_step "Building all apps with Turbo..."
log_info "Using npm as package manager (pnpm disabled)"

# CRITICAL: Export environment variables before build
# This prevents Next.js 16 from trying to use pnpm for SWC lockfile patching
export npm_package_manager=npm
export NEXT_SKIP_LOCKFILE_PATCH=1

# Run build with environment variables
npm run build 2>&1 | tee ${BUILD_LOG}

# Check if build succeeded
if [ ${PIPESTATUS[0]} -ne 0 ]; then
    log_error "Build failed!"
    log_error "Check: ${BUILD_LOG}"
    
    # Show last 50 lines of build log for debugging
    log_error "Last 50 lines of build log:"
    tail -50 ${BUILD_LOG}
    exit 1
fi

log_info "All apps built ✓"

# Verify builds exist
log_step "Verifying builds..."

# Check API build - NestJS outputs to dist/ relative to apps/api
if [ -f "${BASE_DIR}/apps/api/dist/apps/api/src/main.js" ] || [ -f "${BASE_DIR}/apps/api/dist/main.js" ]; then
    log_info "API build verified ✓"
else
    log_warn "API main.js not found in expected locations"
    log_info "Searching for main.js..."
    find ${BASE_DIR}/apps/api/dist -name "main.js" 2>/dev/null || true
fi

# Check Web Admin build
if [ -d "${BASE_DIR}/apps/web/.next" ]; then
    log_info "Web Admin build verified ✓"
else
    log_error "Web Admin build not found!"
    exit 1
fi

# Check Customer Portal build
if [ -d "${BASE_DIR}/apps/customer-portal/.next" ]; then
    log_info "Customer Portal build verified ✓"
else
    log_error "Customer Portal build not found!"
    exit 1
fi

# ---------- Step 8: Copy Static Assets (for standalone) ----------
log_section "📂 Step 8: Copy Static Assets"

# Web Admin - standalone mode
log_step "Copying Web Admin static assets..."
if [ -d "${BASE_DIR}/apps/web/.next/standalone" ]; then
    cp -r ${BASE_DIR}/apps/web/public ${BASE_DIR}/apps/web/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/web/.next/static ${BASE_DIR}/apps/web/.next/standalone/.next/ 2>/dev/null || true
    log_info "Web Admin standalone assets copied ✓"
else
    log_info "Using standard Next.js mode for Web Admin"
fi

# Customer Portal - standalone mode
log_step "Copying Customer Portal static assets..."
if [ -d "${BASE_DIR}/apps/customer-portal/.next/standalone" ]; then
    cp -r ${BASE_DIR}/apps/customer-portal/public ${BASE_DIR}/apps/customer-portal/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/customer-portal/.next/static ${BASE_DIR}/apps/customer-portal/.next/standalone/.next/ 2>/dev/null || true
    log_info "Customer Portal standalone assets copied ✓"
else
    log_info "Using standard Next.js mode for Customer Portal"
fi

# ---------- Step 9: PM2 Configuration ----------
log_section "⚙️ Step 9: PM2 Configuration"

log_step "Detecting API main.js location..."

# Find the correct path for main.js
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
    // Backend API (NestJS) - Port 3102
    {
      name: 'realestate-api',
      cwd: '/opt/realestate/apps/api',
      script: '${API_SCRIPT}',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3102,
        npm_package_manager: 'npm',
        NEXT_SKIP_LOCKFILE_PATCH: '1'
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
    // Admin Dashboard (Next.js) - Port 3101
    {
      name: 'realestate-web',
      cwd: '/opt/realestate/apps/web',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
        HOSTNAME: '0.0.0.0',
        npm_package_manager: 'npm',
        NEXT_SKIP_LOCKFILE_PATCH: '1'
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
    // Customer Portal (Next.js) - Port 3103
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
        HOSTNAME: '0.0.0.0',
        npm_package_manager: 'npm',
        NEXT_SKIP_LOCKFILE_PATCH: '1'
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

# ---------- Step 10: Start Services ----------
log_section "🚀 Step 10: Start Services"

log_step "Stopping existing services..."
pm2 delete all 2>/dev/null || true

log_step "Starting services with PM2..."
pm2 start ${BASE_DIR}/ecosystem.config.js

log_step "Waiting for services to start..."
sleep 5

# Check service status
log_step "Checking service status..."
pm2 list

# Health check
log_step "Running health checks..."

# API health
API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" 2>/dev/null || echo "000")
if [ "${API_HEALTH}" = "200" ]; then
    log_info "Backend API health check passed ✓"
else
    log_warn "Backend API health check returned HTTP ${API_HEALTH}"
fi

# Web Admin health
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${WEB_ADMIN_PORT}" 2>/dev/null || echo "000")
if [ "${WEB_HEALTH}" = "200" ] || [ "${WEB_HEALTH}" = "307" ] || [ "${WEB_HEALTH}" = "308" ]; then
    log_info "Admin Dashboard health check passed ✓"
else
    log_warn "Admin Dashboard health check returned HTTP ${WEB_HEALTH}"
fi

# Portal health
PORTAL_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${PORTAL_PORT}" 2>/dev/null || echo "000")
if [ "${PORTAL_HEALTH}" = "200" ] || [ "${PORTAL_HEALTH}" = "307" ] || [ "${PORTAL_HEALTH}" = "308" ]; then
    log_info "Customer Portal health check passed ✓"
else
    log_warn "Customer Portal health check returned HTTP ${PORTAL_HEALTH}"
fi

# Save PM2 configuration
pm2 save

# Setup PM2 startup for persistence
log_step "Configuring PM2 startup..."
pm2 startup systemd -u root --hp /root 2>/dev/null || true

log_info "Services started ✓"

# ---------- Step 11: OpenLiteSpeed Graceful Restart ----------
log_section "🌐 Step 11: OpenLiteSpeed Restart"

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
echo "  Build Logs:     cat ${BUILD_LOG}"
echo ""
echo "🔧 PORTS"
echo "========"
echo ""
echo "  Backend API:     ${API_PORT}"
echo "  Admin Dashboard: ${WEB_ADMIN_PORT}"
echo "  Customer Portal: ${PORTAL_PORT}"
echo ""
echo "📝 CLOUDFLARE DNS"
echo "=================="
echo ""
echo "  1. Add A record: ${SUBDOMAIN} → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo "  2. Set SSL mode to 'Full'"
echo "  3. Enable 'Always Use HTTPS'"
echo ""
