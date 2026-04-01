#!/usr/bin/env bash
set -Eeuo pipefail

# =============================================================================
# Real Estate OS — UPDATE SCRIPT
# This script updates the codebase and rebuilds all apps
# Usage: sudo bash 3-update-real-estate.sh [path/to/archive.tar.gz]
# =============================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BASE_DIR="/opt/realestate"
LOG_DIR="/var/log/realestate"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/opt/realestate-backups"

# Ports
WEB_ADMIN_PORT=3101
API_PORT=3102
PORTAL_PORT=3103

# Logging functions
log_section() { echo -e "\n${BLUE}========================================${NC}"; echo -e "  $1"; echo -e "${BLUE}========================================${NC}\n"; }
log_step() { echo -e "${YELLOW}▶ $1${NC}"; }
log_info() { echo -e "${GREEN}  ✓ $1${NC}"; }
log_warn() { echo -e "${YELLOW}  ⚠ $1${NC}"; }
log_error() { echo -e "${RED}  ✗ $1${NC}" >&2; }

# Check root
if [ "$(id -u)" -ne 0 ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Create directories
mkdir -p ${LOG_DIR} ${BACKUP_DIR}

log_section "🔄 Real Estate OS - Update Script"

# ---------- Step 1: Backup Current Installation ----------
log_section "📦 Step 1: Backup Current Installation"

BACKUP_FILE="${BACKUP_DIR}/realestate-backup-${TIMESTAMP}.tar.gz"

log_step "Creating backup..."
tar -czf ${BACKUP_FILE} \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='dist' \
    --exclude='.env*' \
    -C $(dirname ${BASE_DIR}) \
    $(basename ${BASE_DIR}) 2>/dev/null || true

log_info "Backup created: ${BACKUP_FILE}"

# ---------- Step 2: Update Code ----------
log_section "📥 Step 2: Update Code"

UPDATE_LOG="${LOG_DIR}/update_${TIMESTAMP}.log"

if [ -n "$1" ] && [ -f "$1" ]; then
    # Update from tar.gz file
    log_step "Extracting update from: $1"
    
    # Extract to temp directory
    TEMP_DIR=$(mktemp -d)
    tar -xzf "$1" -C ${TEMP_DIR}
    
    # Find the extracted directory
    EXTRACTED_DIR=$(ls ${TEMP_DIR} | head -1)
    
    if [ -d "${TEMP_DIR}/${EXTRACTED_DIR}" ]; then
        # Preserve environment files
        log_step "Preserving environment files..."
        cp ${BASE_DIR}/.env.production ${TEMP_DIR}/${EXTRACTED_DIR}/.env.production 2>/dev/null || true
        cp ${BASE_DIR}/apps/api/.env ${TEMP_DIR}/${EXTRACTED_DIR}/apps/api/.env 2>/dev/null || true
        
        # Sync files (exclude node_modules, .next, dist, .env)
        log_step "Syncing files..."
        rsync -av --delete \
            --exclude 'node_modules' \
            --exclude '.next' \
            --exclude 'dist' \
            --exclude '.env*' \
            --exclude '.git' \
            ${TEMP_DIR}/${EXTRACTED_DIR}/ \
            ${BASE_DIR}/ 2>&1 | tee ${UPDATE_LOG}
        
        log_info "Files updated from archive ✓"
    fi
    
    rm -rf ${TEMP_DIR}
    
elif [ -d "${BASE_DIR}/.git" ]; then
    # Update from git
    log_step "Pulling latest changes from git..."
    cd ${BASE_DIR}
    git pull origin main 2>&1 | tee ${UPDATE_LOG} || {
        log_warn "Git pull failed, continuing with existing code..."
    }
    log_info "Git update complete ✓"
else
    log_warn "No update source provided and not a git repository"
    log_info "Continuing with existing code..."
fi

# ---------- Step 3: Install/Update Dependencies ----------
log_section "📦 Step 3: Update Dependencies"

cd ${BASE_DIR}

NPM_LOG="${LOG_DIR}/npm_update_${TIMESTAMP}.log"

log_step "Updating dependencies..."
npm install --unsafe-perm --legacy-peer-deps 2>&1 | tee ${NPM_LOG}

log_info "Dependencies updated ✓"

# ---------- Step 4: Restore Environment Files ----------
log_section "📄 Step 4: Verify Environment Files"

if [ -f "${BASE_DIR}/.env.production" ]; then
    log_info "Main .env.production exists ✓"
else
    log_error ".env.production not found!"
    log_error "Please create it before continuing"
    exit 1
fi

# Copy to apps
log_step "Copying environment files to apps..."
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/api/.env 2>/dev/null || true
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/web/.env.local 2>/dev/null || true
cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/customer-portal/.env.local 2>/dev/null || true

log_info "Environment files copied ✓"

# ---------- Step 5: Database Migrations ----------
log_section "🗄️ Step 5: Database Migrations"

MIGRATION_LOG="${LOG_DIR}/migration_${TIMESTAMP}.log"

cd ${BASE_DIR}/apps/api

log_step "Generating Prisma client..."
npx prisma generate 2>&1 | tee ${MIGRATION_LOG}

log_step "Running migrations..."
npx prisma migrate deploy 2>&1 | tee -a ${MIGRATION_LOG} || {
    log_warn "Migration had issues, check logs"
}

cd ${BASE_DIR}

log_info "Database migrations complete ✓"

# ---------- Step 6: Build All Apps ----------
log_section "🔧 Step 6: Build All Apps"

BUILD_LOG="${LOG_DIR}/build_${TIMESTAMP}.log"

log_step "Building all apps..."
npm run build 2>&1 | tee ${BUILD_LOG} || {
    log_error "Build failed! Check: ${BUILD_LOG}"
    exit 1
}

log_info "All apps built ✓"

# ---------- Step 7: Copy Static Assets ----------
log_section "📂 Step 7: Copy Static Assets"

# Web Admin
if [ -d "${BASE_DIR}/apps/web/.next/standalone" ]; then
    log_step "Copying Web Admin static assets..."
    cp -r ${BASE_DIR}/apps/web/public ${BASE_DIR}/apps/web/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/web/.next/static ${BASE_DIR}/apps/web/.next/standalone/.next/ 2>/dev/null || true
    log_info "Web Admin assets copied ✓"
fi

# Customer Portal
if [ -d "${BASE_DIR}/apps/customer-portal/.next/standalone" ]; then
    log_step "Copying Customer Portal static assets..."
    cp -r ${BASE_DIR}/apps/customer-portal/public ${BASE_DIR}/apps/customer-portal/.next/standalone/ 2>/dev/null || true
    cp -r ${BASE_DIR}/apps/customer-portal/.next/static ${BASE_DIR}/apps/customer-portal/.next/standalone/.next/ 2>/dev/null || true
    log_info "Customer Portal assets copied ✓"
fi

# ---------- Step 8: Update PM2 Configuration ----------
log_section "⚙️ Step 8: Update PM2 Configuration"

# Detect API main.js location
if [ -f "${BASE_DIR}/apps/api/dist/apps/api/src/main.js" ]; then
    API_SCRIPT="dist/apps/api/src/main.js"
elif [ -f "${BASE_DIR}/apps/api/dist/main.js" ]; then
    API_SCRIPT="dist/main.js"
else
    log_error "Could not find API main.js!"
    exit 1
fi

log_step "Updating PM2 ecosystem file..."

cat > ${BASE_DIR}/ecosystem.config.js << ECOSYSTEM_EOF
module.exports = {
  apps: [
    {
      name: 'realestate-api',
      cwd: '/opt/realestate/apps/api',
      script: '${API_SCRIPT}',
      instances: 'max',
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

log_info "PM2 configuration updated ✓"

# ---------- Step 9: Restart Services ----------
log_section "🔄 Step 9: Restart Services"

log_step "Restarting all services..."
pm2 restart all 2>/dev/null || pm2 start ${BASE_DIR}/ecosystem.config.js

sleep 5

log_step "Service status:"
pm2 list

# Health checks
log_step "Running health checks..."

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${API_PORT}/health" 2>/dev/null || echo "000")
if [ "${API_HEALTH}" = "200" ]; then
    log_info "Backend API health check passed ✓"
else
    log_warn "Backend API health check returned HTTP ${API_HEALTH}"
fi

WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${WEB_ADMIN_PORT}" 2>/dev/null || echo "000")
if [ "${WEB_HEALTH}" = "200" ] || [ "${WEB_HEALTH}" = "307" ]; then
    log_info "Admin Dashboard health check passed ✓"
else
    log_warn "Admin Dashboard health check returned HTTP ${WEB_HEALTH}"
fi

pm2 save

# ---------- Final Summary ----------
log_section "✅ Update Complete!"

echo ""
echo "📊 PM2 STATUS"
echo "============="
pm2 list
echo ""
echo "🌐 URLs"
echo "======"
echo "  Admin Dashboard:  https://aqar.souqdev.com"
echo "  Customer Portal:  https://aqar.souqdev.com/portal"
echo "  Backend API:      https://aqar.souqdev.com/api/v1"
echo ""
echo "📋 LOGS"
echo "======="
echo "  Update Log:  ${UPDATE_LOG}"
echo "  Build Log:   ${BUILD_LOG}"
echo "  API Logs:    tail -f ${LOG_DIR}/api-out.log"
echo "  Web Logs:    tail -f ${LOG_DIR}/web-out.log"
echo ""
