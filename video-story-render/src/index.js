import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';

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
    
    const { dayOfWeek, templateType, formData } = req.body || {};
    
    if (!dayOfWeek || !templateType || !formData) {
      console.error('❌ Missing required fields:', { dayOfWeek: !!dayOfWeek, templateType: !!templateType, formData: !!formData });
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: dayOfWeek, templateType, formData' 
      });
    }

    console.log('🎨 Bundling Remotion composition...');
    const bundleLocation = await bundle(path.resolve(__dirname, 'Video.tsx'));
    console.log('✅ Bundle created at:', bundleLocation);

    console.log('🔍 Selecting composition...');
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'ContentPillar',
      inputProps: {
        dayOfWeek,
        templateType,
        ...formData
      },
    });
    console.log('✅ Composition selected:', composition.id);

    console.log('🎬 Starting video rendering...');
    const outputPath = `/tmp/content-pillar-${dayOfWeek}-${templateType}-${Date.now()}.mp4`;
    
    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: {
        dayOfWeek,
        templateType,
        ...formData
      },
    });

    console.log('✅ Video rendered successfully:', outputPath);

    // Read the video file and convert to base64
    const fs = await import('fs/promises');
    const videoBuffer = await fs.readFile(outputPath);
    const videoBase64 = videoBuffer.toString('base64');
    
    // Clean up temporary file
    await fs.unlink(outputPath);
    
    console.log('📤 Sending video response, size:', Math.round(videoBuffer.length / 1024 / 1024), 'MB');

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

  } catch (err) {
    console.error('❌ Video render error:', err);
    console.error('❌ Error stack:', err.stack);
    res.status(500).json({ 
      success: false, 
      error: err instanceof Error ? err.message : 'Unknown error',
      details: err.stack 
    });
  }
});

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`🎬 Video Story Render service listening on :${port}`);
  console.log('🚀 Ready to generate content pillar videos!');
});
