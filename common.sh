#!/usr/bin/env bash

# =============================================================================
# B3ly Platform — Shared Common Functions
# دوال مشتركة لجميع السكربتات
# =============================================================================

# ---------- Colors ----------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ---------- Logging Functions ----------
log_info() { 
    echo -e "${GREEN}✓${NC} $1" 
}

log_warn() { 
    echo -e "${YELLOW}⚠${NC} $1" 
}

log_error() { 
    echo -e "${RED}✗${NC} $1" 
}

log_step() { 
    echo -e "${CYAN}➜${NC} $1" 
}

log_section() {
    echo ""
    echo "=========================================="
    echo "$1"
    echo "=========================================="
}

# ---------- Check Root ----------
check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use: sudo bash script.sh)"
        exit 1
    fi
}

# ---------- Check File Exists ----------
check_file() {
    local file=$1
    local description=$2
    if [[ ! -f "$file" ]]; then
        log_error "${description} not found: ${file}"
        return 1
    fi
    return 0
}

# ---------- Check Directory Exists ----------
check_dir() {
    local dir=$1
    local description=$2
    if [[ ! -d "$dir" ]]; then
        log_error "${description} not found: ${dir}"
        return 1
    fi
    return 0
}

# ---------- Check Service Status ----------
check_service() {
    local service=$1
    if systemctl is-active --quiet "$service"; then
        echo -e "${GREEN}running${NC}"
        return 0
    else
        echo -e "${RED}stopped${NC}"
        return 1
    fi
}

# ---------- Wait for Service ----------
wait_for_service() {
    local service=$1
    local max_wait=${2:-30}
    local counter=0
    
    log_step "Waiting for $service to start..."
    while [ $counter -lt $max_wait ]; do
        if systemctl is-active --quiet "$service"; then
            log_info "$service is running"
            return 0
        fi
        sleep 1
        counter=$((counter + 1))
    done
    
    log_error "$service failed to start within ${max_wait} seconds"
    return 1
}

# ---------- Verify PostgreSQL Connection ----------
verify_postgres() {
    local db_name=$1
    local db_user=$2
    
    if sudo -u postgres psql -d "$db_name" -c '\q' 2>/dev/null; then
        log_info "PostgreSQL connection verified"
        return 0
    else
        log_error "Cannot connect to PostgreSQL database: $db_name"
        return 1
    fi
}

# ---------- Get Service Port ----------
get_service_port() {
    local service=$1
    case $service in
        backend) echo "4000" ;;
        subscribe-site) echo "3001" ;;
        platform-admin) echo "3002" ;;
        subscriber-portal) echo "3003" ;;
        store-admin) echo "3040" ;;
        storefront) echo "3050" ;;
        *) echo "" ;;
    esac
}

# ---------- Check Port in Use ----------
check_port() {
    local port=$1
    if netstat -tuln 2>/dev/null | grep -q ":${port} "; then
        return 0
    else
        return 1
    fi
}

# ---------- Display Service Status ----------
display_service_status() {
    local service_name=$1
    local port=$2
    
    printf "%-25s " "$service_name:"
    if check_port "$port"; then
        echo -e "${GREEN}✓ Running${NC} (port $port)"
    else
        echo -e "${RED}✗ Stopped${NC}"
    fi
}

# ---------- Create Timestamped Backup ----------
create_backup() {
    local source=$1
    local backup_dir=$2
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    if [[ -f "$source" ]] || [[ -d "$source" ]]; then
        local backup_path="${backup_dir}/$(basename ${source}).backup.${timestamp}"
        cp -r "$source" "$backup_path" 2>/dev/null || true
        log_info "Backup created: $backup_path"
    fi
}

# ---------- Update Environment Variable ----------
update_env_var() {
    local env_file=$1
    local key=$2
    local value=$3
    
    if grep -q "^${key}=" "$env_file" 2>/dev/null; then
        sed -i "s|^${key}=.*|${key}=${value}|" "$env_file"
    else
        echo "${key}=${value}" >> "$env_file"
    fi
}

# ---------- Get Environment Variable ----------
get_env_var() {
    local env_file=$1
    local key=$2
    local default=${3:-""}
    
    if [[ -f "$env_file" ]]; then
        grep "^${key}=" "$env_file" | cut -d '=' -f2- || echo "$default"
    else
        echo "$default"
    fi
}

# ---------- Display Horizontal Line ----------
hr() {
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

# ---------- Confirm Action ----------
confirm() {
    local message=$1
    local default=${2:-"no"}
    
    if [[ "$default" == "yes" ]]; then
        read -p "$message [Y/n]: " response
        response=${response:-y}
    else
        read -p "$message [y/N]: " response
        response=${response:-n}
    fi
    
    case "$response" in
        [yY][eE][sS]|[yY]) return 0 ;;
        *) return 1 ;;
    esac
}

# ---------- Get System Info ----------
get_system_info() {
    echo "Hostname: $(hostname)"
    echo "OS: $(lsb_release -ds 2>/dev/null || cat /etc/os-release | grep PRETTY_NAME | cut -d'"' -f2)"
    echo "Kernel: $(uname -r)"
    echo "CPU: $(nproc) cores"
    echo "RAM: $(free -h | awk '/^Mem:/ {print $2}')"
    echo "Disk: $(df -h / | awk 'NR==2 {print $4 " free of " $2}')"
}

# ---------- Export Functions ----------
export -f log_info log_warn log_error log_step log_section
export -f check_root check_file check_dir check_service
export -f wait_for_service verify_postgres
export -f get_service_port check_port display_service_status
export -f create_backup update_env_var get_env_var
export -f hr confirm get_system_info
