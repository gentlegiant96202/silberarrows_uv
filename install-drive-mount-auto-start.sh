#!/bin/bash

# Install launchd agent to auto-start server when external drive is mounted

echo "🔧 Installing auto-start service for external drive mount..."
echo ""

CODEBASE_PATH="/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW"
PLIST_FILE="com.silberarrows.portal-server.plist"
LAUNCHD_PATH="$HOME/Library/LaunchAgents/$PLIST_FILE"

# Check if codebase exists
if [ ! -d "$CODEBASE_PATH" ]; then
    echo "❌ Error: Codebase not found at $CODEBASE_PATH"
    echo "   Please make sure the external drive is mounted first."
    exit 1
fi

cd "$CODEBASE_PATH" || {
    echo "❌ Failed to change to codebase directory"
    exit 1
}

# Make scripts executable
chmod +x check-and-start-server.sh
chmod +x start-server.sh

# Create LaunchAgents directory if it doesn't exist
mkdir -p "$HOME/Library/LaunchAgents"

# Copy plist to LaunchAgents directory
echo "📋 Copying launchd agent..."
cp "$PLIST_FILE" "$LAUNCHD_PATH"

# Update the paths in the plist to use absolute paths
echo "🔧 Updating paths in launchd agent..."
# Use a temporary file for sed on macOS
sed "s|/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW|$CODEBASE_PATH|g" "$PLIST_FILE" > "$LAUNCHD_PATH.tmp"
mv "$LAUNCHD_PATH.tmp" "$LAUNCHD_PATH"

# Unload existing agent if it exists
if launchctl list | grep -q "com.silberarrows.portal-server"; then
    echo "🛑 Unloading existing agent..."
    launchctl unload "$LAUNCHD_PATH" 2>/dev/null || true
fi

# Load the agent
echo "🚀 Loading launchd agent..."
launchctl load "$LAUNCHD_PATH"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Auto-start service installed successfully!"
    echo ""
    echo "📋 The server will now automatically start when:"
    echo "   • The external drive is mounted"
    echo "   • Your Mac boots up (if drive is already mounted)"
    echo ""
    echo "📝 Logs are available at:"
    echo "   • Launchd: /tmp/portal-server-launchd.log"
    echo "   • Server: /tmp/portal-server-mount.log"
    echo ""
    echo "🔍 To check status:"
    echo "   launchctl list | grep portal-server"
    echo ""
    echo "🛑 To uninstall:"
    echo "   launchctl unload $LAUNCHD_PATH"
    echo "   rm $LAUNCHD_PATH"
    echo ""
    
    # Try to start server now if drive is mounted
    echo "🔄 Checking if server should start now..."
    ./check-and-start-server.sh
else
    echo "❌ Failed to load launchd agent"
    exit 1
fi



