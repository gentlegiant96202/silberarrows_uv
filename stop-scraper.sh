#!/bin/bash

# Stop scraper script
echo "🛑 Stopping Dubizzle scraper..."

# Check if PID file exists
if [ -f "scraper.pid" ]; then
    PID=$(cat scraper.pid)
    echo "📋 Found scraper PID: $PID"
    
    # Check if process is running
    if kill -0 $PID 2>/dev/null; then
        echo "⏹️  Stopping scraper process..."
        kill $PID
        
        # Wait a moment and force kill if needed
        sleep 2
        if kill -0 $PID 2>/dev/null; then
            echo "🔥 Force killing scraper process..."
            kill -9 $PID
        fi
        
        echo "✅ Scraper stopped successfully"
    else
        echo "⚠️  Scraper process not running"
    fi
    
    # Clean up PID file
    rm -f scraper.pid
    echo "🧹 Cleaned up PID file"
else
    echo "⚠️  No scraper.pid file found"
    echo "🔍 Checking for any running scraper processes..."
    
    # Find and kill any running scraper processes
    PIDS=$(pgrep -f "scraper/scrape.ts" || true)
    if [ -n "$PIDS" ]; then
        echo "📋 Found scraper processes: $PIDS"
        echo "$PIDS" | xargs kill
        echo "✅ Killed scraper processes"
    else
        echo "ℹ️  No running scraper processes found"
    fi
fi

# Also kill any Chrome processes that might be left behind
echo "🧹 Cleaning up Chrome processes..."
pkill -f "chrome.*dubizzle" 2>/dev/null || true

echo "�� Cleanup complete!" 