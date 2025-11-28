# Railway Deployment Checklist

## ✅ Completed (Automatically)
- [x] Removed conflicting `railway.toml` file
- [x] Updated `railway.json` with proper configuration  
- [x] Pushed changes to GitHub (commit: 4456450)
- [x] Railway should auto-detect push and start deployment

## 🔧 Manual Steps Required (Railway Dashboard)

### 1. Verify Root Directory Setting
Go to: **Railway Dashboard** → **Your Renderer Service** → **Settings** → **Source**

**Expected Setting:**
```
Root Directory: renderer
```

**If not set correctly:**
1. Click on "Root Directory" field
2. Type: `renderer`
3. Save changes
4. Trigger manual redeploy if needed

### 2. Check Current Deployment Status

Go to: **Railway Dashboard** → **Your Renderer Service** → **Deployments**

**Look for:**
- ✅ Green checkmark = Successful deployment
- 🟡 Yellow spinner = Building/Deploying  
- ❌ Red X = Failed deployment (check logs)

**If deployment failed:**
1. Click on the failed deployment
2. Check "Build Logs" tab
3. Check "Deploy Logs" tab
4. Look for error messages

### 3. Verify Service is Running

**Test Health Endpoint:**
```bash
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

**If health check fails:**
- Service might still be deploying (wait 1-2 minutes)
- Check Railway logs for startup errors
- Verify PORT environment variable is set

### 4. Test Template Rendering

```bash
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
```

**Expected:** JSON response with `success: true` and base64 image data

## 🚨 Troubleshooting

### Deployment Stuck on "Building"
- **Cause**: Railway might be waiting for the previous build to finish
- **Fix**: Cancel the stuck deployment and retry

### "No Dockerfile found" Error
- **Cause**: Root Directory not set to `renderer`
- **Fix**: Set Root Directory to `renderer` in Railway settings

### Build succeeds but service won't start
- **Cause**: Possible dependency or runtime error
- **Fix**: 
  1. Check Deploy Logs for Node.js errors
  2. Verify `package.json` dependencies
  3. Check Playwright installation succeeded

### Template verification fails
- **Cause**: Template files not being copied properly
- **Fix**: 
  1. Check Dockerfile COPY commands
  2. Verify `.dockerignore` isn't excluding template files
  3. Manual redeploy to clear cache

## 📊 Expected Timeline

- **Git Push**: Immediate
- **Railway Detection**: 5-30 seconds
- **Build Start**: Within 1 minute
- **Docker Build**: 2-5 minutes
- **Deployment**: 30 seconds
- **Total**: ~3-6 minutes from push to live

## 🎯 Success Indicators

1. ✅ Railway dashboard shows green checkmark
2. ✅ Health endpoint returns 200 OK
3. ✅ `/render` endpoint generates images
4. ✅ Templates loaded count = 7 (in health response)
5. ✅ Service logs show "Server started on port XXXX"

## 📞 If Still Not Working

1. **Check Railway Status**: https://status.railway.app/
2. **Try Manual Redeploy**: Railway Dashboard → Deployments → "⋯" → "Redeploy"
3. **Check GitHub Integration**: Settings → Integrations → Verify Railway is connected
4. **Review RAILWAY_DEPLOYMENT_FIX.md** for detailed troubleshooting
5. **Check Railway Logs**: Look for specific error messages

## 🔄 Next Steps After Successful Deployment

1. Test price drop modal in your Next.js app
2. Verify images are generating correctly
3. Check image quality and layout
4. Monitor Railway resource usage
5. Set up Railway alerts for downtime (optional)

---

**Current Status:** ⏳ Waiting for Railway to deploy...

**Check Status:** Go to Railway Dashboard now!




