#!/bin/bash

# LaptopPOS Universal Deployment Script
# This script creates a complete deployment package for any Linux/Windows server

set -e

echo "============================================="
echo "LaptopPOS - Universal Deployment Creator"
echo "============================================="

# Create deployment directory
DEPLOY_DIR="laptoppos-deployment-$(date +%Y%m%d-%H%M%S)"
mkdir -p $DEPLOY_DIR

echo "Creating deployment package in: $DEPLOY_DIR"

# Copy essential files
echo "Copying application files..."
cp -r client/ $DEPLOY_DIR/
cp -r server/ $DEPLOY_DIR/
cp -r shared/ $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp package-lock.json $DEPLOY_DIR/
cp tsconfig.json $DEPLOY_DIR/
cp vite.config.ts $DEPLOY_DIR/
cp tailwind.config.ts $DEPLOY_DIR/
cp postcss.config.js $DEPLOY_DIR/
cp drizzle.config.ts $DEPLOY_DIR/
cp components.json $DEPLOY_DIR/

# Copy deployment scripts
echo "Copying deployment scripts..."
cp install-linux.sh $DEPLOY_DIR/
cp install-windows.bat $DEPLOY_DIR/
cp .env.example $DEPLOY_DIR/

# Create production package.json (without dev dependencies)
echo "Creating production package.json..."
node -e "
const pkg = require('./package.json');
const prodPkg = {
  ...pkg,
  devDependencies: undefined,
  scripts: {
    start: 'NODE_ENV=production node dist/server/index.js',
    build: 'tsc && vite build',
    'db:push': pkg.scripts['db:push'],
    'db:studio': pkg.scripts['db:studio'],
    'pm2:start': 'pm2 start ecosystem.config.js',
    'pm2:stop': 'pm2 stop laptoppos',
    'pm2:restart': 'pm2 restart laptoppos'
  }
};
require('fs').writeFileSync('$DEPLOY_DIR/package-production.json', JSON.stringify(prodPkg, null, 2));
"

# Create PM2 ecosystem config
echo "Creating PM2 configuration..."
cat > $DEPLOY_DIR/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'laptoppos',
    script: 'dist/server/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Export current database schema
echo "Exporting database schema..."
if [ -n "$DATABASE_URL" ]; then
    # Try to export current schema
    pg_dump $DATABASE_URL --schema-only --no-owner --no-privileges > $DEPLOY_DIR/current_schema.sql 2>/dev/null || {
        echo "Warning: Could not export current schema, using existing file"
        cp laptoppos_database.sql $DEPLOY_DIR/ 2>/dev/null || echo "No database schema file found"
    }
    
    # Export sample data (admin user and store config)
    pg_dump $DATABASE_URL --data-only --inserts --column-inserts -t users -t store_config > $DEPLOY_DIR/sample_data.sql 2>/dev/null || {
        echo "Warning: Could not export sample data"
    }
else
    echo "Warning: DATABASE_URL not set, using existing schema file"
    cp laptoppos_database.sql $DEPLOY_DIR/ 2>/dev/null || echo "No database schema file found"
fi

# Create comprehensive README
echo "Creating deployment README..."
cat > $DEPLOY_DIR/README.md << 'EOF'
# LaptopPOS - Deployment Package

## Quick Start

### Linux (Ubuntu/Debian/CentOS/RHEL)
```bash
chmod +x install-linux.sh
./install-linux.sh
```

### Windows
```cmd
install-windows.bat
```

## Manual Installation

### 1. Prerequisites
- Node.js 18+ 
- PostgreSQL 13+
- 4GB RAM minimum

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Setup Database
```bash
# Create database
createdb laptoppos

# Import schema
psql -d laptoppos -f laptoppos_database.sql
```

### 5. Build & Run
```bash
npm run build
npm start
```

## Default Login
- Username: admin
- Password: admin123

⚠️ **Change default password after first login!**

## Production Deployment

### Using PM2 (Recommended)
```bash
npm install -g pm2
npm run pm2:start
```

### Using systemd (Linux)
```bash
sudo cp laptoppos.service /etc/systemd/system/
sudo systemctl enable laptoppos
sudo systemctl start laptoppos
```

## Support
- Application runs on port 5000
- Check logs: `pm2 logs` or `sudo journalctl -u laptoppos`
- Database: PostgreSQL with `laptoppos` database
EOF

# Create Windows service installer
echo "Creating Windows service installer..."
cat > $DEPLOY_DIR/install-windows-service.bat << 'EOF'
@echo off
echo Installing LaptopPOS as Windows Service...

npm install -g pm2
npm install -g pm2-windows-service

pm2-service-install
pm2 start ecosystem.config.js
pm2 save

echo Service installed successfully!
echo Use 'pm2 list' to check status
pause
EOF

# Make scripts executable
chmod +x $DEPLOY_DIR/install-linux.sh

# Create archive
echo "Creating deployment archive..."
tar -czf ${DEPLOY_DIR}.tar.gz $DEPLOY_DIR/
zip -r ${DEPLOY_DIR}.zip $DEPLOY_DIR/ >/dev/null 2>&1

echo "============================================="
echo "Deployment package created successfully!"
echo "============================================="
echo
echo "Files created:"
echo "- ${DEPLOY_DIR}.tar.gz (Linux deployment)"
echo "- ${DEPLOY_DIR}.zip (Windows deployment)"
echo
echo "To deploy:"
echo "1. Extract archive on target server"
echo "2. Run install script for your platform"
echo "3. Access application at http://server-ip:5000"
echo
echo "Default login: admin / admin123"
echo "============================================="