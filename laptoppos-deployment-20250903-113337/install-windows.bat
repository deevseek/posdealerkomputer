@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo =============================================
echo LaptopPOS Installation Script for Windows
echo =============================================
echo.
echo Checking prerequisites...

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo Recommended version: 18.x or higher
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1 delims=v" %%i in ('node --version') do set NODE_VERSION=%%i
echo Node.js version: %NODE_VERSION%

:: Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed!
    pause
    exit /b 1
)

:: Check if PostgreSQL is installed
pg_config --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: PostgreSQL is not installed or not in PATH!
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    echo Make sure to:
    echo 1. Install PostgreSQL with default settings
    echo 2. Remember the password for 'postgres' user
    echo 3. Add PostgreSQL bin directory to system PATH
    echo.
    echo After installation, restart this script.
    pause
    exit /b 1
)

echo PostgreSQL found. Version:
pg_config --version

echo.
echo Installing dependencies...
npm install

if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Creating necessary directories...
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads
if not exist "temp" mkdir temp
if not exist "temp\reports" mkdir temp\reports
if not exist "backups" mkdir backups
if not exist "whatsapp_session" mkdir whatsapp_session

echo.
echo Setting up environment configuration...
if not exist ".env" (
    echo Creating .env file with default configuration...
    (
        echo NODE_ENV=production
        echo PORT=5000
        echo SESSION_SECRET=%RANDOM%-%RANDOM%-%RANDOM%-LAPTOPPOS
        echo.
        echo # Database Configuration - EDIT THESE VALUES
        echo DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/laptoppos
        echo PGHOST=localhost
        echo PGPORT=5432
        echo PGDATABASE=laptoppos
        echo PGUSER=postgres
        echo PGPASSWORD=yourpassword
        echo.
        echo # Security
        echo BCRYPT_ROUNDS=12
        echo.
        echo # Default Admin Credentials
        echo DEFAULT_ADMIN_USERNAME=admin
        echo DEFAULT_ADMIN_PASSWORD=admin123
        echo DEFAULT_ADMIN_EMAIL=admin@laptoppos.com
    ) > .env
    echo Created .env file with default configuration
    echo IMPORTANT: Edit .env file and update your PostgreSQL password!
) else (
    echo .env file already exists
)

echo.
echo Building application...
npm run build

if errorlevel 1 (
    echo ERROR: Failed to build application!
    pause
    exit /b 1
)

echo.
echo Setting up database...
echo Creating PostgreSQL database 'laptoppos'...
createdb -U postgres laptoppos 2>nul
if errorlevel 1 (
    echo Database might already exist or permission denied.
    echo You may need to run: dropdb -U postgres laptoppos
    echo Then run this script again.
)

echo Importing database schema...
if exist "laptoppos_database.sql" (
    psql -U postgres -d laptoppos -f laptoppos_database.sql >nul 2>&1
    if errorlevel 1 (
        echo WARNING: Database import might have failed.
        echo Please check your PostgreSQL credentials.
    ) else (
        echo Database imported successfully!
    )
) else (
    echo WARNING: laptoppos_database.sql not found!
    echo Database schema not imported.
)

echo.
echo =============================================
echo Installation completed successfully!
echo =============================================
echo.
echo NEXT STEPS:
echo 1. Edit .env file with your PostgreSQL password
echo 2. Start the application: npm start
echo 3. Open browser: http://localhost:5000
echo.
echo LOGIN CREDENTIALS:
echo Username: admin
echo Password: admin123
echo.
echo IMPORTANT NOTES:
echo - Change default password after first login
echo - The database 'laptoppos' has been created
echo - Update .env file with correct PostgreSQL password
echo.
echo LOGIN CREDENTIALS:
echo Username: admin
echo Password: admin123
echo.
echo IMPORTANT: Change the default password after first login!
echo.
echo For development: npm run dev
echo For production: npm start
echo.
echo Optional PM2 (Process Manager):
echo npm install -g pm2
echo npm run pm2:start
echo.
pause