import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition, openBrowser } from '@remotion/renderer';
import fsPromises from 'fs/promises';
import os from 'os';
import { spawn } from 'child_process';
import puppeteer from 'puppeteer-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Serve static files
app.use(express.static(path.resolve(__dirname, '../public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'video-story-render',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 3001
  });
});

// Video rendering endpoint
app.post('/render-video', async (req, res) => {
  try {
    console.log('🎬 Video render request received');
    console.log('📊 Request body keys:', Object.keys(req.body || {}));
    
    const { dayOfWeek, templateType, formData, html } = req.body || {};

    console.log('🎨 Bundling Remotion composition...');
    const bundleLocation = await bundle(path.resolve(__dirname, 'Video.tsx'));
    console.log('✅ Bundle created at:', bundleLocation);

    // Launch Chromium explicitly with the new Headless mode
    const browser = await openBrowser({
      browserExecutable: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      chromiumOptions: {
        headless: 'new',
        // Hardening flags recommended for containers
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    });

    let compositionId = 'ContentPillar';
    let inputProps = {};
    let outputName = `content-pillar-${dayOfWeek}-${templateType}`;

    if (html) {
      // For Monday templates, use the proper Remotion component for smooth animations
      if (dayOfWeek === 'monday') {
        compositionId = 'ContentPillar';
        // Extract form data from the request if available
        const f = req.body.formData || {};
        inputProps = { 
          dayOfWeek: 'monday', 
          templateType: templateType || 'A',
          // Core text
          title: f.title || 'Sample Title',
          subtitle: f.subtitle || '',
          description: f.description || '',
          // Myth/Fact blocks
          myth: f.myth || '',
          fact: f.fact || '',
          // Tech and warnings
          difficulty: f.difficulty || '',
          tools_needed: f.tools_needed || '',
          warning: f.warning || '',
          // Visuals and branding
          badgeText: f.badgeText || 'MYTH BUSTER MONDAY',
          car_model: f.car_model || '',
          imageUrl: f.imageUrl || '',
          logoUrl: 'https://database.silberarrows.com/storage/v1/object/public/media-files/8bc3b696-bcb6-469e-9993-030fdc903ee5/9740bc7d-d555-4c9b-b0e0-d756e0b4c50d.png',
          // Image controls
          titleFontSize: typeof f.titleFontSize === 'number' ? f.titleFontSize : 72,
          imageFit: f.imageFit || 'cover',
          imageAlignment: f.imageAlignment || 'center',
          imageZoom: typeof f.imageZoom === 'number' ? f.imageZoom : 100,
          imageVerticalPosition: typeof f.imageVerticalPosition === 'number' ? f.imageVerticalPosition : 0,
        };
        outputName = `monday-${templateType || 'A'}`;
      } else {
        // For other days, use HTML rendering
        compositionId = 'HTMLVideo';
        inputProps = { html };
        outputName = `html-video`;
      }
    } else {
      if (!dayOfWeek || !templateType || !formData) {
        console.error('❌ Missing required fields:', { dayOfWeek: !!dayOfWeek, templateType: !!templateType, formData: !!formData });
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: Provide html OR (dayOfWeek, templateType, formData)' 
        });
      }
      inputProps = { dayOfWeek, templateType, ...formData };
    }

    console.log('🔍 Selecting composition...', compositionId);
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: compositionId,
      inputProps,
      browserInstance: browser,
    });
    console.log('✅ Composition selected:', composition.id);

    console.log('🎬 Starting video rendering...');
    const outputPath = `/tmp/${outputName}-${Date.now()}.mp4`;
    
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps,
      browserInstance: browser,
    });

    console.log('✅ Video rendered successfully:', outputPath);

    // Read the video file and convert to base64
    const fs = await import('fs/promises');
    const videoBuffer = await fs.readFile(outputPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Clean up temporary file
    await fs.unlink(outputPath);
    
    console.log('📤 Sending video response, size:', Math.round(videoBuffer.length / 1024 / 1024), 'MB');

    // Send response (only once)
    res.json({
      success: true,
      videoData: videoBase64,
      stats: {
        fileSizeMB: Math.round(videoBuffer.length / 1024 / 1024),
        duration: '7 seconds',
        format: 'mp4',
        resolution: '1080x1920'
      }
    });

    // Close browser (ignore errors) after responding
    try {
      await browser.close({ silent: true });
    } catch (closeErr) {
      console.warn('⚠️ Browser close warning (ignored):', closeErr?.message || closeErr);
    }

  } catch (err) {
    console.error('❌ Video render error:', err);
    console.error('❌ Error stack:', err.stack);
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        error: err instanceof Error ? err.message : 'Unknown error',
        details: err.stack 
      });
    }
  }
});

// Render HTML to MP4 using Puppeteer and FFmpeg (no Remotion)
app.post('/render-html-video-puppeteer', async (req, res) => {
  try {
    const {
      html,
      width = 1080,
      height = 1920,
      fps = 30,
      duration = 7000,
      deviceScaleFactor = 2,
    } = req.body || {};

    if (!html) {
      return res.status(400).json({ success: false, error: 'Missing html' });
    }

    // Prepare temp dirs
    const tmpDir = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'puppeteer-render-'));
    const framesDir = path.join(tmpDir, 'frames');
    await fsPromises.mkdir(framesDir, { recursive: true });
    const outputPath = path.join(tmpDir, 'out.mp4');

    // Launch Chromium
    const browser = await puppeteer.launch({
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--single-process',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });

    await page.setContent(html, { waitUntil: 'networkidle0' });
    // Ensure fonts ready and a tiny paint delay
    try { await page.evaluate(() => (document && document.fonts && document.fonts.ready) ? document.fonts.ready : null); } catch {}
    await page.waitForTimeout(200);

    // Pause CSS animations and start at 0ms
    await page.evaluate(() => {
      const animations = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
      for (const a of animations) {
        a.pause();
        a.currentTime = 0;
      }
    });

    const totalFrames = Math.round((fps * duration) / 1000);
    for (let i = 0; i < totalFrames; i++) {
      const t = Math.round(i * (1000 / fps));
      await page.evaluate((ms) => {
        const animations = typeof document.getAnimations === 'function' ? document.getAnimations() : [];
        for (const a of animations) {
          a.currentTime = ms;
        }
      }, t);
      const framePath = path.join(framesDir, `frame-${String(i).padStart(5, '0')}.png`);
      await page.screenshot({ path: framePath, type: 'png' });
    }

    await browser.close().catch(() => {});

    // Encode to MP4 via ffmpeg
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', [
        '-y',
        '-r', String(fps),
        '-i', path.join(framesDir, 'frame-%05d.png'),
        '-vf', `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}`,
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputPath,
      ]);
      ff.on('error', reject);
      ff.on('close', (code) => (code === 0 ? resolve(null) : reject(new Error(`ffmpeg exited ${code}`))));
      // reduce noise
      ff.stderr.on('data', () => {});
    });

    const videoBuffer = await fsPromises.readFile(outputPath);
    const videoBase64 = videoBuffer.toString('base64');

    // Cleanup temp dir (best effort)
    await fsPromises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});

    return res.json({ success: true, videoData: videoBase64, stats: { fileSizeMB: Math.round(videoBuffer.length/1024/1024), durationMs: duration, fps, width, height } });
  } catch (err) {
    console.error('❌ render-html-video-puppeteer error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Convert a still image (base64) to an MP4 video of given duration
app.post('/image-to-video', async (req, res) => {
  try {
    const { imageBase64, durationSeconds = 7 } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ success: false, error: 'Missing imageBase64' });
    }

    // Write image to temp file
    const fs = await import('fs/promises');
    const pathMod = await import('path');
    const tmpDir = '/tmp';
    const imagePath = pathMod.default.join(tmpDir, `frame-${Date.now()}.png`);
    const videoPath = pathMod.default.join(tmpDir, `video-${Date.now()}.mp4`);

    const data = imageBase64.replace(/^data:image\/(png|jpeg);base64,/, '');
    await fs.writeFile(imagePath, Buffer.from(data, 'base64'));

    // Use ffmpeg to create a video from the still image
    // 1080x1920, H.264, yuv420p, duration as requested
    const { spawn } = await import('child_process');
    await new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-loop', '1',
        '-i', imagePath,
        '-t', String(durationSeconds),
        '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920',
        '-r', '30',
        '-c:v', 'libx264',
        '-pix_fmt', 'yuv420p',
        videoPath,
      ];
      const ff = spawn('ffmpeg', args);
      ff.on('error', reject);
      ff.stderr.on('data', () => {});
      ff.on('close', code => {
        if (code === 0) resolve(); else reject(new Error(`ffmpeg exited with ${code}`));
      });
    });

    const videoBuffer = await fs.readFile(videoPath);
    const videoBase64 = videoBuffer.toString('base64');

    // Cleanup
    await fs.unlink(imagePath).catch(()=>{});
    await fs.unlink(videoPath).catch(()=>{});

    return res.json({ success: true, videoData: videoBase64, stats: { fileSizeMB: Math.round(videoBuffer.length/1024/1024), duration: `${durationSeconds} seconds` } });
  } catch (err) {
    console.error('❌ image-to-video error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : 'Unknown error' });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, '0.0.0.0', () => {
  console.log(`🎬 Video Story Render service listening on 0.0.0.0:${port}`);
  console.log('🚀 Ready to generate content pillar videos!');
  console.log('🔧 Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    RAILWAY_ENVIRONMENT: process.env.RAILWAY_ENVIRONMENT
  });
});
