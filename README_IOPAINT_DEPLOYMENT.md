# IOPaint (LaMa) Railway Deployment Guide

This guide will help you deploy IOPaint (formerly lama-cleaner) on Railway for content-aware image processing.

## 🚀 Quick Deploy to Railway

### Method 1: One-Click Deploy

1. **Fork this repository** (or create a new one with these files)
2. **Connect to Railway**:
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your forked repository
3. **Railway will automatically**:
   - Detect the Dockerfile
   - Build and deploy IOPaint
   - Assign a public URL

### Method 2: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Deploy from this directory
railway up
```

## 🔧 Configuration

Railway will automatically set the `$PORT` environment variable. The deployment is configured to:

- **Model**: LaMa (best for content-aware inpainting)
- **Device**: CPU (Railway doesn't provide GPU access)
- **Host**: 0.0.0.0 (accepts external connections)
- **Port**: Uses Railway's assigned port

## 🎯 Usage

Once deployed, you'll get a Railway URL like: `https://your-app.railway.app`

### API Endpoints

IOPaint provides several endpoints:

1. **Web Interface**: `https://your-app.railway.app/`
2. **API for inpainting**: `POST https://your-app.railway.app/inpaint`

### For Your Next.js App

Update your API route to call the Railway-deployed IOPaint:

```javascript
// In your create-social-media-task route
const IOPAINT_URL = 'https://your-iopaint-app.railway.app';

// Instead of OpenAI, use IOPaint
const formData = new FormData();
formData.append('image', imageBuffer, 'car.jpg');
formData.append('mask', maskBuffer, 'mask.png');

const response = await fetch(`${IOPAINT_URL}/inpaint`, {
  method: 'POST',
  body: formData
});

const processedImageBuffer = await response.arrayBuffer();
```

## 📋 How It Works

1. **Content-Aware Filling**: IOPaint uses the LaMa model to intelligently extend backgrounds
2. **CPU Processing**: Runs on Railway's CPU infrastructure (slower but functional)
3. **Stateless**: Each request is processed independently
4. **Auto-scaling**: Railway handles scaling based on demand

## 🔄 Integration with Your Car Social Media Feature

Replace the current OpenAI approach in your `create-social-media-task` API route:

```javascript
// Old approach (OpenAI - not working well)
const editResponse = await openai.images.edit({...});

// New approach (IOPaint on Railway)
const iopaintResponse = await fetch(`${IOPAINT_URL}/inpaint`, {
  method: 'POST',
  body: formData
});
```

## ⚡ Performance Expectations

- **Speed**: 10-30 seconds per image (CPU processing)
- **Quality**: Excellent content-aware background extension
- **Reliability**: More reliable than OpenAI image editing
- **Cost**: Railway hosting costs (~$5-20/month depending on usage)

## 🛠 Advanced Configuration

You can customize the deployment by modifying environment variables in Railway:

- `IOPAINT_MODEL`: lama, ldm, zits, mat, fcf (default: lama)
- `IOPAINT_DEVICE`: cpu (Railway only supports CPU)

## 🔍 Troubleshooting

- **Slow processing**: Normal on CPU, consider reducing image size
- **Memory issues**: Railway has memory limits, restart service if needed
- **Build failures**: Check Dockerfile syntax and dependencies

## 💡 Tips

1. **Image Size**: Resize images to 1024x1024 or smaller for faster processing
2. **Caching**: Consider implementing image caching in your main app
3. **Error Handling**: Add proper fallbacks in case IOPaint service is down
4. **Monitoring**: Use Railway's built-in monitoring to track usage

---

This setup gives you true content-aware background extension without relying on OpenAI's limited image editing capabilities! 