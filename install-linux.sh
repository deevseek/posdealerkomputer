#!/bin/bash

# LaptopPOS - Automated Linux Installation Script
# This script completely automates the installation process

set -e  # Exit on any error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}LaptopPOS - Automated Linux Installation${NC}"
echo -e "${GREEN}=============================================${NC}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

# Detect Linux distribution
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO=$ID
    VERSION=$VERSION_ID
else
    error "Cannot detect Linux distribution"
fi

log "Detected distribution: $DISTRO $VERSION"
log "Starting automated installation..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed!"
    print_status "Installing Node.js..."
    
    # Detect OS
    if [[ -f /etc/ubuntu-release ]] || [[ -f /etc/debian_version ]]; then
        # Ubuntu/Debian
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif [[ -f /etc/redhat-release ]] || [[ -f /etc/centos-release ]]; then
        # RHEL/CentOS/Fedora
        curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
        sudo yum install -y nodejs
    elif [[ -f /etc/arch-release ]]; then
        # Arch Linux
        sudo pacman -S nodejs npm
    else
        print_error "Unsupported Linux distribution. Please install Node.js manually:"
        print_status "Visit: https://nodejs.org/en/download/package-manager/"
        exit 1
    fi
fi

# Check Node.js version
NODE_VERSION=$(node --version)
print_success "Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm version: $NPM_VERSION"

# Check if PostgreSQL is installed
if ! command -v pg_config &> /dev/null; then
    print_warning "PostgreSQL is not installed!"
    print_status "Installing PostgreSQL..."
    
    if [[ -f /etc/ubuntu-release ]] || [[ -f /etc/debian_version ]]; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y postgresql postgresql-contrib
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [[ -f /etc/redhat-release ]] || [[ -f /etc/centos-release ]]; then
        # RHEL/CentOS/Fedora
        sudo yum install -y postgresql-server postgresql-contrib
        sudo postgresql-setup initdb
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    elif [[ -f /etc/arch-release ]]; then
        # Arch Linux
        sudo pacman -S postgresql
        sudo -u postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D /var/lib/postgres/data
        sudo systemctl start postgresql
        sudo systemctl enable postgresql
    fi
fi

PG_VERSION=$(pg_config --version 2>/dev/null || echo "Not available")
print_success "PostgreSQL: $PG_VERSION"

print_status "Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    print_error "Failed to install dependencies!"
    exit 1
fi

print_status "Creating necessary directories..."
mkdir -p logs uploads temp/reports backups whatsapp_session

print_status "Setting up environment configuration..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_success "Created .env file from template"
    print_warning "IMPORTANT: Please edit .env file with your database credentials!"
else
    print_status ".env file already exists"
fi

print_status "Building application..."
npm run build

if [ $? -ne 0 ]; then
    print_error "Failed to build application!"
    exit 1
fi

print_status "Setting up systemd service..."
cat > laptoppos.service << EOF
[Unit]
Description=LaptopPOS Service Management System
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment=NODE_ENV=production
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=laptoppos

[Install]
WantedBy=multi-user.target
EOF

print_success "Created laptoppos.service file"

# Setup database automatically
setup_database() {
    log "Setting up PostgreSQL database..."
    
    # Generate secure random password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    # Create database and user
    sudo -u postgres psql <<EOF
CREATE USER laptoppos WITH PASSWORD '$DB_PASSWORD';
CREATE DATABASE laptoppos OWNER laptoppos;
GRANT ALL PRIVILEGES ON DATABASE laptoppos TO laptoppos;
ALTER USER laptoppos CREATEDB;
\\q
EOF
    
    # Create environment file with actual credentials
    cat > .env <<EOF
NODE_ENV=production
PORT=5000
SESSION_SECRET=$(openssl rand -base64 32)

# Database Configuration
DATABASE_URL=postgresql://laptoppos:$DB_PASSWORD@localhost:5432/laptoppos
PGHOST=localhost
PGPORT=5432
PGDATABASE=laptoppos
PGUSER=laptoppos
PGPASSWORD=$DB_PASSWORD

# Security
BCRYPT_ROUNDS=12

# Default Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@laptoppos.com
EOF
    
    info "Database credentials saved to .env file"
    
    # Run database migrations
    log "Running database migrations..."
    export $(cat .env | xargs)
    npm run db:push --force || npm run db:push
    
    log "Initializing SaaS multi-tenant system..."
    # SaaS tables will be created automatically by schema
    
    log "Database setup completed successfully with SaaS support"
}

# Create systemd service
create_systemd_service() {
    log "Creating systemd service..."
    
    CURRENT_DIR=$(pwd)
    CURRENT_USER=$(whoami)
    
    sudo tee /etc/systemd/system/laptoppos.service > /dev/null <<EOF
[Unit]
Description=LaptopPOS - Point of Sale System
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$CURRENT_DIR
Environment=NODE_ENV=production
EnvironmentFile=$CURRENT_DIR/.env
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=laptoppos

[Install]
WantedBy=multi-user.target
EOF
    
    sudo systemctl daemon-reload
    sudo systemctl enable laptoppos
    
    log "Systemd service created and enabled"
}

# Start the application
start_application() {
    log "Starting LaptopPOS application..."
    
    sudo systemctl start laptoppos
    
    # Wait for service to start
    sleep 5
    
    if sudo systemctl is-active --quiet laptoppos; then
        log "LaptopPOS started successfully!"
    else
        error "Failed to start LaptopPOS. Check logs with: sudo journalctl -u laptoppos -f"
    fi
}

# Configure firewall
setup_firewall() {
    if command -v ufw >/dev/null 2>&1; then
        sudo ufw allow 5000/tcp
        info "Firewall configured to allow port 5000"
    elif command -v firewall-cmd >/dev/null 2>&1; then
        sudo firewall-cmd --permanent --add-port=5000/tcp
        sudo firewall-cmd --reload
        info "Firewall configured to allow port 5000"
    else
        warning "No firewall detected. Make sure port 5000 is accessible."
    fi
}

# Call all setup functions
setup_database
create_systemd_service
setup_firewall
start_application

echo
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN}     Installation Completed Successfully!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo
echo -e "${BLUE}Application URL:${NC} http://$(hostname -I | awk '{print $1}'):5000"
echo -e "${BLUE}Default Login:${NC} admin / admin123"
echo
echo -e "${YELLOW}Service Management:${NC}"
echo "  Start:   sudo systemctl start laptoppos"
echo "  Stop:    sudo systemctl stop laptoppos"
echo "  Restart: sudo systemctl restart laptoppos"
echo "  Status:  sudo systemctl status laptoppos"
echo "  Logs:    sudo journalctl -u laptoppos -f"
echo
echo -e "${YELLOW}Configuration Files:${NC}"
echo "  Environment: $(pwd)/.env"
echo "  Service:     /etc/systemd/system/laptoppos.service"
echo
echo -e "${RED}IMPORTANT: Change the default password after first login!${NC}"
echo -e "${GREEN}=============================================${NC}"