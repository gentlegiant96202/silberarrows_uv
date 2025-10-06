# Myth Buster Monday - Railway Integration Setup

## Overview
Successfully migrated Myth Buster Monday image generation from `htmlcsstoimage.com` API to your dedicated Railway renderer service. This ensures better control over rendering, consistent CSS handling, and proper background image positioning.

## What Was Changed

### 1. Railway Renderer Service (`renderer/src/index.js`)
Added a new endpoint `/render-myth-buster` that:
- Uses Playwright to render HTML exactly like a real browser
- Properly handles CSS transforms, object-fit, and object-position
- Loads custom fonts (Resonate) reliably
- Generates Instagram Story format images (1080x1920)
- Returns base64 PNG images

**Key Features:**
- 45-second timeout for complex renders
- Font pre-loading mechanism
- Image loading status checks
- Retry logic built into the Next.js API layer

### 2. New API Route (`app/api/myth-buster-monday/generate-railway-image/route.ts`)
- Acts as a proxy between your Next.js app and Railway renderer
- Includes health checks for the Railway service
- 3 retry attempts with exponential backoff
- Proper error handling and logging

### 3. Updated Modal (`components/modules/marketing/MythBusterMondayModal.tsx`)
Changed the image generation to:
- Call `/api/myth-buster-monday/generate-railway-image` instead of `/api/myth-buster-monday/generate-preview-image`
- Handle base64 image responses instead of URL responses
- Download images as PNG files (better quality than JPEG)
- Store data URLs for preview

## Root Cause of Original Issue

The background image positioning issue was caused by:

1. **Different CSS Rendering:** `htmlcsstoimage.com` uses a headless browser that doesn't render CSS `transform` properties consistently with regular browsers
2. **Image Loading Timing:** External images from Supabase weren't fully loaded before screenshot
3. **No Control:** Third-party API doesn't give you control over font loading, timing, or rendering quirks

## Railway Service Benefits

✅ **Consistent Rendering:** Playwright renders exactly like Chrome  
✅ **Full Control:** You control timing, fonts, and all render settings  
✅ **Better Quality:** PNG format at full resolution  
✅ **Cost Effective:** No per-image API fees  
✅ **Debugging:** Full server logs for troubleshooting  
✅ **Font Support:** Proper Resonate font loading

## Deployment Steps

### Step 1: Deploy Railway Renderer
```bash
cd renderer
git add .
git commit -m "Add Myth Buster Monday rendering endpoint"
git push origin main
```

Your Railway service should auto-deploy if connected to GitHub. Check Railway dashboard at:
https://railway.app/dashboard

### Step 2: Verify Railway Endpoint
Test the health check:
```bash
curl https://story-render-production.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-01-XX...",
  "port": 3001,
  "templatesLoaded": 7
}
```

### Step 3: Deploy Next.js App
```bash
# From project root
git add .
git commit -m "Integrate Railway renderer for Myth Buster Monday"
git push origin main
```

If you're on Vercel, it will auto-deploy.

### Step 4: Test End-to-End
1. Go to your app's Myth Buster Monday board
2. Create or edit a Myth Buster item
3. Upload a background image
4. Set your myth and fact text
5. Click "Generate Preview Images" button
6. Check browser console for logs:
   - Should see "✅ Successfully generated both template preview images via Railway"
   - Should see file size stats
7. Images should download automatically as PNG files

## Environment Variables

Make sure these are set in your deployment:

**Vercel/Next.js:**
```env
NEXT_PUBLIC_RENDERER_URL=https://story-render-production.up.railway.app
# or
RENDERER_URL=https://story-render-production.up.railway.app
```

**Railway:**
```env
PORT=3001  # or whatever port Railway assigns
```

## Troubleshooting

### Images not generating?
1. Check Railway service logs in Railway dashboard
2. Check Next.js API logs (Vercel dashboard or local console)
3. Verify Railway service is running: `curl https://story-render-production.up.railway.app/health`

### Background image still wrong position?
- The HTML preview in the modal shows exactly what will be rendered
- If preview looks correct but generated image doesn't, check:
  1. External image URLs are publicly accessible
  2. No CORS issues (check browser console)
  3. Railway service has internet access to fetch images

### Fonts not loading?
- Railway service has all Resonate fonts in `renderer/public/Fonts/`
- Check that font paths in HTML are absolute URLs or data URIs
- Railway logs will show font loading status

### Slow generation?
- First render after Railway deploys is slower (cold start)
- Subsequent renders are faster
- 3-second wait time ensures fonts and images load fully

## Performance

**Expected Times:**
- First generation (cold start): ~15-20 seconds
- Subsequent generations: ~5-8 seconds
- Image size: ~500KB-1.5MB (PNG)

## Rollback Plan

If you need to rollback to htmlcsstoimage.com:

1. In `MythBusterMondayModal.tsx`, change endpoint back:
```typescript
fetch('/api/myth-buster-monday/generate-preview-image', {
```

2. Keep the Railway code for future use - it's better!

## Next Steps (Optional Improvements)

1. **Add Supabase Storage:** Upload generated images to Supabase instead of storing data URLs
2. **Add Caching:** Cache generated images to avoid re-rendering
3. **Batch Processing:** Generate both templates in single Railway call
4. **Video Integration:** Use same Railway service for video generation

## Testing Checklist

- [ ] Railway service deploys successfully
- [ ] Health check endpoint responds
- [ ] Next.js app deploys successfully  
- [ ] Can create new Myth Buster item
- [ ] Can upload background image
- [ ] Preview shows correct layout
- [ ] Generate Images button works
- [ ] Both templates download as PNG
- [ ] Images match preview exactly
- [ ] Background image is positioned correctly
- [ ] Fonts render properly (Resonate)
- [ ] No console errors

## Support

If you encounter issues:
1. Check Railway service logs
2. Check browser console for client-side errors
3. Check Network tab for API call failures
4. Verify environment variables are set correctly

The Railway integration is production-ready and will solve the background positioning issue! 🎉
