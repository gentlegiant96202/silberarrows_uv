# 🚨 URGENT: Railway Deploying Wrong Service

## The Problem

Railway is deploying **IOPaint (Python)** instead of **Renderer (Node.js)**!

**Evidence:**
```
FROM python:3.9-slim
RUN pip install --no-cache-dir iopaint
```

This is the **wrong Dockerfile**. Should be:
```
FROM mcr.microsoft.com/playwright:v1.55.1-jammy
```

## Root Cause

Railway's **Root Directory** is NOT set to `renderer`, so it's using the root-level Dockerfile (IOPaint) instead of the `renderer/Dockerfile`.

## 🔧 IMMEDIATE FIX (3 Steps)

### Step 1: Go to Railway Dashboard

1. Open https://railway.app/dashboard
2. Find your **Renderer/Story Render service**
3. Click on the service

### Step 2: Set Root Directory

1. Click **"Settings"** (left sidebar)
2. Scroll to **"Build"** or **"Service Settings"** section
3. Find field: **"Root Directory"**
4. **Enter:** `renderer`
5. Click **"Update"** or **"Save"**

### Step 3: Redeploy

**Option A: Automatic**
- Wait 30 seconds, Railway should auto-redeploy

**Option B: Manual**
1. Click **"Deployments"** tab
2. Click **"⋯"** (three dots) on latest deployment
3. Click **"Redeploy"**

---

## ✅ Verification

After redeployment completes (3-5 minutes), check build logs:

**Should see:**
```
FROM mcr.microsoft.com/playwright:v1.55.1-jammy
✅ Installing Node.js dependencies
✅ Installing Playwright
✅ Copying template files
```

**Should NOT see:**
```
FROM python:3.9-slim
✅ Installing iopaint
```

### Test Health Endpoint

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

---

## 📱 Screenshot Guide

### Finding Root Directory Setting:

1. Railway Dashboard → Your Service → **Settings**
2. Look for section titled **"Service"** or **"Build"**
3. Field labeled **"Root Directory"** or **"Source Root"**
4. Should look like this:

```
┌─────────────────────────────┐
│ Root Directory              │
│ ┌─────────────────────────┐ │
│ │ renderer                │ │ ← Type this
│ └─────────────────────────┘ │
│                             │
│ The directory where your    │
│ service code lives          │
└─────────────────────────────┘
```

---

## ⚠️ Important Notes

1. **Don't delete or modify the root Dockerfile** - it's for the IOPaint service
2. **This is a Railway dashboard setting issue**, not a code issue
3. **The git push I just did won't fix this** - you MUST set Root Directory manually
4. **After setting Root Directory**, future deployments will work automatically

---

## 🎯 Why This Happened

Your repository has **three services**:
1. **IOPaint** (root Dockerfile)
2. **Renderer** (renderer/Dockerfile)  
3. **Video** (video-story-render/Dockerfile)

Railway defaulted to the root Dockerfile because Root Directory wasn't specified.

---

## 📞 Quick Reference

| Service | Root Directory | Dockerfile | Technology |
|---------|---------------|------------|------------|
| IOPaint | `.` or empty | Dockerfile | Python |
| Renderer | `renderer` | renderer/Dockerfile | Node.js |
| Video | `video-story-render` | video-story-render/Dockerfile | Node.js |

---

## 🔄 After Fix

Once Root Directory is set:
- ✅ Railway will use correct Dockerfile
- ✅ Future pushes will auto-deploy correctly
- ✅ Price drop images will generate properly
- ✅ Health endpoint will work

---

**Status:** ⏳ Waiting for you to set Root Directory in Railway dashboard

**ETA after fix:** 3-5 minutes for successful deployment




