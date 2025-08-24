import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Check if we're using the new HTML-based approach or the old template-based approach
    if (body.html) {
      // New approach: use provided HTML directly
      const { html, dayOfWeek } = body;
      
      console.log('🎨 Generating content pillar image from HTML:', { dayOfWeek, htmlLength: html?.length });
      
      if (!html || !dayOfWeek) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing required fields: html, dayOfWeek' 
        }, { status: 400 });
      }
      
      // Use Puppeteer in production, renderer service in development
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return await generateFromHTMLPuppeteer(html, dayOfWeek);
      } else {
        return await generateFromHTML(html, dayOfWeek);
      }
      
    } else {
      // Old approach: use template variables (for backward compatibility)
      const { title, description, imageUrl, dayOfWeek, badgeText, subtitle } = body;
      
      console.log('🎨 Generating content pillar image:', { title, dayOfWeek, hasImage: !!imageUrl });
      
      if (!title || !description || !imageUrl || !dayOfWeek) {
        return NextResponse.json({ 
          success: false, 
          error: 'Missing required fields: title, description, imageUrl, dayOfWeek' 
        }, { status: 400 });
      }
      
      // Use Puppeteer in production, renderer service in development
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        // For template-based approach in production, we'd need to generate HTML first
        // For now, return an error suggesting to use the new HTML-based approach
        return NextResponse.json({
          success: false,
          error: 'Template-based generation not supported in production. Please use the HTML-based approach.'
        }, { status: 400 });
      } else {
        return await generateFromTemplate(title, description, imageUrl, dayOfWeek, badgeText, subtitle);
      }
    }
  } catch (error) {
    console.error('❌ Error in generate-content-pillar-image:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

// Generate from HTML using Puppeteer (for production)
async function generateFromHTMLPuppeteer(html: string, dayOfWeek: string) {
  console.log('🎨 Using Puppeteer for image generation (production mode)');
  
  let browser;
  try {
    // Launch Puppeteer with production-friendly settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport to Instagram story dimensions
    await page.setViewport({ width: 1080, height: 1920 });
    
    // Set content and wait for fonts to load
    await page.setContent(html, { waitUntil: 'networkidle0' });
    
    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      clip: { x: 0, y: 0, width: 1080, height: 1920 }
    });

    await browser.close();

    // Return the image as base64
    const base64Image = Buffer.from(screenshot).toString('base64');
    
    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64Image}`,
      method: 'puppeteer'
    });

  } catch (error) {
    if (browser) {
      await browser.close();
    }
    console.error('Puppeteer error:', error);
    throw error;
  }
}

// Generate from HTML using renderer service (for development)
async function generateFromHTML(html: string, dayOfWeek: string) {
  // Call the renderer service with retry logic
  const rendererUrl = process.env.RENDERER_URL || 'http://localhost:3000';
  
  console.log('📡 Calling renderer service at:', rendererUrl);
  
  // First, check if renderer is healthy
  try {
    const healthCheck = await fetch(`${rendererUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (healthCheck.ok) {
      console.log('✅ Renderer health check passed');
    } else {
      console.warn('⚠️ Renderer health check failed, but continuing...');
    }
  } catch (error) {
    console.warn('⚠️ Renderer health check error:', error instanceof Error ? error.message : error);
  }
  
  let response;
  let lastError;
  
  // Try 3 times with increasing delays
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/3 to reach renderer...`);
      
      response = await fetch(`${rendererUrl}/render-html`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          html,
          dayOfWeek
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ Connected to renderer on attempt ${attempt}`);
        break;
      } else {
        throw new Error(`Renderer responded with status: ${response.status}`);
      }
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt < 3) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (!response || !response.ok) {
    throw new Error(`Failed to connect to renderer after 3 attempts. Last error: ${lastError instanceof Error ? lastError.message : lastError}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Renderer failed to generate image');
  }

  console.log('✅ Content pillar image generated successfully');
  
  return NextResponse.json({
    success: true,
    imageBase64: result.contentPillarImage
  });
}

// Old function to generate from template variables (for backward compatibility)
async function generateFromTemplate(title: string, description: string, imageUrl: string, dayOfWeek: string, badgeText?: string, subtitle?: string) {
  // Call the renderer service with retry logic
  const rendererUrl = process.env.RENDERER_URL || 'http://localhost:3000';
  
  console.log('📡 Calling renderer service at:', rendererUrl);
  
  // First, check if renderer is healthy
  try {
    const healthCheck = await fetch(`${rendererUrl}/health`, { 
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    if (healthCheck.ok) {
      console.log('✅ Renderer health check passed');
    } else {
      console.warn('⚠️ Renderer health check failed, but continuing...');
    }
  } catch (error) {
    console.warn('⚠️ Renderer health check error:', error instanceof Error ? error.message : error);
  }
  
  let response;
  let lastError;
  
  // Try 3 times with increasing delays
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/3 to reach renderer...`);
      
      response = await fetch(`${rendererUrl}/render-content-pillar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          imageUrl,
          dayOfWeek,
          badgeText,
          subtitle
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });
      
      if (response.ok) {
        console.log(`✅ Connected to renderer on attempt ${attempt}`);
        break;
      } else {
        throw new Error(`Renderer responded with status: ${response.status}`);
      }
      
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error instanceof Error ? error.message : error);
      
      if (attempt < 3) {
        const delay = attempt * 2000; // 2s, 4s
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  if (!response || !response.ok) {
    throw new Error(`Failed to connect to renderer after 3 attempts. Last error: ${lastError instanceof Error ? lastError.message : lastError}`);
  }

  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Renderer failed to generate image');
  }

  console.log('✅ Content pillar image generated successfully');
  
  return NextResponse.json({
    success: true,
    imageBase64: result.contentPillarImage
  });
}