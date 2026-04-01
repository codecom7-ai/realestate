#!/usr/bin/env bash
set -Eeuo pipefail

# =============================================================================
# Real Estate OS — SERVER INITIAL SETUP (OpenLiteSpeed/CyberPanel Version)
# Domain: aqar.souqdev.com (or your chosen subdomain)
# Usage: sudo bash 1-setup-real-estate.sh
# =============================================================================
# This script sets up the server for Real Estate OS alongside B3LY:
# - Node.js 20, npm, PM2
# - PostgreSQL 16 (separate database from B3LY)
# - Redis (shared with B3LY)
# - OpenLiteSpeed Virtual Host
# - Users & Directories
# - Secrets & Environment Files
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
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "UNKNOWN")

# Users & Directories
DEPLOY_USER="realestate"
BASE_DIR="/opt/realestate"

# Node.js versions
NODE_MAJOR="20"
NPM_VERSION="10.8.2"
PM2_VERSION="6.0.14"

# Database
DB_USER="realestate_admin"
DB_NAME="real_estate_os"

# Ports (different from B3LY to avoid conflicts)
# B3LY uses: 3001, 3002, 3003, 3040, 3050, 4000
# Real Estate uses: 3101, 3102
FRONTEND_PORT=3101
BACKEND_PORT=3102

# OLS Paths
OLS_ROOT="/usr/local/lsws"
OLS_CONF_DIR="${OLS_ROOT}/conf"
OLS_VHOST_DIR="${OLS_CONF_DIR}/vhosts"
OLS_BIN="${OLS_ROOT}/bin/lswsctrl"

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

log_section "🚀 Real Estate OS - Initial Setup (CyberPanel/OLS)"
log_info "Domain: ${FULL_DOMAIN}"
log_info "Server IP: ${SERVER_IP}"
log_info "Frontend Port: ${FRONTEND_PORT}"
log_info "Backend Port: ${BACKEND_PORT}"

# ---------- Step 1: System Update ----------
log_section "📦 Step 1: System Update"

log_step "Updating system packages..."
apt-get update -y
apt-get upgrade -y

log_step "Installing base packages..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    jq \
    git \
    unzip \
    wget \
    build-essential \
    software-properties-common \
    net-tools \
    htop \
    tmux

log_info "Base packages installed ✓"

# ---------- Step 2: Install Node.js ----------
log_section "📦 Step 2: Node.js ${NODE_MAJOR} + npm + PM2"

if ! command -v node >/dev/null 2>&1; then
    log_step "Installing Node.js ${NODE_MAJOR}..."
    curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash -
    apt-get install -y nodejs
fi

log_step "Ensuring correct npm and PM2 versions..."
npm install -g "npm@${NPM_VERSION}"
npm install -g "pm2@${PM2_VERSION}"

# PM2 logrotate
pm2 install pm2-logrotate 2>/dev/null || true

NODE_VER=$(node -v)
NPM_VER=$(npm -v)
PM2_VER=$(pm2 -v)

log_info "Node.js: ${NODE_VER}"
log_info "npm: ${NPM_VER}"
log_info "PM2: ${PM2_VER}"

# ---------- Step 3: PostgreSQL Database ----------
log_section "🗄️ Step 3: PostgreSQL Database"

# Check if PostgreSQL is installed (likely from B3LY)
if ! command -v psql >/dev/null 2>&1; then
    log_step "Installing PostgreSQL 16..."
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg 2>/dev/null || true
    apt-get update -y
    apt-get install -y postgresql-16 postgresql-contrib-16
    systemctl enable --now postgresql
    log_info "PostgreSQL 16 installed ✓"
else
    log_info "PostgreSQL already installed (from B3LY)"
fi

# Create database and user
log_step "Creating database and user..."
DB_PASSWORD="$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 32)"

sudo -u postgres psql -c "CREATE USER ${DB_USER} WITH PASSWORD '${DB_PASSWORD}';" 2>/dev/null || log_warn "User may already exist"
sudo -u postgres psql -c "CREATE DATABASE ${DB_NAME} OWNER ${DB_USER};" 2>/dev/null || log_warn "Database may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE ${DB_NAME} TO ${DB_USER};" 2>/dev/null || true

log_info "Database '${DB_NAME}' ready ✓"

# ---------- Step 4: Redis ----------
log_section "📦 Step 4: Redis"

if ! command -v redis-server >/dev/null 2>&1; then
    log_step "Installing Redis..."
    apt-get install -y redis-server
    systemctl enable --now redis-server
    log_info "Redis installed ✓"
else
    log_info "Redis already installed (shared with B3LY) ✓"
fi

# ---------- Step 5: Create User & Directories ----------
log_section "👤 Step 5: User & Directories"

log_step "Creating deploy user: ${DEPLOY_USER}..."
if ! id -u ${DEPLOY_USER} >/dev/null 2>&1; then
    useradd -m -s /bin/bash ${DEPLOY_USER}
    log_info "User ${DEPLOY_USER} created"
else
    log_info "User ${DEPLOY_USER} already exists"
fi

log_step "Creating directories..."
mkdir -p ${BASE_DIR}
mkdir -p /var/log/realestate

chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${BASE_DIR}
chown -R ${DEPLOY_USER}:${DEPLOY_USER} /var/log/realestate

log_info "Directories created ✓"

# ---------- Step 6: Generate Secrets ----------
log_section "🔐 Step 6: Generating Secrets"

JWT_SECRET="$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)"
COOKIE_SECRET="$(openssl rand -hex 32)"
PII_ENCRYPTION_KEY="$(openssl rand -hex 32)"

log_info "Secrets generated ✓"

# ---------- Step 7: Environment File ----------
log_section "📄 Step 7: Environment File"

ENV_FILE="${BASE_DIR}/.env.production"

cat > ${ENV_FILE} << EOF
# ==============================================
# Real Estate OS - Production Environment
# Domain: ${FULL_DOMAIN}
# Server IP: ${SERVER_IP}
# ==============================================

NODE_ENV=production

# ==============================================
# Server Ports
# ==============================================
PORT=${BACKEND_PORT}
FRONTEND_PORT=${FRONTEND_PORT}

# ==============================================
# Database Configuration (PostgreSQL)
# ==============================================
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=${DB_NAME}
DATABASE_USERNAME=${DB_USER}
DATABASE_PASSWORD=${DB_PASSWORD}

# ==============================================
# Redis Configuration (shared with B3LY)
# ==============================================
REDIS_HOST=localhost
REDIS_PORT=6379

# ==============================================
# Security Secrets
# ==============================================
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
COOKIE_SECRET=${COOKIE_SECRET}

# ==============================================
# API Configuration
# ==============================================
API_PREFIX=api/v1

# ==============================================
# URLs
# ==============================================
FRONTEND_URL=https://${FULL_DOMAIN}
BACKEND_URL=http://localhost:${BACKEND_PORT}

# ==============================================
# CORS Origins
# ==============================================
CORS_ORIGIN=https://${FULL_DOMAIN}

# ==============================================
# Logging
# ==============================================
LOG_LEVEL=info
EOF

chown ${DEPLOY_USER}:${DEPLOY_USER} ${ENV_FILE}
chmod 600 ${ENV_FILE}

log_info "Environment file created ✓"

# ---------- Step 8: Generate JWT Keys ----------
log_section "🔑 Step 8: JWT Keys"

log_step "Generating RSA keys for JWT..."
mkdir -p ${BASE_DIR}/keys

openssl genrsa -out ${BASE_DIR}/keys/private.pem 2048 2>/dev/null
openssl rsa -in ${BASE_DIR}/keys/private.pem -pubout -out ${BASE_DIR}/keys/public.pem 2>/dev/null

chmod 600 ${BASE_DIR}/keys/private.pem
chmod 644 ${BASE_DIR}/keys/public.pem
chown -R ${DEPLOY_USER}:${DEPLOY_USER} ${BASE_DIR}/keys

# Update env with key paths
cat >> ${ENV_FILE} << EOF

# ==============================================
# JWT Keys
# ==============================================
JWT_PRIVATE_KEY_PATH=${BASE_DIR}/keys/private.pem
JWT_PUBLIC_KEY_PATH=${BASE_DIR}/keys/public.pem
EOF

log_info "JWT keys generated ✓"

# ---------- Step 9: OpenLiteSpeed Configuration ----------
log_section "🌐 Step 9: OpenLiteSpeed Configuration"

# Check if OLS is running
if ! systemctl is-active --quiet lsws; then
    log_error "OpenLiteSpeed is not running!"
    log_error "Make sure CyberPanel is installed and OLS is running"
    exit 1
fi

log_info "OpenLiteSpeed is running ✓"

# Create vhost directories
log_step "Creating Virtual Host directories..."
mkdir -p ${OLS_VHOST_DIR}/realestate/{html,logs,ssl}

# Create vhost config
cat > ${OLS_VHOST_DIR}/realestate/vhconf.conf << EOF
docRoot                   \$VH_ROOT/html/
enableGzip                1

index {
  useServer               0
  indexFiles              index.html
}

accessLog {
  useServer               0
  logFormat               "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\""
  rollingSize             10M
}

# Frontend (Next.js)
context / {
  type                    proxy
  uri                     /
  backend                 http://127.0.0.1:${FRONTEND_PORT}
  addDefaultCharset       off
}

# Backend API
context /api {
  type                    proxy
  uri                     /api
  backend                 http://127.0.0.1:${BACKEND_PORT}/api
  addDefaultCharset       off
}

# Customer Portal
context /portal {
  type                    proxy
  uri                     /portal
  backend                 http://127.0.0.1:${PORTAL_PORT}
  addDefaultCharset       off
}

# Next.js static assets (admin)
context /_next {
  type                    proxy
  uri                     /_next
  backend                 http://127.0.0.1:${FRONTEND_PORT}/_next
  addDefaultCharset       off
}
EOF

log_info "Virtual Host configuration created ✓"

# Generate SSL certificate (self-signed for Cloudflare Full mode)
log_step "Generating SSL certificate..."
mkdir -p ${OLS_CONF_DIR}/ssl/realestate

openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout ${OLS_CONF_DIR}/ssl/realestate/server.key \
    -out ${OLS_CONF_DIR}/ssl/realestate/server.crt \
    -subj "/CN=${FULL_DOMAIN}/O=Real Estate OS/C=EG" 2>/dev/null

chmod 600 ${OLS_CONF_DIR}/ssl/realestate/server.key
chmod 644 ${OLS_CONF_DIR}/ssl/realestate/server.crt

log_info "SSL certificate generated ✓"

# Update main OLS config
log_step "Updating main OpenLiteSpeed configuration..."

cp ${OLS_CONF_DIR}/httpd_config.conf ${OLS_CONF_DIR}/httpd_config.conf.bak.realestate.$(date +%Y%m%d%H%M%S) 2>/dev/null || true

cat > /tmp/add_realestate_vhost.py << 'PYTHON_SCRIPT'
#!/usr/bin/env python3
import re
import sys

config_file = '/usr/local/lsws/conf/httpd_config.conf'
domain = sys.argv[1] if len(sys.argv) > 1 else 'aqar.souqdev.com'

with open(config_file, 'r') as f:
    content = f.read()

# Virtual host entry
vhost_entry = '''
virtualhost realestate {
  vhRoot                  /usr/local/lsws/conf/vhosts/realestate
  configFile              $SERVER_ROOT/conf/vhosts/realestate/vhconf.conf
  allowSymbolLink         1
  enableScript            1
  restrained              0
  setUIDMode              2
}
'''

# Maps to add
http_map = f'  map                     {domain} realestate\n'
https_map = f'  map                     {domain} realestate\n'

# Check if already added
if 'virtualhost realestate' not in content:
    # Add virtualhost before listener section
    vh_pattern = r'(listener\s+\w+\s*\{)'
    content = re.sub(vh_pattern, vhost_entry + '\n\\1', content, count=1)
    
    # Try to add maps to HTTP listener
    http_listener_pattern = r'(listener\s+\w*http[^}]*\{)'
    if re.search(http_listener_pattern, content, re.IGNORECASE):
        # Find the end of HTTP listener
        http_end_pattern = r'(listener\s+\w*http[^}]*\{[^}]*)(\n\})'
        content = re.sub(http_end_pattern, '\\1\n' + http_map + '\\2', content, count=1, flags=re.IGNORECASE)
    
    # Try to add maps to HTTPS listener
    https_end_pattern = r'(listener\s+\w*https[^}]*\{[^}]*)(\n\})'
    if re.search(https_end_pattern, content, re.IGNORECASE):
        content = re.sub(https_end_pattern, '\\1\n' + https_map + '\\2', content, count=1, flags=re.IGNORECASE)
    
    with open(config_file, 'w') as f:
        f.write(content)
    print("Configuration updated successfully")
else:
    print("Real Estate OS configuration already exists")
PYTHON_SCRIPT

python3 /tmp/add_realestate_vhost.py "${FULL_DOMAIN}" || log_warn "Manual config update may be needed"

# Graceful restart
log_step "Restarting OpenLiteSpeed..."
${OLS_BIN} graceful 2>/dev/null || ${OLS_BIN} restart

log_info "OpenLiteSpeed configured ✓"

# ---------- Step 10: Save Credentials ----------
log_section "🔐 Step 10: Saving Credentials"

CREDENTIALS_FILE="${BASE_DIR}/.credentials"
cat > ${CREDENTIALS_FILE} << EOF
============================================================
REAL ESTATE OS - SERVER CREDENTIALS
Domain: ${FULL_DOMAIN}
Server IP: ${SERVER_IP}
Generated: $(date)
============================================================

[PostgreSQL]
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@localhost:5432/${DB_NAME}

[Security]
JWT_SECRET=${JWT_SECRET}
COOKIE_SECRET=${COOKIE_SECRET}

[Ports]
Frontend: ${FRONTEND_PORT}
Backend: ${BACKEND_PORT}

[JWT Keys]
Private: ${BASE_DIR}/keys/private.pem
Public: ${BASE_DIR}/keys/public.pem

============================================================
⚠️  KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT!
============================================================
EOF

chmod 600 ${CREDENTIALS_FILE}
chown ${DEPLOY_USER}:${DEPLOY_USER} ${CREDENTIALS_FILE}

log_info "Credentials saved to ${CREDENTIALS_FILE}"

# ---------- Final Summary ----------
log_section "✅ Setup Complete!"

echo ""
echo "📋 SUMMARY"
echo "=========="
echo ""
echo "🌐 Domain: ${FULL_DOMAIN}"
echo "🖥️  Server IP: ${SERVER_IP}"
echo ""
echo "📦 Installed Components:"
echo "  ✓ Node.js $(node -v)"
echo "  ✓ npm $(npm -v)"
echo "  ✓ PM2 $(pm2 -v)"
echo "  ✓ PostgreSQL 16"
echo "  ✓ Redis"
echo "  ✓ OpenLiteSpeed Virtual Host"
echo ""
echo "📂 Directories:"
echo "  • App: ${BASE_DIR}"
echo "  • Logs: /var/log/realestate"
echo "  • JWT Keys: ${BASE_DIR}/keys/"
echo ""
echo "🔐 Credentials: ${CREDENTIALS_FILE}"
echo ""
echo "📝 Next Steps:"
echo "  1. Upload your project to ${BASE_DIR}:"
echo "     scp real-estate-os-backup.zip root@${SERVER_IP}:${BASE_DIR}/"
echo "     cd ${BASE_DIR} && unzip real-estate-os-backup.zip"
echo ""
echo "  2. Copy environment file:"
echo "     cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/api/.env"
echo "     cp ${BASE_DIR}/.env.production ${BASE_DIR}/apps/web/.env.local"
echo ""
echo "  3. Run the deploy script:"
echo "     cd ${BASE_DIR}"
echo "     ./2-deploy-real-estate.sh"
echo ""
echo "  4. Configure Cloudflare DNS:"
echo "     - Add A record: ${SUBDOMAIN} → ${SERVER_IP}"
echo "     - Set SSL mode to 'Full'"
echo ""
