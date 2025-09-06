#!/bin/bash

# Script untuk update domain di environment file
# Usage: ./update-domain.sh https://your-ngrok-url.ngrok.io

if [ -z "$1" ]; then
    echo "❌ Usage: ./update-domain.sh <URL>"
    echo "   Example: ./update-domain.sh https://abc123.ngrok.io"
    exit 1
fi

NEW_URL="$1"
ENV_FILE=".env"

echo "🔧 Updating domain configuration..."

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "❌ File .env tidak ditemukan di directory ini"
    exit 1
fi

# Remove old PUBLIC_URL entries
sed -i '/^PUBLIC_URL=/d' "$ENV_FILE"
sed -i '/^APP_URL=/d' "$ENV_FILE" 
sed -i '/^NGROK_URL=/d' "$ENV_FILE"

# Add new PUBLIC_URL
echo "" >> "$ENV_FILE"
echo "# Public URL - Updated $(date)" >> "$ENV_FILE"
echo "PUBLIC_URL=$NEW_URL" >> "$ENV_FILE"

echo "✅ Domain berhasil diupdate ke: $NEW_URL"

# Check if PM2 is running
if command -v pm2 &> /dev/null; then
    if pm2 list | grep -q "laptoppos"; then
        echo "🔄 Restarting aplikasi dengan PM2..."
        pm2 restart laptoppos
        echo "✅ Aplikasi berhasil direstart"
    else
        echo "⚠️  Aplikasi tidak berjalan di PM2"
        echo "   Jalankan: pm2 start npm --name 'laptoppos' -- start"
    fi
else
    echo "⚠️  PM2 tidak terinstall"
    echo "   Restart manual aplikasi jika sedang berjalan"
fi

echo ""
echo "🎉 Setup selesai!"
echo "   Link cek status service sekarang akan menggunakan: $NEW_URL/service-status"
echo ""