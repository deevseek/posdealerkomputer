# LaptopPOS - Quick Deployment Guide

## 🚀 One-Command Installation

### For Linux Servers
```bash
curl -sSL https://your-server.com/install-linux.sh | bash
```

### For Windows Servers
1. Download `install-windows.bat`
2. Run as Administrator
3. Done!

## 📋 What Gets Installed Automatically

### ✅ Linux Installation Includes:
- Node.js 20.x (if not installed)
- PostgreSQL 13+ (if not installed)
- LaptopPOS application and dependencies
- Secure database setup with random passwords
- Systemd service configuration
- Firewall configuration (UFW/firewalld)
- Automatic service startup
- Environment file with secure defaults

### ✅ Windows Installation Includes:
- Dependency checking (Node.js, PostgreSQL)
- LaptopPOS application and dependencies
- Database creation and setup
- Environment configuration
- Service management instructions

## 🔧 Advanced Options

### Create Deployment Package
If you have a working LaptopPOS instance and want to deploy to other servers:
```bash
./deploy-auto.sh
```

This creates a complete deployment package with:
- Current database schema
- All application files
- Installation scripts
- Configuration templates

### Manual Database Migration
To use the same database as your current server:
```bash
# Export current database
pg_dump $DATABASE_URL > current_database.sql

# On target server (after installation)
psql -d laptoppos -f current_database.sql
```

## 🌐 Post-Installation

### Access Your Application
- **URL:** http://server-ip:5000
- **Username:** admin
- **Password:** admin123

### Service Management (Linux)
```bash
sudo systemctl start laptoppos     # Start
sudo systemctl stop laptoppos      # Stop
sudo systemctl restart laptoppos   # Restart
sudo systemctl status laptoppos    # Check status
sudo journalctl -u laptoppos -f    # View logs
```

### Service Management (Windows)
```cmd
# Using PM2 (install after initial setup)
npm install -g pm2
pm2 start ecosystem.config.js
pm2 list                          # Check status
pm2 logs                          # View logs
pm2 restart laptoppos            # Restart
```

## 🛡️ Security Checklist

After installation:
- [ ] Change default admin password
- [ ] Update SESSION_SECRET in .env file
- [ ] Configure SSL/HTTPS for production
- [ ] Setup regular database backups
- [ ] Configure proper firewall rules
- [ ] Review and update default configurations

## 📞 Support

If installation fails:
1. Check logs for errors
2. Verify system requirements
3. Ensure proper network connectivity
4. Check PostgreSQL service status

**Linux:** `sudo journalctl -u laptoppos -f`
**Windows:** Check command prompt output during installation

---

**Total Installation Time:** 3-5 minutes
**Zero Manual Configuration Required**