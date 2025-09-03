#!/bin/bash

echo "============================================="
echo "LaptopPOS Installation Script for Linux"
echo "============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_warning "Running as root. It's recommended to run as a regular user."
fi

print_status "Checking prerequisites..."

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

echo
print_success "============================================="
print_success "Installation completed successfully!"
print_success "============================================="
echo
echo "Next steps:"
echo "1. Setup PostgreSQL user and database:"
echo "   sudo -u postgres createuser --interactive"
echo "   sudo -u postgres createdb laptoppos"
echo "   sudo -u postgres psql -d laptoppos -f laptoppos_database.sql"
echo
echo "2. Edit .env file with your database credentials:"
echo "   nano .env"
echo
echo "3. Run the application:"
echo "   For development: npm run dev"
echo "   For production: npm start"
echo
echo "LOGIN CREDENTIALS:"
echo "Username: admin"
echo "Password: admin123"
echo
echo "IMPORTANT: Change the default password after first login!"
echo
echo "4. Optional - Install as system service:"
echo "   sudo cp laptoppos.service /etc/systemd/system/"
echo "   sudo systemctl daemon-reload"
echo "   sudo systemctl enable laptoppos"
echo "   sudo systemctl start laptoppos"
echo
echo "5. Optional - Install PM2 for process management:"
echo "   npm install -g pm2"
echo "   npm run pm2:start"
echo
print_success "Access your application at: http://localhost:5000"