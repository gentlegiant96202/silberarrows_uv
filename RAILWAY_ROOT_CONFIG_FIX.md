# 🔧 Railway Root Config Interference - SOLVED

## The Problem

Railway was deploying **IOPaint (Python)** even though **Root Directory was set to `renderer`**.

### Root Cause

A `railway.json` file at the **repository root** was interfering with the Root Directory setting:

```json
// railway.json (at root) ← THE PROBLEM
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"  ← Points to ROOT Dockerfile (IOPaint)
  },
  "deploy": {
    "startCommand": "iopaint start..."  ← IOPaint command
  }
}
```

### Why This Caused Issues

Even with `Root Directory = renderer`, Railway was:

1. Reading the root `railway.json`
2. Seeing `dockerfilePath: "Dockerfile"`
3. Looking for `Dockerfile` at the root (not in `renderer/`)
4. Finding and building the IOPaint Dockerfile instead

### Configuration Conflict

```
Root Directory Setting: "renderer"  ← Says use renderer/
      +
Root railway.json: dockerfilePath: "Dockerfile"  ← Says use root Dockerfile
      ↓
CONFLICT → Railway used root Dockerfile (IOPaint)
```

## The Solution

**Deleted the root `railway.json` file.**

Now Railway will:

```
Root Directory = "renderer"
      ↓
Look in renderer/ folder
      ↓
Find renderer/railway.json
      ↓
Use renderer/Dockerfile
      ↓
Build Renderer service (Playwright/Node.js) ✅
```

## What to Do Next

### 1. Verify Railway Picks Up the Change

After the git push (commit: 1a25761):

- Railway should auto-detect the change
- Build should start within 30 seconds
- Check build logs for: `FROM mcr.microsoft.com/playwright`

### 2. If Railway Doesn't Auto-Deploy

**Manual Redeploy:**

1. Go to Railway Dashboard
2. Click your Renderer service
3. Go to "Deployments" tab
4. Click "⋯" on latest deployment
5. Click "Redeploy"

### 3. Watch Build Logs

**Should NOW see:**

```bash
✅ FROM mcr.microsoft.com/playwright:v1.55.1-jammy
✅ WORKDIR /app
✅ COPY package.json ./
✅ RUN npm install --omit=dev
✅ COPY src ./src
✅ COPY public ./public
✅ RUN test -f public/templates/price-drop-template-45.html
✅ Template file found
✅ Template contains expected content
✅ ENV PORT=3000
✅ CMD ["npm", "start"]
```

**Should NOT see:**

```bash
❌ FROM python:3.9-slim
❌ RUN pip install iopaint
```

### 4. Verify Deployment Success

```bash
# After 3-5 minutes:
curl https://story-render-production.up.railway.app/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2025-11-18T...",
  "port": 3000,
  "templatesLoaded": 7
}
```

## Current Configuration

### Repository Structure

```
/
├── Dockerfile (IOPaint - Python)
├── renderer/
│   ├── Dockerfile (Renderer - Node.js/Playwright)
│   ├── railway.json ✅ (Renderer config)
│   └── src/...
└── video-story-render/
    ├── Dockerfile (Video - Node.js/Remotion)
    ├── railway.json ✅ (Video config)
    └── src/...
```

### Railway Services Setup

| Service | Root Directory | Config File Used | Dockerfile Used |
|---------|---------------|------------------|-----------------|
| **Renderer** | `renderer` | `renderer/railway.json` | `renderer/Dockerfile` |
| **Video** | `video-story-render` | `video-story-render/railway.json` | `video-story-render/Dockerfile` |
| **IOPaint** (if needed) | `.` or empty | None needed | `/Dockerfile` |

### Key Point

**No more root `railway.json`** → Each service uses its own config file in its directory.

## Why This Happened

I accidentally created a root `railway.json` earlier while trying to document the IOPaint service. This was meant to clarify the IOPaint configuration but instead caused Railway to prioritize it over the Root Directory setting.

**Lesson Learned:** When using Root Directory in Railway, **don't have configuration files at the repository root** that specify Dockerfile paths - they can override the Root Directory setting.

## If You Need IOPaint Service Later

If you want to deploy IOPaint as a separate Railway service:

1. **Create a NEW Railway service** (don't modify the Renderer one)
2. **Connect same GitHub repo**
3. **Set Root Directory to `.` or leave EMPTY**
4. **No railway.json needed** (Railway will auto-detect root Dockerfile)
5. **Deploy**

The IOPaint service should be **completely separate** from the Renderer service.

## Timeline

- **Issue Reported:** IOPaint deploying instead of Renderer
- **Root Cause Found:** Root railway.json interfering
- **Fix Applied:** Deleted root railway.json (commit 1a25761)
- **Expected Resolution:** 3-5 minutes after push

## Verification Commands

```bash
# 1. Check build logs in Railway dashboard
# Should show Playwright, NOT Python

# 2. Wait for deployment to complete (3-5 min)

# 3. Test health endpoint
curl https://story-render-production.up.railway.app/health

# 4. Test price drop generation
curl -X POST https://story-render-production.up.railway.app/render \
  -H "Content-Type: application/json" \
  -d '{
    "carDetails": {
      "year": 2021,
      "model": "Test Car",
      "mileage": "10,000 KM",
      "stockNumber": "TEST123",
      "regionalSpec": "GCC"
    },
    "pricing": {
      "wasPrice": 100000,
      "nowPrice": 95000,
      "savings": 5000,
      "monthlyPayment": 2500
    },
    "firstImageUrl": "https://via.placeholder.com/800",
    "secondImageUrl": "https://via.placeholder.com/800"
  }'

# Should return JSON with success: true and base64 images
```

## Success Indicators

✅ Build logs show Playwright Dockerfile  
✅ Health endpoint returns `templatesLoaded: 7`  
✅ `/render` endpoint generates images  
✅ Service stays running (not restarting)  
✅ Price drop modal in Next.js app works  

---

**Status:** ✅ Fix pushed (commit 1a25761)

**Next:** Wait 3-5 minutes and verify deployment



