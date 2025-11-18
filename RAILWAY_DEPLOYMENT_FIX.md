# Railway Deployment Fix

## Issue Identified

Railway service was not deploying because of conflicting configuration files:
- `railway.json` and `railway.toml` were both present
- `railway.toml` had `watchPatterns = ["renderer/**"]` which conflicts with Root Directory setting

## Root Cause

1. **Configuration Conflict**: Both `railway.json` and `railway.toml` existed, causing Railway to not know which to use
2. **Watch Pattern Issue**: The `watchPatterns = ["renderer/**"]` in `railway.toml` was meant for monorepo setups but conflicts when Root Directory is set to `renderer`
3. **Railway expects ONLY ONE config format** - either JSON or TOML, not both

## Solution Applied

### 1. Removed `railway.toml`
- Deleted the conflicting TOML file
- Railway will now use only `railway.json`

### 2. Updated `railway.json`
Added explicit `dockerfilePath` to ensure Railway finds the Dockerfile:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "startCommand": "node src/index.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 3. Railway Service Settings (Manual Steps Required)

**Go to Railway Dashboard** → Your Renderer Service → Settings:

1. **Root Directory**: Set to `renderer`
   - This tells Railway to look in the `renderer/` folder for all files
   
2. **Build Command**: Leave empty (Railway will use Dockerfile)

3. **Start Command**: Should be `node src/index.js` (from railway.json)

4. **Watch Paths**: Leave default (Railway will watch all files in `renderer/`)

## Verification Steps

### 1. Check Railway Logs
After pushing this fix, check Railway logs for:
```
✅ Building Dockerfile...
✅ Successfully installed dependencies
✅ Copying template files...
✅ Template file found
✅ Template contains expected content
✅ Service starting on port XXXX
```

### 2. Test Health Endpoint
```bash
curl https://story-render-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "...",
  "port": 3000,
  "templatesLoaded": 7
}
```

### 3. Test Template Rendering
```bash
curl -X POST https://story-render-production.up.railway.app/render \
  -H "Content-Type: application/json" \
  -d '{
    "carDetails": {
      "year": 2021,
      "model": "Test Car",
      "mileage": "10,000 KM",
      "stockNumber": "TEST123",
      "regionalSpec": "GCC",
      "horsepower": 300
    },
    "pricing": {
      "wasPrice": 100000,
      "nowPrice": 95000,
      "savings": 5000,
      "monthlyPayment": 2500
    },
    "firstImageUrl": "https://via.placeholder.com/800x600",
    "secondImageUrl": "https://via.placeholder.com/800x600"
  }'
```

## Common Railway Issues & Fixes

### Issue: "No Dockerfile found"
**Fix**: Ensure Root Directory is set to `renderer` in Railway service settings

### Issue: "Template file missing or incorrect"
**Fix**: The Dockerfile includes verification step. Check Railway logs to see which file is missing

### Issue: "Service keeps restarting"
**Fix**: 
1. Check Railway logs for errors
2. Verify PORT environment variable is set correctly
3. Check that all dependencies are in `package.json`

### Issue: "Service deploys but /render endpoint fails"
**Fix**:
1. Check that templates are being loaded (check `/health` endpoint)
2. Verify Playwright is installed correctly (check build logs)
3. Ensure sufficient memory (Railway default 512MB should be OK)

## Deployment Process

1. **Push this fix**:
```bash
git add renderer/railway.json RAILWAY_DEPLOYMENT_FIX.md
git commit -m "Fix Railway deployment - remove conflicting railway.toml"
git push origin main
```

2. **Railway should auto-deploy** within 1-2 minutes

3. **Verify deployment**:
   - Check Railway dashboard for successful build
   - Test health endpoint
   - Check logs for any errors

## Why This Happened

The `railway.toml` file was likely added during a troubleshooting session to add `watchPatterns`. However:
- Railway V2 now uses `railway.json` as the standard
- `watchPatterns` in TOML is deprecated and conflicts with Root Directory setting
- Having both JSON and TOML configs creates ambiguity

## Best Practices Going Forward

1. **Use ONLY `railway.json`** for Railway configuration
2. **Set Root Directory in Railway Dashboard**, not in config files
3. **Keep config minimal** - let Railway handle most settings
4. **Test deployments** after config changes
5. **Check Railway docs** for latest config format

## Related Files

- `renderer/railway.json` - Railway configuration (NOW THE ONLY CONFIG)
- `renderer/Dockerfile` - Docker build instructions
- `renderer/.dockerignore` - Files to ignore during Docker build
- `.railwayignore` - Files Railway should ignore (at repo root)

## Support

If Railway still doesn't deploy after this fix:
1. Check Railway Dashboard → Service → Deployments for error logs
2. Verify GitHub integration is working
3. Try manual redeploy from Railway dashboard
4. Check Railway status page: https://status.railway.app/

