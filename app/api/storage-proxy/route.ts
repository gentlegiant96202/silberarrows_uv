import { NextRequest, NextResponse } from 'next/server';

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');
    
    if (!imageUrl) {
      return NextResponse.json({ error: 'URL parameter required' }, { status: 400 });
    }

    console.log('🖼️ Storage Proxy: Attempting to fetch image:', imageUrl);

    // Try multiple URL variations to find working storage
    const urlsToTry = [
      imageUrl, // Original URL
      imageUrl.replace(/https:\/\/[^.]+\.supabase\.co/, 'https://database.silberarrows.com'), // Custom domain
      imageUrl.replace('https://database.silberarrows.com', process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public'), // Fallback to direct supabase
    ];

    let response: Response | null = null;
    let workingUrl: string | null = null;

    for (const url of urlsToTry) {
      try {
        console.log('🔍 Trying URL:', url);
        const testResponse = await fetch(url, { 
          method: 'HEAD',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (testResponse.ok) {
          workingUrl = url;
          response = await fetch(url);
          break;
        }
      } catch (error) {
        console.log('❌ URL failed:', url);
        continue;
      }
    }

    if (!response || !response.ok || !workingUrl) {
      console.error('❌ Storage Proxy: No working URL found for image');
      return NextResponse.json({ error: 'Image not accessible' }, { status: 404 });
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    console.log('✅ Storage Proxy: Successfully proxied image from:', workingUrl);

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache for images
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Accept',
        'Access-Control-Max-Age': '86400',
      },
    });

  } catch (error) {
    console.error('❌ Storage Proxy: Error:', error);
    return NextResponse.json({ error: 'Failed to proxy image' }, { status: 500 });
  }
}
