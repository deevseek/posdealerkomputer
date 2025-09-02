@echo off
echo =============================================
echo LaptopPOS Installation Script for Windows
echo =============================================

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
    echo WARNING: PostgreSQL is not installed or not in PATH!
    echo Please install PostgreSQL from https://www.postgresql.org/download/windows/
    echo Or ensure pg_config is in your system PATH
)

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
    copy ".env.example" ".env"
    echo Created .env file from template
    echo IMPORTANT: Please edit .env file with your database credentials!
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
echo =============================================
echo Installation completed successfully!
echo =============================================
echo.
echo Next steps:
echo 1. Install PostgreSQL if not already installed
echo 2. Create database: createdb laptoppos
echo 3. Import database: psql -d laptoppos -f laptoppos_database.sql
echo 4. Edit .env file with your database credentials
echo 5. Run: npm start
echo.
echo For development: npm run dev
echo For production: npm start
echo.
echo Optional PM2 (Process Manager):
echo npm install -g pm2
echo npm run pm2:start
echo.
pause