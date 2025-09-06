# Panduan Instalasi LaptopPOS di Linux dengan aaPanel

## Persyaratan Sistem

### Minimum Requirements
- **OS**: Ubuntu 20.04 LTS / CentOS 7+ / Debian 10+
- **RAM**: 2GB (Recommended 4GB+)
- **Storage**: 20GB free space
- **CPU**: 2 cores minimum
- **Network**: Koneksi internet stabil

### Software Requirements
- Node.js 18+
- PostgreSQL 14+
- Nginx
- PM2 (Process Manager)

## 1. Persiapan Server Linux

### Update System
```bash
# Ubuntu/Debian
sudo apt update && sudo apt upgrade -y

# CentOS/RHEL
sudo yum update -y
```

### Install Dependencies
```bash
# Ubuntu/Debian
sudo apt install curl wget git unzip -y

# CentOS/RHEL
sudo yum install curl wget git unzip -y
```

## 2. Instalasi aaPanel

### Download dan Install aaPanel
```bash
# Download installer
wget -O install.sh http://www.aapanel.com/script/install-ubuntu_6.0_en.sh

# Jalankan installer
sudo bash install.sh
```

### Akses aaPanel
1. Setelah instalasi selesai, catat informasi login:
   - **Panel URL**: `http://your-server-ip:8888`
   - **Username**: Akan ditampilkan di terminal
   - **Password**: Akan ditampilkan di terminal

2. Login ke aaPanel melalui browser
3. Complete initial setup wizard

## 3. Setup Environment di aaPanel

### Install Software Stack
1. **Masuk ke aaPanel → Software Store**
2. **Install komponen berikut:**
   - **Nginx** (Latest version)
   - **PostgreSQL** (Version 14+)
   - **Node.js** (Version 18+)
   - **PM2** (Process Manager)

### Konfigurasi PostgreSQL
1. **aaPanel → Database → PostgreSQL**
2. **Buat database baru:**
   ```sql
   Database Name: laptoppos
   Username: laptoppos_user
   Password: [strong_password]
   ```
3. **Catat connection string:**
   ```
   postgresql://laptoppos_user:password@localhost:5432/laptoppos
   ```

## 4. Setup Domain dan SSL

### Tambah Website
1. **aaPanel → Website → Add Site**
2. **Isi informasi:**
   - **Domain**: `your-domain.com`
   - **Document Root**: `/www/wwwroot/laptoppos`
   - **PHP Version**: Tidak diperlukan (Node.js app)

### Setup SSL Certificate
1. **aaPanel → Website → [Your Domain] → SSL**
2. **Pilih salah satu:**
   - **Let's Encrypt** (Free, recommended)
   - **Upload custom certificate**
3. **Enable Force HTTPS**

## 5. Deploy LaptopPOS Application

### Clone Repository
```bash
# Masuk ke directory website
cd /www/wwwroot/laptoppos

# Clone source code
git clone [repository-url] .

# Install dependencies
npm install
```

### Environment Configuration
```bash
# Buat file environment
nano .env
```

```env
# Database Configuration
DATABASE_URL=postgresql://laptoppos_user:password@localhost:5432/laptoppos
PGHOST=localhost
PGPORT=5432
PGUSER=laptoppos_user
PGPASSWORD=your_password
PGDATABASE=laptoppos

# Session Configuration
SESSION_SECRET=your-super-secret-session-key-change-this

# Application Configuration
NODE_ENV=production
PORT=3000

# Replit Auth (Optional - for Replit integration)
REPL_ID=your-repl-id
REPLIT_DOMAINS=your-domain.com
ISSUER_URL=https://replit.com/oidc

# Default Admin (will be created on first run)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@your-domain.com
```

### Build Application
```bash
# Build production version
npm run build

# Run database migration
npm run db:push
```

## 6. Setup Process Manager dengan PM2

### Create PM2 Ecosystem File
```bash
nano ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'laptoppos',
    script: 'npm',
    args: 'start',
    cwd: '/www/wwwroot/laptoppos',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
```

### Start Application
```bash
# Start dengan PM2
pm2 start ecosystem.config.js

# Enable startup script
pm2 startup
pm2 save
```

## 7. Konfigurasi Nginx Reverse Proxy

### Edit Nginx Configuration
1. **aaPanel → Website → [Your Domain] → Config**
2. **Replace configuration:**

```nginx
server {
    listen 80;
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration (jika menggunakan SSL)
    ssl_certificate /www/server/panel/vhost/cert/your-domain.com/fullchain.pem;
    ssl_certificate_key /www/server/panel/vhost/cert/your-domain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    # Force HTTPS
    if ($scheme != "https") {
        return 301 https://$host$request_uri;
    }
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Restart Nginx
```bash
# Via aaPanel
aaPanel → Service → Nginx → Restart

# Via command line
sudo systemctl restart nginx
```

## 8. Setup Database dan Initial Configuration

### Run Initial Setup
1. **Akses aplikasi**: `https://your-domain.com`
2. **Akan muncul Setup Wizard**
3. **Ikuti langkah-langkah:**
   - Database migration
   - Store configuration
   - Admin user creation
   - Complete setup

### Manual Database Setup (jika diperlukan)
```bash
cd /www/wwwroot/laptoppos

# Force database migration
npm run db:push --force

# Seed initial data (optional)
npm run seed
```

## 9. Monitoring dan Maintenance

### Setup Monitoring
```bash
# Install monitoring tools
npm install -g pm2-logrotate

# Setup log rotation
pm2 install pm2-logrotate
```

### Regular Maintenance Tasks
```bash
# Update application
cd /www/wwwroot/laptoppos
git pull origin main
npm install
npm run build
pm2 restart laptoppos

# Database backup
pg_dump -h localhost -U laptoppos_user laptoppos > backup_$(date +%Y%m%d).sql

# View logs
pm2 logs laptoppos

# Monitor processes
pm2 monit
```

## 10. Security Hardening

### Firewall Configuration
```bash
# Ubuntu UFW
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 8888/tcp  # aaPanel (restrict to specific IPs)
sudo ufw enable

# CentOS Firewalld
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=8888/tcp
sudo firewall-cmd --reload
```

### Database Security
1. **Restrict PostgreSQL connections**
2. **Use strong passwords**
3. **Regular backups**
4. **Monitor access logs**

### Application Security
1. **Keep dependencies updated**
2. **Regular security scans**
3. **Monitor error logs**
4. **Implement rate limiting**

## 11. Troubleshooting

### Common Issues

**Application tidak start:**
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs laptoppos

# Restart application
pm2 restart laptoppos
```

**Database connection error:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test connection
psql -h localhost -U laptoppos_user -d laptoppos
```

**Nginx errors:**
```bash
# Check Nginx status
sudo systemctl status nginx

# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### Performance Optimization

**Enable Gzip compression:**
```nginx
# Add to Nginx config
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
```

**Database optimization:**
```sql
-- Regular maintenance
VACUUM ANALYZE;
REINDEX DATABASE laptoppos;
```

## 12. Backup Strategy

### Automated Backup Script
```bash
#!/bin/bash
# /etc/cron.daily/laptoppos-backup

BACKUP_DIR="/backup/laptoppos"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U laptoppos_user laptoppos > $BACKUP_DIR/db_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_$DATE.tar.gz /www/wwwroot/laptoppos

# Keep only last 7 days
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

### Make script executable
```bash
sudo chmod +x /etc/cron.daily/laptoppos-backup
```

## Support dan Dokumentasi

- **Application Documentation**: Tersedia di `/docs` setelah instalasi
- **aaPanel Documentation**: https://www.aapanel.com/docs/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/

---

**Instalasi selesai!** Aplikasi LaptopPOS sekarang dapat diakses melalui domain Anda dengan HTTPS dan running secara production-ready di Linux dengan aaPanel.