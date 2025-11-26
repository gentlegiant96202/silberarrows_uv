# Railway Services Setup Guide

## 🚨 CRITICAL: Multiple Services in This Repository

This repository contains **THREE different Railway services**:

1. **Renderer Service** (Price Drop Images) - `/renderer/`
2. **IOPaint Service** (Image Inpainting) - Root directory
3. **Video Story Render Service** - `/video-story-render/`

Each service has its own Dockerfile and configuration!

## ⚠️ Common Deployment Issue

**Problem:** Railway deploys the WRONG Dockerfile (e.g., IOPaint instead of Renderer)

**Cause:** Root Directory not configured in Railway dashboard

**Solution:** Set the correct Root Directory for each service

---

## Service 1: Price Drop Renderer

**Purpose:** Generates price drop images using Playwright

**Technology:** Node.js + Playwright

**Root Directory:** `renderer`

### Railway Dashboard Settings:

```
Service Name: story-render-production (or similar)
Root Directory: renderer
Dockerfile: Dockerfile (in renderer/ folder)
Start Command: node src/index.js
```

### Health Check:
```bash
curl https://story-render-production.up.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "port": 3000,
  "templatesLoaded": 7
}
```

### Configuration Files:
- `renderer/railway.json`
- `renderer/Dockerfile`
- `renderer/.dockerignore`

---

## Service 2: IOPaint (Background Extension)

**Purpose:** Content-aware image background extension

**Technology:** Python + IOPaint

**Root Directory:** `.` (root of repository)

### Railway Dashboard Settings:

```
Service Name: silberarrows-iopaint (or similar)
Root Directory: . (or leave empty for root)
Dockerfile: Dockerfile (in root folder)
Start Command: iopaint start --model=lama --device=cpu --port=${PORT} --host=0.0.0.0
```

### Health Check:
```bash
curl https://your-iopaint-service.railway.app/
```

**Expected:** IOPaint web interface

### Configuration Files:
- `railway.json` (root level)
- `Dockerfile` (root level)

---

## Service 3: Video Story Render

**Purpose:** Video rendering for social media stories

**Technology:** Node.js + Remotion

**Root Directory:** `video-story-render`

### Railway Dashboard Settings:

```
Service Name: video-story-render (or similar)
Root Directory: video-story-render
Dockerfile: Dockerfile (in video-story-render/ folder)
```

### Configuration Files:
- `video-story-render/railway.json`
- `video-story-render/Dockerfile`

---

## 🔧 How to Set Up Each Service

### Method 1: Create from Railway Dashboard

1. Go to Railway Dashboard
2. Click "New Project" → "Deploy from GitHub repo"
3. Select this repository
4. Railway creates ONE service by default
5. **Click "Settings" → "Service"**
6. **Set "Root Directory"** to the appropriate folder:
   - For Renderer: `renderer`
   - For IOPaint: leave empty or `.`
   - For Video: `video-story-render`
7. Save and redeploy

### Method 2: Add Additional Services

If you already have one service and need to add more:

1. In your Railway project dashboard
2. Click "+ New" button
3. Select "GitHub Repo"
4. Choose the same repository
5. Railway will ask to create a new service
6. Configure the Root Directory for this new service
7. Each service deploys independently

---

## 🎯 How to Know Which Service is Which

### Check the Dockerfile:

**Renderer Service:**
```dockerfile
FROM mcr.microsoft.com/playwright:v1.55.1-jammy
# Node.js + Playwright
```

**IOPaint Service:**
```dockerfile
FROM python:3.9-slim
RUN pip install iopaint
```

**Video Service:**
```dockerfile
FROM node:18
# Video rendering with Remotion
```

### Check Railway Build Logs:

**Renderer:**
```
✅ Installing Node.js dependencies
✅ Installing Playwright browsers
✅ Copying template files
```

**IOPaint:**
```
✅ Installing Python dependencies
✅ Installing iopaint
✅ Downloading LaMa model
```

---

## 🚨 Troubleshooting Wrong Service Deployed

### Symptom: Railway builds IOPaint when you want Renderer

**Fix:**
1. Go to Service → Settings
2. Check "Root Directory" field
3. Should be set to `renderer`
4. If empty or wrong, set to `renderer`
5. Save and trigger manual redeploy

### Symptom: Railway builds Renderer when you want IOPaint

**Fix:**
1. Go to Service → Settings
2. Check "Root Directory" field  
3. Should be empty or set to `.`
4. If set to `renderer`, clear it
5. Save and trigger manual redeploy

### Symptom: Build succeeds but service doesn't work

**Possible Causes:**
1. Wrong service deployed (check Dockerfile in logs)
2. Environment variables missing
3. Port configuration incorrect
4. Start command incorrect

**Debug Steps:**
1. Check Railway deploy logs for the Dockerfile being used
2. Verify which `FROM` image is in the build output
3. Check that the start command matches the service type
4. Test the appropriate health endpoint

---

## 📋 Environment Variables per Service

### Renderer Service:
```env
PORT=3000 (auto-set by Railway)
NODE_ENV=production
```

### IOPaint Service:
```env
PORT=8080 (auto-set by Railway)
IOPAINT_MODEL=lama
IOPAINT_DEVICE=cpu
```

### Video Service:
```env
PORT=3001 (auto-set by Railway)
```

---

## ✅ Verification Checklist

### For Renderer Service:
- [ ] Root Directory set to `renderer`
- [ ] Build logs show "Installing Node.js dependencies"
- [ ] Health endpoint returns `templatesLoaded: 7`
- [ ] Service starts on port shown in logs
- [ ] `/render` endpoint works

### For IOPaint Service:
- [ ] Root Directory is empty or `.`
- [ ] Build logs show "Installing iopaint"
- [ ] Web interface loads at service URL
- [ ] Model downloads successfully
- [ ] `/inpaint` endpoint works

### For Video Service:
- [ ] Root Directory set to `video-story-render`
- [ ] Build logs show video rendering setup
- [ ] Health endpoint returns OK
- [ ] Video generation works

---

## 🎓 Best Practices

1. **Name services clearly** in Railway dashboard (e.g., "renderer-prod", "iopaint-prod")
2. **Set Root Directory FIRST** before other configuration
3. **Check build logs** to verify correct Dockerfile is used
4. **Test health endpoints** after each deployment
5. **Keep railway.json in sync** with Railway dashboard settings
6. **Document service URLs** for your team

---

## 📞 Still Having Issues?

1. **Check which Dockerfile is being built:**
   - Look at the first line of Railway build logs
   - Should match the service you want

2. **Verify Root Directory:**
   - Settings → Build → Root Directory
   - Must match the folder with the correct Dockerfile

3. **Try manual redeploy:**
   - Deployments → "⋯" → "Redeploy"

4. **Check Railway project structure:**
   - You might have accidentally created multiple projects instead of multiple services in one project
   - All three services should be in the SAME Railway project

---

**Last Updated:** 2025-11-18 (after fixing renderer service misdeployment)



