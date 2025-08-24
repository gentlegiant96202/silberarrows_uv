import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { title, description, imageUrl, dayOfWeek, badgeText, subtitle } = await req.json();
    
    console.log('🎨 Generating content pillar image:', { title, dayOfWeek, hasImage: !!imageUrl });
    
    if (!title || !description || !imageUrl || !dayOfWeek) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: title, description, imageUrl, dayOfWeek' 
      }, { status: 400 });
    }

    // Call the renderer service
    const rendererUrl = process.env.RENDERER_URL || 'http://localhost:3000';
    
    console.log('📡 Calling renderer service at:', rendererUrl);
    
    const response = await fetch(`${rendererUrl}/render-content-pillar`, {
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
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Renderer service error:', errorText);
      throw new Error(`Renderer service failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Renderer service returned failure');
    }

    console.log('✅ Content pillar image generated successfully');
    
    return NextResponse.json({
      success: true,
      imageBase64: result.contentPillarImage,
      format: 'png',
      dimensions: { width: 1080, height: 1080 }
    });

  } catch (error) {
    console.error('❌ Error generating content pillar image:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to generate content pillar image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
