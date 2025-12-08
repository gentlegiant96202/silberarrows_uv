#!/bin/bash

# SilberArrows Portal - Auto-Restart Server Script
# This script uses PM2 to keep the server running and auto-restart on crashes/connection drops

cd "/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW"

echo "🛑 Stopping any existing server processes..."
# Kill any existing processes on port 3000
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true

# Stop PM2 process if running
npx pm2 stop portal-server 2>/dev/null || true
npx pm2 delete portal-server 2>/dev/null || true

echo "✅ Cleanup complete"
echo ""

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🚀 Starting server with PM2 (auto-restart enabled)..."
echo "📍 Server will be available at: http://127.0.0.1:3000"
echo "🔄 Auto-restart: Enabled (will restart on crashes and connection drops)"
echo ""

# Start the server with PM2
npx pm2 start ecosystem.config.js

# Save PM2 configuration so it persists across reboots
npx pm2 save

# Setup PM2 to start on system boot (optional)
echo ""
echo "📋 To enable PM2 to start on system boot, run:"
echo "   npx pm2 startup"
echo ""

# Show status
echo "📊 Server Status:"
npx pm2 status

echo ""
echo "✅ Server is running!"
echo ""
echo "📝 Useful commands:"
echo "   View logs:        npx pm2 logs portal-server"
echo "   Stop server:      npx pm2 stop portal-server"
echo "   Restart server:   npx pm2 restart portal-server"
echo "   Monitor:          npx pm2 monit"
echo "   Status:           npx pm2 status"
echo ""



