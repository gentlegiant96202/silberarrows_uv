import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    console.log('🎬 Video generation API called');
    
    const body = await req.json();
    console.log('📋 Request body:', JSON.stringify(body, null, 2));
    
    const { dayOfWeek, templateType, formData } = body;
    
    if (!dayOfWeek || !templateType || !formData) {
      console.error('❌ Missing required fields:', { dayOfWeek: !!dayOfWeek, templateType: !!templateType, formData: !!formData });
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: dayOfWeek, templateType, formData' 
      }, { status: 400 });
    }

    // Get video service URL from environment
    let videoServiceUrl = process.env.VIDEO_SERVICE_URL || 'http://localhost:3001';
    
    // Ensure URL has protocol
    if (videoServiceUrl && !videoServiceUrl.startsWith('http://') && !videoServiceUrl.startsWith('https://')) {
      videoServiceUrl = `https://${videoServiceUrl}`;
    }
    
    console.log('📡 Forwarding request to video service:', videoServiceUrl);
    console.log('🔧 Raw VIDEO_SERVICE_URL env var:', process.env.VIDEO_SERVICE_URL);
    
    // Forward request to video service
    const videoServiceResponse = await fetch(`${videoServiceUrl}/render-video`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Forward any auth headers if needed
        ...(req.headers.get('authorization') && {
          'Authorization': req.headers.get('authorization')!
        })
      },
      body: JSON.stringify({
        dayOfWeek,
        templateType,
        formData
      }),
      // Set a longer timeout for video generation
      signal: AbortSignal.timeout(300000) // 5 minutes
    });

    console.log('📥 Video service response status:', videoServiceResponse.status);

    if (!videoServiceResponse.ok) {
      const errorText = await videoServiceResponse.text();
      console.error('❌ Video service error:', errorText);
      return NextResponse.json({ 
        success: false, 
        error: `Video service error: ${errorText}` 
      }, { status: videoServiceResponse.status });
    }

    const result = await videoServiceResponse.json();
    console.log('✅ Video generation successful, response size:', JSON.stringify(result).length, 'characters');
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('❌ Video generation API error:', error);
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json({ 
        success: false, 
        error: 'Video generation timed out. Please try again.' 
      }, { status: 408 });
    }
    
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
