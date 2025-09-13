@echo off
REM SilberArrows CRM - Development Server Startup Script (Windows)
REM This script starts the Next.js development server on localhost:3000

echo 🚀 Starting SilberArrows CRM Development Server...
echo 📍 Server will be available at: http://localhost:3000
echo 🐍 Python scraper will be available for 'Find Leads' functionality
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install npm first.
    pause
    exit /b 1
)

REM Check if Python 3 is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python 3 is not installed. Please install Python 3 first.
    pause
    exit /b 1
)

REM Install Node.js dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing Node.js dependencies...
    npm install
)

REM Install Python dependencies if needed
python -c "import selenium" >nul 2>&1
if %errorlevel% neq 0 (
    echo 🐍 Installing Python dependencies...
    python -m pip install -r requirements.txt
)

REM Start the development server
echo 🔄 Starting development server...
npm run dev 