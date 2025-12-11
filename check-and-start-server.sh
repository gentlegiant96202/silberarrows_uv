#!/bin/bash

# Script to check if external drive is mounted and start/stop the server
# This runs automatically every 30 seconds via launchd

DRIVE_PATH="/Volumes/SilberArrows"
CODEBASE_PATH="/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW"
LOG_FILE="/tmp/portal-server-mount.log"

# Log function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Check if the drive is mounted
if [ ! -d "$DRIVE_PATH" ]; then
    # Drive not mounted - stop server if running
    if command -v pm2 >/dev/null 2>&1; then
        PM2_CMD="pm2"
    else
        # Try to find PM2 in common locations
        if [ -f "$HOME/.pm2/pm2.log" ]; then
            PM2_CMD="npx pm2"
        else
            exit 0
        fi
    fi
    
    # Check if server is running and stop it
    if $PM2_CMD list 2>/dev/null | grep -q "portal-server.*online"; then
        log "Drive unmounted - stopping server"
        $PM2_CMD stop portal-server 2>/dev/null || true
        $PM2_CMD delete portal-server 2>/dev/null || true
    fi
    exit 0
fi

# Wait a moment for the drive to be fully mounted
sleep 1

# Check if codebase directory exists
if [ ! -d "$CODEBASE_PATH" ]; then
    log "Codebase directory not found at $CODEBASE_PATH"
    exit 0
fi

# Change to codebase directory
cd "$CODEBASE_PATH" || {
    log "Failed to change directory to $CODEBASE_PATH"
    exit 1
}

# Determine PM2 command
if command -v pm2 >/dev/null 2>&1; then
    PM2_CMD="pm2"
else
    PM2_CMD="npx pm2"
fi

# Check if server is already running
if $PM2_CMD list 2>/dev/null | grep -q "portal-server.*online"; then
    # Server is running - verify it's still healthy
    if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000 >/dev/null 2>&1; then
        # Server is healthy, nothing to do
        exit 0
    else
        log "Server process exists but not responding - restarting"
        $PM2_CMD restart portal-server 2>/dev/null || {
            $PM2_CMD delete portal-server 2>/dev/null || true
            ./start-server.sh >> "$LOG_FILE" 2>&1
        }
        exit 0
    fi
fi

# Server is not running - start it
log "Drive mounted - starting server at $CODEBASE_PATH"

# Start the server
./start-server.sh >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    log "Server started successfully"
else
    log "Failed to start server"
    exit 1
fi







