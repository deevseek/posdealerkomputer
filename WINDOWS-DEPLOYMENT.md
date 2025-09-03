# LaptopPOS Windows Deployment Guide

## Masalah Login dan Solusi

### ❌ Masalah Umum
Setelah deploy ke Windows, tidak bisa login karena aplikasi ini dikonfigurasi untuk Replit Authentication.

### ✅ Solusi

#### 1. Pastikan .env sudah benar
Buka file `.env` dan pastikan tidak ada variabel Replit:
```env
# JANGAN ada variabel ini untuk local deployment:
# REPLIT_DOMAINS=...
# ISSUER_URL=...
# REPL_ID=...

# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/laptoppos
PGHOST=localhost
PGPORT=5432
PGDATABASE=laptoppos
PGUSER=postgres
PGPASSWORD=your_password_here

# Application Configuration
NODE_ENV=production
PORT=5000
SESSION_SECRET=your-very-secure-session-secret-key-change-this

# Default Admin Credentials
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@laptoppos.com
```

#### 2. Login Credentials untuk Windows
```
Username: admin
Password: admin123
```

#### 3. Langkah Installation Ulang (jika masih bermasalah)
1. Hapus folder `node_modules`
2. Hapus file `package-lock.json`
3. Jalankan: `npm install`
4. Jalankan: `npm run build`
5. Jalankan: `npm start`

#### 4. Troubleshooting
Jika masih tidak bisa login:
1. Buka browser di `http://localhost:5000`
2. Pastikan database PostgreSQL sudah running
3. Cek log di terminal untuk error
4. Pastikan file `.env` sudah di-setup dengan benar

### 📞 Bantuan Teknis
Jika masih mengalami masalah, screenshot error yang muncul di browser atau terminal.

## Tips Windows Deployment
- Gunakan Command Prompt as Administrator
- Pastikan PostgreSQL service sudah running
- Firewall Windows mungkin perlu dikonfigurasi untuk port 5000
- Antivirus mungkin perlu whitelist folder aplikasi