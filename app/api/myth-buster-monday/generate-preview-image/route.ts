import { NextRequest, NextResponse } from 'next/server';

interface GeneratePreviewImageRequest {
  html: string;
  templateType: 'A' | 'B';
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest) {
  try {
    console.log('🎨 Generate Preview Image route called');

    let body: GeneratePreviewImageRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError);
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { html, templateType, width = 1080, height = 1920 } = body;

    console.log('📝 Request received:', {
      templateType,
      htmlLength: html?.length || 0,
      dimensions: `${width}x${height}`
    });

    // Check if HTML is too large (> 100KB)
    if (html && html.length > 100000) {
      console.error('❌ HTML content too large:', html.length, 'characters');
      return NextResponse.json({ error: 'HTML content too large (>100KB)' }, { status: 400 });
    }

    // Log first 500 characters of HTML for debugging
    if (html) {
      console.log('📄 HTML preview (first 500 chars):', html.substring(0, 500));
    }

    // Get auth token for API call
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    const htmlcsstoimageUserId = process.env.HTML_CSSToIMAGE_USER_ID;
    const htmlcsstoimageApiKey = process.env.HTML_CSSToIMAGE_API_KEY;

    if (!htmlcsstoimageUserId || !htmlcsstoimageApiKey) {
      console.error('❌ HTML_CSSToIMAGE_USER_ID or HTML_CSSToIMAGE_API_KEY is not set in environment variables');
      throw new Error('HTML_CSSToIMAGE_USER_ID and HTML_CSSToIMAGE_API_KEY must be set in environment variables.');
    }

    console.log('🔑 htmlcsstoimage.com credentials found');

    // Use htmlcsstoimage.com API to generate actual images from HTML
    console.log('🌐 Calling htmlcsstoimage.com API to generate real images...');

    let publicImageUrl: string;

    try {
      const htmlcsstoimageResponse = await fetch('https://hcti.io/v1/image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${htmlcsstoimageUserId}:${htmlcsstoimageApiKey}`).toString('base64')}`,
        },
        body: JSON.stringify({
          html: html,
          viewport_width: width,
          viewport_height: height,
          ms_delay: 1000, // Wait for fonts and styles to load
          format: 'jpeg',
          quality: 90,
          device_scale: 1, // HTML is already generated at 2x scale, no need to scale again
        }),
      });

      console.log('📊 htmlcsstoimage.com response status:', htmlcsstoimageResponse.status);

      if (!htmlcsstoimageResponse.ok) {
        const errorText = await htmlcsstoimageResponse.text();
        console.error('❌ htmlcsstoimage.com error response:', errorText);

        // Fallback to placeholder if API fails
        console.log('⚠️ htmlcsstoimage.com failed, using placeholder as fallback');
        publicImageUrl = `https://via.placeholder.com/${width}x${height}/000000/FFFFFF?text=${encodeURIComponent(templateType + ' Template (API Error)')}`;
        console.log('✅ Using fallback URL:', publicImageUrl);
      } else {
        const result = await htmlcsstoimageResponse.json();
        console.log('✅ htmlcsstoimage.com request successful');
        console.log('🖼️ Generated image URL:', result.url);

        publicImageUrl = result.url;
        console.log('✅ Using real image URL:', publicImageUrl);
      }
    } catch (apiError) {
      console.error('❌ htmlcsstoimage.com API error:', apiError);

      // Fallback to placeholder if API call fails completely
      console.log('⚠️ htmlcsstoimage.com API call failed, using placeholder');
      publicImageUrl = `https://via.placeholder.com/${width}x${height}/000000/FFFFFF?text=${encodeURIComponent(templateType + ' Template (API Down)')}`;
      console.log('✅ Using fallback URL:', publicImageUrl);
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: publicImageUrl,
        templateType: templateType
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ Error generating preview image:', error);
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
