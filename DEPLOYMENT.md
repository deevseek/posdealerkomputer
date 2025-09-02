# LaptopPOS Deployment Guide

## Sistem Persyaratan

### Windows
- Windows 10/11 atau Windows Server 2019/2022
- Node.js 18+ (https://nodejs.org/)
- PostgreSQL 13+ (https://www.postgresql.org/download/windows/)
- Git (https://git-scm.com/download/win)
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

### Linux (Ubuntu/Debian/CentOS/RHEL)
- Ubuntu 20.04+ / Debian 11+ / CentOS 8+ / RHEL 8+
- Node.js 18+ 
- PostgreSQL 13+
- Git
- 4GB RAM minimum, 8GB recommended
- 10GB free disk space

## File-file Deployment

1. **laptoppos_database.sql** - Database PostgreSQL lengkap dengan data sample
2. **.env.example** - Template konfigurasi environment variables
3. **package-production.json** - Package.json untuk production
4. **ecosystem.config.js** - Konfigurasi PM2 untuk production
5. **install-windows.bat** - Script instalasi otomatis Windows
6. **install-linux.sh** - Script instalasi otomatis Linux

## Instalasi Cepat

### Windows
1. Download semua file ke folder project
2. Jalankan `install-windows.bat` sebagai Administrator
3. Edit file `.env` dengan konfigurasi database Anda
4. Buat database: `createdb laptoppos`
5. Import database: `psql -d laptoppos -f laptoppos_database.sql`
6. Jalankan: `npm start`

### Linux
1. Download semua file ke folder project
2. Jalankan script: `chmod +x install-linux.sh && ./install-linux.sh`
3. Edit file `.env` dengan konfigurasi database Anda
4. Setup database PostgreSQL (lihat panduan di output script)
5. Jalankan: `npm start`

## Konfigurasi Environment (.env)

### Database (WAJIB)
```env
DATABASE_URL=postgresql://username:password@localhost:5432/laptoppos
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
```

### Aplikasi
```env
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-secure-session-secret
```

### Keamanan (PENTING)
```env
JWT_SECRET=your-jwt-secret
ENCRYPTION_KEY=your-32-char-encryption-key
```

### Optional Features
```env
# Email notifications
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# WhatsApp integration
WHATSAPP_SESSION_PATH=./whatsapp_session

# File uploads
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=10485760
```

## Database Setup

### 1. Install PostgreSQL
**Windows:**
- Download dari https://www.postgresql.org/download/windows/
- Install dengan default settings
- Catat password untuk user 'postgres'

**Linux:**
- Ubuntu/Debian: `sudo apt-get install postgresql postgresql-contrib`
- CentOS/RHEL: `sudo yum install postgresql-server postgresql-contrib`
- Start service: `sudo systemctl start postgresql`

### 2. Buat Database
```bash
# Sebagai user postgres
sudo -u postgres createdb laptoppos

# Atau dengan psql
sudo -u postgres psql
CREATE DATABASE laptoppos;
\q
```

### 3. Import Database
```bash
sudo -u postgres psql -d laptoppos -f laptoppos_database.sql
```

### 4. Verifikasi Database
```bash
sudo -u postgres psql -d laptoppos -c "\dt"
```

## Menjalankan Aplikasi

### Development
```bash
npm run dev
```

### Production
```bash
# Build aplikasi
npm run build

# Jalankan
npm start

# Atau dengan PM2 (recommended)
npm install -g pm2
npm run pm2:start
```

### Sebagai Service (Linux)
```bash
# Copy service file
sudo cp laptoppos.service /etc/systemd/system/

# Enable dan start service
sudo systemctl daemon-reload
sudo systemctl enable laptoppos
sudo systemctl start laptoppos

# Check status
sudo systemctl status laptoppos
```

## Default Login

Setelah database di-import, gunakan login default:
- **Username:** admin
- **Email:** admin@laptoppos.com
- **Password:** password

⚠️ **PENTING: Segera ganti password default setelah login pertama!**

## Struktur Folder

```
laptoppos/
├── dist/                  # Built application
├── logs/                  # Application logs
├── uploads/               # File uploads
├── temp/                  # Temporary files
├── backups/               # Database backups
├── whatsapp_session/      # WhatsApp session data
├── .env                   # Environment variables
├── laptoppos_database.sql # Database script
└── package.json           # Dependencies
```

## Monitoring & Logs

### PM2 Commands
```bash
pm2 logs laptoppos         # View logs
pm2 restart laptoppos      # Restart app
pm2 stop laptoppos         # Stop app
pm2 status                 # Check status
```

### Log Files
- Application logs: `logs/`
- PostgreSQL logs: `/var/log/postgresql/` (Linux)
- System logs: `journalctl -u laptoppos` (Linux)

## Backup & Restore

### Database Backup
```bash
# Backup
pg_dump -h localhost -U postgres laptoppos > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres -d laptoppos < backup_20240101.sql
```

### File Backup
Backup folder `uploads/` dan `whatsapp_session/` secara berkala.

## Security Checklist

- [ ] Ganti password default admin
- [ ] Update SESSION_SECRET dengan key yang kuat
- [ ] Update JWT_SECRET dengan key yang kuat  
- [ ] Set firewall untuk port 5432 (PostgreSQL)
- [ ] Enable SSL/HTTPS untuk production
- [ ] Regular backup database dan files
- [ ] Update dependencies secara berkala: `npm audit`

## Troubleshooting

### Error: Database connection failed
1. Check PostgreSQL service status
2. Verify DATABASE_URL in .env
3. Check firewall settings
4. Verify PostgreSQL user permissions

### Error: Port already in use
1. Check if another service uses port 5000
2. Change PORT in .env file
3. Kill existing process: `pkill -f node`

### Error: Permission denied
**Linux:**
```bash
sudo chown -R $USER:$USER /path/to/laptoppos
chmod +x install-linux.sh
```

### Error: npm install fails
```bash
# Clear cache
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

## Production Optimization

### 1. Enable Compression
Edit `server/index.ts` untuk enable gzip compression.

### 2. Use Process Manager
PM2 recommended untuk production:
```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 3. Database Tuning
Edit `/etc/postgresql/*/main/postgresql.conf`:
```
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB
```

### 4. Reverse Proxy
Use Nginx/Apache sebagai reverse proxy:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Support

Jika mengalami masalah:
1. Check logs di folder `logs/`
2. Verify konfigurasi .env
3. Test database connection
4. Check system resources (RAM, disk space)