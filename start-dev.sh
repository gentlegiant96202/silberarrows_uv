#!/bin/bash

# SilberArrows CRM - Development Server Startup Script
# This script starts the Next.js development server and opens it in your browser

echo "🚀 Starting SilberArrows CRM Development Server..."
echo ""

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to find Node.js in common locations
find_node() {
    # Check common Node.js locations on macOS
    local node_paths=(
        "/usr/local/bin/node"
        "/opt/homebrew/bin/node"
        "$HOME/.nvm/versions/node/*/bin/node"
        "/usr/bin/node"
    )
    
    for path in "${node_paths[@]}"; do
        if [[ -x $path ]]; then
            echo "$path"
            return 0
        fi
    done
    
    # Try to find via which
    if command_exists node; then
        which node
        return 0
    fi
    
    return 1
}

# Function to find npm in common locations
find_npm() {
    # Check common npm locations on macOS
    local npm_paths=(
        "/usr/local/bin/npm"
        "/opt/homebrew/bin/npm"
        "$HOME/.nvm/versions/node/*/bin/npm"
        "/usr/bin/npm"
    )
    
    for path in "${npm_paths[@]}"; do
        if [[ -x $path ]]; then
            echo "$path"
            return 0
        fi
    done
    
    # Try to find via which
    if command_exists npm; then
        which npm
        return 0
    fi
    
    return 1
}

# Clean up any existing processes
echo "🧹 Cleaning up existing processes..."
EXISTING_PIDS=$(lsof -ti:3000 2>/dev/null || true)
if [ ! -z "$EXISTING_PIDS" ]; then
    echo "   Stopping existing processes on port 3000..."
    echo "$EXISTING_PIDS" | xargs kill -9 2>/dev/null || true
fi

# Kill any existing Next.js processes
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true

# Remove Next.js cache
if [ -d ".next" ]; then
    echo "   Clearing Next.js cache..."
    rm -rf .next
fi

echo "✅ Cleanup complete"
echo ""

# Check for Node.js
NODE_PATH=$(find_node)
if [[ -z "$NODE_PATH" ]]; then
    echo "❌ Node.js is not installed or not found in PATH."
    echo "📋 Please install Node.js from: https://nodejs.org/"
    echo "   Or install via Homebrew: brew install node"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

# Check for npm
NPM_PATH=$(find_npm)
if [[ -z "$NPM_PATH" ]]; then
    echo "❌ npm is not installed or not found in PATH."
    echo "📋 npm usually comes with Node.js. Please reinstall Node.js from: https://nodejs.org/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Found Node.js: $NODE_PATH"
echo "✅ Found npm: $NPM_PATH"

# Check for Python 3 (optional for scraper)
if command_exists python3; then
    echo "✅ Found Python 3: $(which python3)"
    PYTHON_AVAILABLE=true
else
    echo "⚠️  Python 3 not found - scraper functionality will be limited"
    echo "📋 Install Python 3 from: https://python.org/ or brew install python"
    PYTHON_AVAILABLE=false
fi

echo ""

# Install Node.js dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    "$NPM_PATH" install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install Node.js dependencies"
        read -p "Press Enter to exit..."
        exit 1
    fi
fi

# Install Python dependencies if Python is available
if [ "$PYTHON_AVAILABLE" = true ] && [ -f "requirements.txt" ]; then
    if ! python3 -c "import selenium" &> /dev/null; then
        echo "🐍 Installing Python dependencies..."
        python3 -m pip install -r requirements.txt
        if [ $? -ne 0 ]; then
            echo "⚠️  Failed to install Python dependencies - scraper may not work"
        fi
    fi
fi

echo ""
echo "🔄 Starting development server..."
echo "📍 Server will be available at: http://localhost:3000"
if [ "$PYTHON_AVAILABLE" = true ]; then
    echo "🐍 Python scraper will be available for 'Find Leads' functionality"
else
    echo "⚠️  Python scraper not available - install Python 3 for full functionality"
fi
echo ""
echo "🌐 Opening browser in 5 seconds..."
echo "   (Press Ctrl+C to stop the server)"
echo ""

# Start the development server in the background
"$NPM_PATH" run dev &
SERVER_PID=$!

# Wait a bit longer for the server to fully start
sleep 5

# Check if server is responding
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo "✅ Server is running successfully!"
    
    # Open the browser
    if command_exists open; then
        open http://localhost:3000
    elif command_exists xdg-open; then
        xdg-open http://localhost:3000
    else
        echo "🌐 Please open http://localhost:3000 in your browser"
    fi
else
    echo "⚠️  Server may still be starting... please wait a moment"
    echo "🌐 Try opening http://localhost:3000 in your browser"
fi

# Wait for the server process
wait $SERVER_PID 