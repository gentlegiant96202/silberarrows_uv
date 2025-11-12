import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dayOfWeek, templateType, formData, formDataA, formDataB, imageBase64A, imageBase64B, htmlA, htmlB } = body;
    
    if (!dayOfWeek || (!imageBase64A && !htmlA && (!templateType || !(formData || (formDataA && formDataB))))) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: dayOfWeek AND (imageBase64A|htmlA|templateType+formData)' 
      }, { status: 400 });
    }

    // Get video service URL from environment - clean it up
    let videoServiceUrl = (process.env.VIDEO_SERVICE_URL || 'https://videostoryrendering-production.up.railway.app').trim();
    
    // Clean up any malformed URLs that might have extra environment variable text
    if (videoServiceUrl.includes('NEXT_PUBLIC_RENDERER_URL')) {
      videoServiceUrl = 'https://videostoryrendering-production.up.railway.app';
    }
    // Ensure URL has protocol
    if (videoServiceUrl && !videoServiceUrl.startsWith('http://') && !videoServiceUrl.startsWith('https://')) {
      videoServiceUrl = `https://${videoServiceUrl}`;
    }
    // First, try to hit the health check endpoint (but don't fail if it doesn't work)
    try {
      const healthResponse = await fetch(`${videoServiceUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (healthResponse.ok) {
        const healthData = await healthResponse.text();
      } else {
      }
    } catch (healthError) {
      // Don't return error here - continue with video generation attempt
    }
    
    // If caller provided pre-rendered images (from HTML), convert both to videos
    if (imageBase64A) {
      const payloadA = { imageBase64: imageBase64A, durationSeconds: 7 };
      const payloadB = imageBase64B ? { imageBase64: imageBase64B, durationSeconds: 7 } : payloadA;

      const [respA, respB] = await Promise.all([
        fetch(`${videoServiceUrl}/image-to-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadA), signal: AbortSignal.timeout(300000)
        }),
        fetch(`${videoServiceUrl}/image-to-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payloadB), signal: AbortSignal.timeout(300000)
        })
      ]);

      if (!respA.ok) return NextResponse.json({ success: false, error: await respA.text() }, { status: respA.status });
      if (!respB.ok) return NextResponse.json({ success: false, error: await respB.text() }, { status: respB.status });

      const resultA = await respA.json();
      const resultB = await respB.json();

      return NextResponse.json({ success: true, videos: { A: resultA.videoData, B: resultB.videoData } });
    }

    // If caller provided HTML for A & B, render via Remotion (fast) for Monday, HTMLVideo for others
    if (htmlA) {
      const [respA, respB] = await Promise.all([
        fetch(`${videoServiceUrl}/render-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            html: htmlA, 
            dayOfWeek, 
            templateType: 'A', 
            formData: formDataA || formData 
          }), signal: AbortSignal.timeout(300000)
        }),
        fetch(`${videoServiceUrl}/render-video`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            html: htmlB || htmlA, 
            dayOfWeek, 
            templateType: 'B', 
            formData: formDataB || formData 
          }), signal: AbortSignal.timeout(300000)
        })
      ]);

      if (!respA.ok) return NextResponse.json({ success: false, error: await respA.text() }, { status: respA.status });
      if (!respB.ok) return NextResponse.json({ success: false, error: await respB.text() }, { status: respB.status });

      const resultA = await respA.json();
      const resultB = await respB.json();

      return NextResponse.json({ success: true, videos: { A: resultA.videoData, B: resultB.videoData } });
    }

    // Otherwise render via template A & B on the video service
    let videoServiceResponseA;
    try {
      videoServiceResponseA = await fetch(`${videoServiceUrl}/render-video`, {
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
          templateType: 'A',
          formData: formDataA || formData
        }),
        // Set a longer timeout for video generation
        signal: AbortSignal.timeout(300000) // 5 minutes
      });
    } catch (fetchError) {
      throw new Error(`Video service connection failed: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }
    
    if (!videoServiceResponseA.ok) {
      const errorText = await videoServiceResponseA.text();
      return NextResponse.json({ success: false, error: `Video A error: ${errorText}` }, { status: videoServiceResponseA.status });
    }

    const resultA = await videoServiceResponseA.json();

    // Forward request to video service - Template B
    let videoServiceResponseB;
    try {
      videoServiceResponseB = await fetch(`${videoServiceUrl}/render-video`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dayOfWeek, templateType: 'B', formData: formDataB || formData }),
        signal: AbortSignal.timeout(300000)
      });
    } catch (fetchError) {
      throw new Error(`Video service connection failed for Template B: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }

    if (!videoServiceResponseB.ok) {
      const errorText = await videoServiceResponseB.text();
      return NextResponse.json({ success: false, error: `Video B error: ${errorText}` }, { status: videoServiceResponseB.status });
    }

    const resultB = await videoServiceResponseB.json();
    return NextResponse.json({
      success: true,
      videos: {
        A: resultA.videoData,
        B: resultB.videoData,
      }
    });
    
  } catch (error) {
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
