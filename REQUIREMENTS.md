# LaptopPOS System Requirements & Libraries

## System Dependencies

### Windows Requirements
- **Operating System:** Windows 10/11 or Windows Server 2019/2022
- **Node.js:** Version 18.0.0 or higher
- **npm:** Version 8.0.0 or higher (comes with Node.js)
- **PostgreSQL:** Version 13.0 or higher
- **Git:** Latest version (for source code management)
- **Memory:** 4GB RAM minimum, 8GB recommended
- **Storage:** 10GB free disk space minimum

### Linux Requirements  
- **Operating System:** 
  - Ubuntu 20.04 LTS or higher
  - Debian 11 or higher
  - CentOS 8 or higher
  - RHEL 8 or higher
  - Fedora 35 or higher
- **Node.js:** Version 18.0.0 or higher
- **npm:** Version 8.0.0 or higher
- **PostgreSQL:** Version 13.0 or higher
- **Git:** Latest version
- **Memory:** 4GB RAM minimum, 8GB recommended
- **Storage:** 10GB free disk space minimum

## Installation Commands

### Windows
```powershell
# Download Node.js installer from https://nodejs.org
# Download PostgreSQL installer from https://www.postgresql.org/download/windows/
# Download Git from https://git-scm.com/download/win
```

### Ubuntu/Debian
```bash
# Update package list
sudo apt update

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Install Git
sudo apt-get install -y git

# Install build essentials (for native modules)
sudo apt-get install -y build-essential python3
```

### CentOS/RHEL/Fedora
```bash
# Install Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Install PostgreSQL (CentOS/RHEL)
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install PostgreSQL (Fedora)
sudo dnf install -y postgresql postgresql-server postgresql-contrib
sudo postgresql-setup --initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Git and build tools
sudo yum install -y git gcc-c++ make python3
```

### Arch Linux
```bash
# Install Node.js
sudo pacman -S nodejs npm

# Install PostgreSQL
sudo pacman -S postgresql
sudo -u postgres initdb --locale=C.UTF-8 --encoding=UTF8 -D /var/lib/postgres/data
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Install Git and build tools
sudo pacman -S git base-devel python
```

## NPM Dependencies

### Production Dependencies (package-production.json)
```json
{
  "dependencies": {
    "@google-cloud/storage": "^7.17.0",
    "@hapi/boom": "^10.0.1",
    "@hookform/resolvers": "^3.10.0",
    "@jridgewell/trace-mapping": "^0.3.25",
    "@neondatabase/serverless": "^0.10.4",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@tanstack/react-query": "^5.60.5",
    "@types/bcryptjs": "^2.4.6",
    "@types/connect-pg-simple": "^7.0.3",
    "@types/express": "4.17.21",
    "@types/express-session": "^1.18.0",
    "@types/memoizee": "^0.4.12",
    "@types/node": "20.16.11",
    "@types/passport": "^1.0.16",
    "@types/passport-local": "^1.0.38",
    "@types/qrcode": "^1.5.5",
    "@types/react": "^18.3.11",
    "@types/react-dom": "^18.3.1",
    "@types/ws": "^8.5.13",
    "@uppy/aws-s3": "^5.0.0",
    "@uppy/core": "^5.0.1",
    "@uppy/dashboard": "^5.0.1",
    "@uppy/react": "^5.0.2",
    "@whiskeysockets/baileys": "^6.7.18",
    "bcryptjs": "^3.0.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.1.1",
    "connect-pg-simple": "^10.0.0",
    "date-fns": "^3.6.0",
    "drizzle-kit": "^0.30.4",
    "drizzle-orm": "^0.39.1",
    "drizzle-zod": "^0.7.0",
    "embla-carousel-react": "^8.6.0",
    "esbuild": "^0.25.0",
    "express": "^4.21.2",
    "express-session": "^1.18.1",
    "framer-motion": "^11.13.1",
    "html2canvas": "^1.4.1",
    "input-otp": "^1.4.2",
    "jspdf": "^3.0.2",
    "lucide-react": "^0.453.0",
    "memoizee": "^0.4.17",
    "memorystore": "^1.6.7",
    "next-themes": "^0.4.6",
    "openid-client": "^6.7.1",
    "passport": "^0.7.0",
    "passport-local": "^1.0.0",
    "pg": "^8.12.0",
    "qrcode": "^1.5.4",
    "qrcode-terminal": "^0.12.0",
    "react": "^18.3.1",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.3.1",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "tailwind-merge": "^2.6.0",
    "tailwindcss": "^3.4.17",
    "tailwindcss-animate": "^1.0.7",
    "tsx": "^4.19.1",
    "tw-animate-css": "^1.2.5",
    "typescript": "5.6.3",
    "vaul": "^1.1.2",
    "wouter": "^3.3.5",
    "ws": "^8.18.0",
    "xlsx": "^0.18.5",
    "zod": "^3.24.2",
    "zod-validation-error": "^3.4.0"
  }
}
```

## Optional Dependencies

### Process Manager (Recommended for Production)
```bash
npm install -g pm2
```

### SSL/TLS Support
```bash
# For HTTPS support
npm install https
npm install helmet
```

### Email Support
```bash
# For email notifications
npm install nodemailer
npm install @types/nodemailer
```

### Redis Cache (Optional)
```bash
# For caching
npm install redis
npm install @types/redis
```

### Backup Tools
```bash
# For automated backups
npm install node-cron
npm install archiver
```

## Development Dependencies (Optional)

```bash
# Testing
npm install --save-dev jest
npm install --save-dev @types/jest
npm install --save-dev supertest
npm install --save-dev @types/supertest

# Linting
npm install --save-dev eslint
npm install --save-dev @typescript-eslint/parser
npm install --save-dev @typescript-eslint/eslint-plugin

# Code formatting
npm install --save-dev prettier
npm install --save-dev eslint-config-prettier

# Hot reload for development
npm install --save-dev nodemon
npm install --save-dev concurrently
```

## Verification Commands

### Check System Requirements
```bash
# Check Node.js
node --version  # Should be 18+

# Check npm
npm --version   # Should be 8+

# Check PostgreSQL
pg_config --version  # Should be 13+

# Check Git
git --version

# Check system resources
free -h         # Linux - Check RAM
df -h           # Linux - Check disk space

# Windows equivalents
systeminfo      # Windows - System info
```

### Test Database Connection
```bash
# Test PostgreSQL connection
psql -h localhost -U postgres -d laptoppos -c "SELECT version();"
```

### Test Application
```bash
# Test build process
npm run build

# Test application start
npm start

# Check if application is responding
curl http://localhost:5000/api/health
```

## Troubleshooting Common Issues

### Node.js Installation Issues
```bash
# Clear npm cache
npm cache clean --force

# Reinstall Node.js if needed
# Windows: Download new installer
# Linux: Use package manager to remove and reinstall
```

### PostgreSQL Connection Issues
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql  # Linux
# Windows: Check Services panel

# Reset PostgreSQL user password
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'newpassword';"
```

### Permission Issues (Linux)
```bash
# Fix file permissions
sudo chown -R $USER:$USER /path/to/laptoppos
chmod +x install-linux.sh

# Fix PostgreSQL permissions
sudo -u postgres createuser --interactive
```

### Build Issues
```bash
# Install build essentials
sudo apt-get install build-essential  # Ubuntu/Debian
sudo yum groupinstall "Development Tools"  # CentOS/RHEL

# Clear and reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## Performance Tuning

### PostgreSQL Settings
Edit `/etc/postgresql/*/main/postgresql.conf`:
```
# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
maintenance_work_mem = 64MB

# Connection settings
max_connections = 100

# Checkpoint settings
checkpoint_completion_target = 0.7
wal_buffers = 16MB
```

### Node.js Settings
```bash
# Set Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

### System Limits (Linux)
Edit `/etc/security/limits.conf`:
```
* soft nofile 65536
* hard nofile 65536
```

## Firewall Configuration

### Windows Firewall
```powershell
# Allow Node.js through firewall
netsh advfirewall firewall add rule name="LaptopPOS" dir=in action=allow protocol=TCP localport=5000
```

### Linux Firewall (UFW)
```bash
# Allow application port
sudo ufw allow 5000/tcp

# Allow PostgreSQL (if remote access needed)
sudo ufw allow 5432/tcp

# Enable firewall
sudo ufw enable
```

### Linux Firewall (firewalld)
```bash
# Allow application port
sudo firewall-cmd --permanent --add-port=5000/tcp
sudo firewall-cmd --reload
```