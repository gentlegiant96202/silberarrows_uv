import { NextRequest, NextResponse } from 'next/server';

interface GenerateRailwayImageRequest {
  html: string;
  templateType: 'A' | 'B';
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🎨 Generate Railway Image route called for Myth Buster Monday');

    let body: GenerateRailwayImageRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { html, templateType, width = 2160, height = 3840 } = body;

    console.log('📝 Request received:', {
      templateType,
      htmlLength: html?.length || 0,
      dimensions: `${width}x${height}`
    });

    if (!html || !templateType) {
      console.error('❌ Missing required fields');
      return NextResponse.json({ 
        error: 'Missing required fields: html and templateType' 
      }, { status: 400 });
    }

    // Replace relative font URLs with absolute Railway URLs so Playwright can load them
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 
                       process.env.RENDERER_URL || 
                       'https://story-render-production.up.railway.app';
    
    const htmlWithAbsoluteFonts = html.replace(
      /url\('\/Fonts\//g, 
      `url('${rendererUrl}/Fonts/`
    );
    
    console.log('🔤 Replaced relative font URLs with absolute Railway URLs');

    // Check if HTML is too large (> 500KB)
    if (htmlWithAbsoluteFonts && htmlWithAbsoluteFonts.length > 500000) {
      console.error('❌ HTML content too large:', htmlWithAbsoluteFonts.length, 'characters');
      return NextResponse.json({ error: 'HTML content too large (>500KB)' }, { status: 400 });
    }
    
    console.log('📡 Calling Railway renderer service at:', rendererUrl);
    
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
        console.log(`🔄 Attempt ${attempt}/3 to reach Railway renderer...`);
        
        response = await fetch(`${rendererUrl}/render-myth-buster`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            html: htmlWithAbsoluteFonts,
            templateType,
            width,
            height
          }),
          signal: AbortSignal.timeout(45000) // 45 second timeout
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
      throw new Error(`Failed to connect to Railway renderer after 3 attempts. Last error: ${lastError instanceof Error ? lastError.message : lastError}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Railway renderer failed to generate image');
    }

    console.log('✅ Myth Buster image generated successfully via Railway');
    console.log('📊 Stats:', result.stats);
    
    return NextResponse.json({
      success: true,
      data: {
        imageBase64: result.mythBusterImage,
        templateType: templateType,
        stats: result.stats
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error generating Railway image:', error);
    console.error('❌ Error stack:', error.stack);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
}
