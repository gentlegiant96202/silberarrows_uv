# SilberArrows IOPaint Service

This repository contains the deployment configuration for IOPaint (formerly lama-cleaner) on Railway, specifically designed for SilberArrows' car inventory social media image processing.

## 🎯 Purpose

This service provides **content-aware background extension** for car inventory images, converting them from various aspect ratios to Instagram's preferred 4:5 ratio while intelligently extending the background (showroom, garage, etc.) instead of just adding padding.

## 🚀 Quick Deploy to Railway

### Method 1: One-Click Deploy

1. **Push this repository to GitHub**
2. **Connect to Railway**:
   - Go to [Railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select this repository
3. **Railway will automatically**:
   - Detect the Dockerfile
   - Build and deploy IOPaint
   - Assign a public URL (e.g., `https://silberarrows-iopaint-production.up.railway.app`)

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

## 🔄 Integration with SilberArrows CRM

Once deployed, update your `create-social-media-task` API route in the main SilberArrows project:

```javascript
// Add this environment variable to your main project
const IOPAINT_URL = process.env.IOPAINT_URL || 'https://your-iopaint-service.railway.app';

// Replace the OpenAI section with IOPaint
async function processImageWithIOPaint(imageBuffer, targetWidth, targetHeight) {
  try {
    // Get original image dimensions
    const { width: originalWidth, height: originalHeight } = await sharp(imageBuffer).metadata();
    
    // Calculate padding needed
    const originalRatio = originalWidth / originalHeight;
    const targetRatio = targetWidth / targetHeight;
    
    if (Math.abs(originalRatio - targetRatio) < 0.1) {
      // Already close to target ratio, just resize
      return await sharp(imageBuffer)
        .resize(targetWidth, targetHeight)
        .jpeg({ quality: 90 })
        .toBuffer();
    }
    
    // Create a mask showing areas that need filling
    const resizedHeight = Math.floor(targetWidth / originalRatio);
    const paddingTop = Math.floor((targetHeight - resizedHeight) / 2);
    const paddingBottom = targetHeight - resizedHeight - paddingTop;
    
    // Resize the car image to fit width
    const resizedImage = await sharp(imageBuffer)
      .resize(targetWidth, resizedHeight)
      .toBuffer();
    
    // Create mask (white areas will be filled by IOPaint)
    const mask = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 255, g: 255, b: 255 } // White = areas to fill
      }
    })
    .composite([{
      input: await sharp({
        create: {
          width: targetWidth,
          height: resizedHeight,
          channels: 3,
          background: { r: 0, g: 0, b: 0 } // Black = keep original
        }
      }).toBuffer(),
      top: paddingTop,
      left: 0
    }])
    .png()
    .toBuffer();
    
    // Create canvas with car positioned
    const canvas = await sharp({
      create: {
        width: targetWidth,
        height: targetHeight,
        channels: 3,
        background: { r: 128, g: 128, b: 128 } // Gray background
      }
    })
    .composite([{
      input: resizedImage,
      top: paddingTop,
      left: 0
    }])
    .jpeg()
    .toBuffer();
    
    // Call IOPaint service
    const formData = new FormData();
    formData.append('image', new Blob([canvas]), 'car.jpg');
    formData.append('mask', new Blob([mask]), 'mask.png');
    
    const response = await fetch(`${IOPAINT_URL}/inpaint`, {
      method: 'POST',
      body: formData,
      timeout: 60000 // 60 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`IOPaint service error: ${response.status}`);
    }
    
    return Buffer.from(await response.arrayBuffer());
    
  } catch (error) {
    console.error('IOPaint processing failed:', error);
    // Fallback to simple resize with padding
    return await sharp(imageBuffer)
      .resize(targetWidth, targetHeight, {
        fit: 'contain',
        background: { r: 240, g: 240, b: 240 }
      })
      .jpeg({ quality: 90 })
      .toBuffer();
  }
}
```

## 📋 How It Works

1. **LaMa Model**: Uses state-of-the-art inpainting to fill masked areas
2. **Content-Aware**: Intelligently extends backgrounds based on surrounding context
3. **Car Preservation**: The original car image remains untouched
4. **Fallback**: If service fails, falls back to simple padding

## ⚡ Performance Expectations

- **Speed**: 15-45 seconds per image (CPU processing)
- **Quality**: Professional content-aware background extension
- **Reliability**: Robust error handling with fallbacks
- **Cost**: Railway hosting (~$5-20/month based on usage)

## 🛠 Environment Variables

Set these in your main SilberArrows project:

```
IOPAINT_URL=https://your-iopaint-service.railway.app
```

## 🔍 Monitoring & Debugging

Railway provides built-in monitoring. Check the logs for:

- Image processing times
- Memory usage
- Error rates
- Request volumes

## 💡 Tips for Best Results

1. **Image Quality**: Higher quality input = better results
2. **Background Consistency**: Works best with consistent lighting
3. **Size Limits**: Recommended max 2048x2048 input images
4. **Timeout Handling**: Always implement proper timeouts
5. **Caching**: Consider caching processed images

## 🔧 Troubleshooting

- **Slow Processing**: Normal on CPU, consider image size reduction
- **Memory Errors**: Railway auto-restarts, implement retry logic
- **Network Timeouts**: Increase timeout values in your requests
- **Service Down**: Fallback to simple padding ensures functionality

---

This service enhances SilberArrows' social media workflow by providing professional-quality background extension for car inventory images, making them Instagram-ready with intelligent content-aware processing. 