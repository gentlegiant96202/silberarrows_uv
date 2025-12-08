# Server Auto-Start Guide

## 🎯 Overview

The server is configured to automatically start whenever the external drive is mounted. This uses macOS launchd to monitor the drive and PM2 to manage the server process.

## ✅ What's Configured

1. **PM2 Process Manager** - Keeps server running with auto-restart on crashes
2. **Launchd Agent** - Monitors external drive mount and starts server automatically
3. **Health Checks** - Verifies server is running and restarts if needed

## 🔄 How It Works

1. **When drive is mounted:**
   - Launchd detects the mount (checks every 30 seconds)
   - Script verifies codebase exists
   - Server starts automatically via PM2

2. **When drive is unmounted:**
   - Script detects unmount
   - Server stops gracefully

3. **If server crashes:**
   - PM2 automatically restarts it
   - Health checks verify it's responding

## 📋 Files Created

- `start-server.sh` - Main script to start/restart server
- `check-and-start-server.sh` - Checks drive mount and manages server
- `ecosystem.config.js` - PM2 configuration
- `com.silberarrows.portal-server.plist` - Launchd agent configuration
- `install-drive-mount-auto-start.sh` - Installation script

## 🚀 Quick Commands

### Check Server Status
```bash
npm run server:status
# OR
npx pm2 status
```

### View Logs
```bash
npm run server:logs
# OR
npx pm2 logs portal-server
```

### Manual Start/Restart
```bash
npm run server:start
# OR
./start-server.sh
```

### Stop Server
```bash
npm run server:stop
# OR
npx pm2 stop portal-server
```

### Check Launchd Agent Status
```bash
launchctl list | grep portal-server
```

### View Mount Detection Logs
```bash
tail -f /tmp/portal-server-mount.log
```

## 🔧 Maintenance

### Reinstall Auto-Start Service
If you need to reinstall the launchd agent:
```bash
cd "/Volumes/SilberArrows/CODEBASE/PORTAL NEW NEW"
./install-drive-mount-auto-start.sh
```

### Uninstall Auto-Start Service
To remove the auto-start functionality:
```bash
launchctl unload ~/Library/LaunchAgents/com.silberarrows.portal-server.plist
rm ~/Library/LaunchAgents/com.silberarrows.portal-server.plist
```

### Update PM2 Configuration
Edit `ecosystem.config.js` and restart:
```bash
npx pm2 restart portal-server --update-env
```

## 📝 Log Locations

- **PM2 Logs:** `./logs/pm2-out.log` and `./logs/pm2-error.log`
- **Mount Detection:** `/tmp/portal-server-mount.log`
- **Launchd:** `/tmp/portal-server-launchd.log`

## ⚠️ Troubleshooting

### Server Not Starting on Mount
1. Check if launchd agent is loaded:
   ```bash
   launchctl list | grep portal-server
   ```

2. Check mount detection logs:
   ```bash
   cat /tmp/portal-server-mount.log
   ```

3. Manually test the check script:
   ```bash
   ./check-and-start-server.sh
   ```

### Server Keeps Restarting
Check PM2 logs for errors:
```bash
npx pm2 logs portal-server --lines 100
```

### Drive Path Changed
If your external drive mounts to a different path:
1. Update paths in `check-and-start-server.sh`
2. Update paths in `ecosystem.config.js`
3. Reinstall the launchd agent:
   ```bash
   ./install-drive-mount-auto-start.sh
   ```

## 🎉 Summary

- ✅ Server auto-starts when drive is mounted
- ✅ Server auto-restarts on crashes
- ✅ Server stops when drive is unmounted
- ✅ Works independently of Cursor/IDE
- ✅ Survives system reboots (if drive is mounted)

The server will now automatically start every time you mount the external drive!



