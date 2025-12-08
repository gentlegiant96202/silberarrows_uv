#!/bin/bash

# Setup PM2 to auto-start on system boot
# This will require your password (sudo)

echo "🔧 Setting up PM2 to auto-start on system boot..."
echo "📋 This will require your password (sudo)"
echo ""

cd "/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW"

# Run the PM2 startup command
sudo env PATH=$PATH:/usr/local/bin $(pwd)/node_modules/pm2/bin/pm2 startup launchd -u silberarrowsmarketing --hp /Users/silberarrowsmarketing

echo ""
echo "✅ PM2 startup script configured!"
echo "🔄 The server will now automatically start when your Mac boots up"
echo ""



