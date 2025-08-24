import { NextRequest, NextResponse } from 'next/server';

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
      
      // Use PDFShift in production, renderer service in development
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
        return await generateFromHTMLPDFShift(html, dayOfWeek);
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
      
      // Use PDFShift in production, renderer service in development
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

// Generate from HTML using PDFShift (for production)
async function generateFromHTMLPDFShift(html: string, dayOfWeek: string) {
  console.log('🎨 Using PDFShift for image generation (production mode)');
  
  if (!process.env.PDFSHIFT_API_KEY) {
    throw new Error('PDFShift API key not configured');
  }

  try {
    // Call PDFShift API to convert HTML to image
    console.log('📄 Generating image with PDFShift...');
    const response = await fetch('https://api.pdfshift.io/v3/convert/png', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        format: 'png',
        width: 1080,
        height: 1920,
        use_print: false,
        margin: {
          top: '0px',
          bottom: '0px',
          left: '0px',
          right: '0px'
        }
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PDFShift API error: ${error}`);
    }

    const imageBuffer = await response.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    
    console.log('✅ Image generated successfully with PDFShift');
    
    return NextResponse.json({
      success: true,
      image: `data:image/png;base64,${base64Image}`,
      method: 'pdfshift'
    });

  } catch (error) {
    console.error('PDFShift error:', error);
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