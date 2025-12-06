# 🔍 Railway Deep Dive Analysis - Multiple Services Issue

## 📊 CURRENT SITUATION

Your repository contains **THREE different Railway services** but you mentioned Railway is not deploying correctly. Here's what I found:

### Services Identified in Your Codebase:

| # | Service Name | Directory | Dockerfile | Purpose | Expected URL |
|---|--------------|-----------|------------|---------|--------------|
| 1 | **IOPaint** | `/` (root) | `Dockerfile` | Python image inpainting | `silberarrows-iopaint-*.railway.app` |
| 2 | **Renderer** | `/renderer/` | `renderer/Dockerfile` | Node.js/Playwright templates | `story-render-production.up.railway.app` |
| 3 | **Video Service** | `/video-story-render/` | `video-story-render/Dockerfile` | Node.js/Remotion videos | `videostoryrendering-production.up.railway.app` |

### URLs Referenced in Your Code:

```javascript
// Renderer Service (MOST USED)
'https://story-render-production.up.railway.app'

// Video Service  
'https://videostoryrendering-production.up.railway.app'

// IOPaint Service (mentioned but not actively used)
'https://your-iopaint-service.railway.app'
```

---

## 🚨 THE PROBLEM

Based on your build logs showing:
```
FROM python:3.9-slim
RUN pip install --no-cache-dir iopaint
```

**Railway is deploying IOPaint (Service #1) instead of Renderer (Service #2)**

---

## 🎯 ROOT CAUSE ANALYSIS

### Why Railway is Deploying the Wrong Service:

1. **Missing Root Directory Setting**: Railway doesn't know which service to deploy
2. **Multiple Dockerfiles in Repo**: Railway defaults to root-level Dockerfile (IOPaint)
3. **No Service Separation**: You likely have only ONE Railway service configured, not three separate ones

### How Railway Chooses Which Service to Deploy:

```
Step 1: Railway looks for root-level railway.json or railway.toml
Step 2: If Root Directory is set → uses that Dockerfile
Step 3: If NOT set → uses root-level Dockerfile (IOPaint in your case)
```

**Current Flow:**
```
Your Repo → Railway Service → No Root Directory Set → Uses / Dockerfile → Deploys IOPaint ❌
```

**Correct Flow Should Be:**
```
Your Repo → Railway Service → Root Directory = "renderer" → Uses renderer/Dockerfile → Deploys Renderer ✅
```

---

## 🔧 SOLUTION: Configure Railway Services Properly

### Option A: Single Railway Project with Multiple Services (RECOMMENDED)

**Create 3 separate services in ONE Railway project:**

#### Service 1: Renderer (Priority: HIGH)

```
Railway Dashboard Steps:
1. Go to your Railway project
2. Click "+ New" → "Empty Service"
3. Name: "renderer-production"
4. Click "Settings"
5. Connect GitHub repo
6. Set Root Directory: renderer
7. Deploy
```

**Expected Build Output:**
```bash
✅ FROM mcr.microsoft.com/playwright:v1.55.1-jammy
✅ npm install --omit=dev
✅ Copying template files
✅ Template verification passed
✅ Server started on port 3000
```

**Health Check:**
```bash
curl https://story-render-production.up.railway.app/health
# Expected: {"status":"ok","port":3000,"templatesLoaded":7}
```

**Endpoints:**
- `GET /health` - Health check
- `POST /render` - Generate price drop images
- `POST /render-consignment-agreement` - Consignment PDFs
- `POST /render-damage-report` - Damage reports
- `POST /render-myth-buster` - Myth buster images

---

#### Service 2: Video Renderer (Priority: MEDIUM)

```
Railway Dashboard Steps:
1. In same Railway project
2. Click "+ New" → "Empty Service"
3. Name: "video-renderer-production"
4. Click "Settings"
5. Connect same GitHub repo
6. Set Root Directory: video-story-render
7. Deploy
```

**Expected Build Output:**
```bash
✅ FROM node:18-bullseye-slim
✅ Installing FFmpeg and Chromium
✅ npm ci --omit=dev
✅ Server ready on port 3001
```

**Health Check:**
```bash
curl https://videostoryrendering-production.up.railway.app/health
# Expected: OK
```

**Endpoints:**
- `GET /health` - Health check
- `POST /render-video` - Generate video from template

---

#### Service 3: IOPaint (Priority: LOW - Optional)

```
Railway Dashboard Steps:
1. In same Railway project
2. Click "+ New" → "Empty Service"
3. Name: "iopaint-production"
4. Click "Settings"
5. Connect same GitHub repo
6. Set Root Directory: . (or leave empty for root)
7. Deploy
```

**Expected Build Output:**
```bash
✅ FROM python:3.9-slim
✅ pip install iopaint
✅ Downloading LaMa model
✅ IOPaint server started on port 8080
```

**Note:** IOPaint service is referenced in docs but doesn't appear to be actively used in your codebase.

---

### Option B: Multiple Railway Projects (NOT RECOMMENDED)

Create 3 separate Railway projects - one for each service. This is more expensive and harder to manage.

---

## 🔍 DEBUGGING YOUR CURRENT SETUP

### Step 1: Identify Which Service You Have

Go to Railway Dashboard and check:

```
Project Name: ______________
Service Name: ______________
Root Directory: ______________  ← KEY SETTING
GitHub Repo: silberarrows_uv
Branch: main
```

### Step 2: Check Build Logs

Look at the **first line** of your build logs:

**If you see:**
```
FROM python:3.9-slim
```
→ You're deploying IOPaint (WRONG for renderer)

**If you see:**
```
FROM mcr.microsoft.com/playwright:v1.55.1-jammy
```
→ You're deploying Renderer (CORRECT)

**If you see:**
```
FROM node:18-bullseye-slim
```
→ You're deploying Video Service

### Step 3: Verify Service URL

Check which URL your service is using:

```bash
# Try each URL and see which responds:

# Renderer
curl https://story-render-production.up.railway.app/health

# Video  
curl https://videostoryrendering-production.up.railway.app/health

# IOPaint
curl https://[your-iopaint-url].railway.app/
```

---

## ⚡ IMMEDIATE FIX STEPS

### FOR RENDERER SERVICE (Your Current Need):

1. **Go to Railway Dashboard**
   - https://railway.app/dashboard

2. **Find Your Service**
   - Look for service that's deploying (probably showing IOPaint build logs)

3. **Click "Settings"**

4. **Scroll to "Source" or "Build" Section**

5. **Set Root Directory**
   ```
   Root Directory: renderer
   ```

6. **Save Settings**

7. **Trigger Redeploy**
   - Go to "Deployments" tab
   - Click "⋯" on latest deployment
   - Click "Redeploy"

8. **Watch Build Logs**
   - Should NOW show: `FROM mcr.microsoft.com/playwright`
   - Takes 3-5 minutes

9. **Verify**
   ```bash
   curl https://story-render-production.up.railway.app/health
   ```

---

## 📋 VERIFICATION CHECKLIST

### Renderer Service:
- [ ] Root Directory = `renderer`
- [ ] Build shows Playwright Dockerfile
- [ ] Health endpoint returns `templatesLoaded: 7`
- [ ] `/render` endpoint works
- [ ] Environment variable NEXT_PUBLIC_RENDERER_URL points to this service

### Video Service:
- [ ] Root Directory = `video-story-render`
- [ ] Build shows Node.js + FFmpeg
- [ ] Health endpoint returns OK
- [ ] Environment variable VIDEO_SERVICE_URL points to this service

### IOPaint Service (if needed):
- [ ] Root Directory = `.` or empty
- [ ] Build shows Python + iopaint
- [ ] Web interface loads
- [ ] Environment variable IOPAINT_URL points to this service

---

## 🔐 ENVIRONMENT VARIABLES NEEDED

### In Vercel (Next.js App):

```env
# Renderer Service (REQUIRED)
NEXT_PUBLIC_RENDERER_URL=https://story-render-production.up.railway.app

# Video Service (if using video features)
VIDEO_SERVICE_URL=https://videostoryrendering-production.up.railway.app

# IOPaint Service (if using background extension)
IOPAINT_URL=https://your-iopaint-service.railway.app
```

### In Railway (Each Service):

```env
# Automatically set by Railway:
PORT=3000  # or 3001, 8080 depending on service

# Renderer Service
NODE_ENV=production

# Video Service
NODE_ENV=production
PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# IOPaint Service
IOPAINT_MODEL=lama
IOPAINT_DEVICE=cpu
```

---

## 📊 SERVICE DEPENDENCY MAP

```
Next.js App (Vercel)
    ↓
    ├─→ Renderer Service (Railway)
    │   ├─→ /render (Price drops)
    │   ├─→ /render-consignment-agreement
    │   ├─→ /render-damage-report
    │   └─→ /render-myth-buster
    │
    ├─→ Video Service (Railway)
    │   └─→ /render-video (Content pillars)
    │
    └─→ IOPaint Service (Railway - Optional)
        └─→ /inpaint (Background extension)
```

---

## 🎯 MOST COMMON ISSUES & FIXES

### Issue 1: "Railway deploys IOPaint instead of Renderer"
**Cause:** Root Directory not set  
**Fix:** Set Root Directory to `renderer`

### Issue 2: "Build succeeds but endpoints don't work"
**Cause:** Wrong service deployed  
**Fix:** Check first line of build logs, verify correct Dockerfile

### Issue 3: "Service keeps restarting"
**Cause:** PORT mismatch or start command incorrect  
**Fix:** Check deploy logs, verify start command matches service

### Issue 4: "Multiple services conflict"
**Cause:** All services in one Railway service instead of separate  
**Fix:** Create separate Railway services with different Root Directories

### Issue 5: "Environment variables not working"
**Cause:** Variables set in wrong place  
**Fix:** Renderer/Video services need vars in Railway; App needs vars in Vercel

---

## 📞 NEXT STEPS

1. **Identify Current State:**
   - Which Railway service(s) do you currently have deployed?
   - What do the build logs show?
   - What's the service URL?

2. **Fix Renderer Service (Priority 1):**
   - This is what's failing now
   - Set Root Directory to `renderer`
   - Redeploy and verify

3. **Verify Video Service (Priority 2):**
   - Check if you have this deployed
   - If not, create new service

4. **IOPaint (Priority 3 - Optional):**
   - Only needed if you use background extension
   - Can skip for now

---

## 🚀 EXPECTED TIMELINE

1. **Set Root Directory**: 30 seconds
2. **Trigger Redeploy**: 10 seconds
3. **Railway Build**: 3-5 minutes
4. **Health Check**: 30 seconds
5. **Full Test**: 2 minutes

**Total: ~10 minutes to fix**

---

## 📸 WHAT TO CHECK IN RAILWAY DASHBOARD

Go to Railway and screenshot/note:

1. **Project Name**
2. **How many services do you see?** (Should be 2-3)
3. **For each service:**
   - Service name
   - Root Directory setting
   - Latest build status
   - Service URL
   - Build logs (first 20 lines)

This info will help identify exactly what's misconfigured.

---

**Status:** 📍 Waiting for you to check Railway dashboard and confirm current setup

**Priority Fix:** Set Root Directory = `renderer` for your Renderer service







