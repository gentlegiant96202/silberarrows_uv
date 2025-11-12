import { NextRequest, NextResponse } from 'next/server';

interface GeneratePreviewImageRequest {
  html: string;
  templateType: 'A' | 'B';
  width?: number;
  height?: number;
}

export async function POST(req: NextRequest) {
  try {
    let body: GeneratePreviewImageRequest;
    try {
      body = await req.json();
    } catch (parseError) {
      return NextResponse.json({ error: 'Invalid JSON in request body' }, { status: 400 });
    }

    const { html, templateType, width = 1080, height = 1920 } = body;
    // Check if HTML is too large (> 100KB)
    if (html && html.length > 100000) {
      return NextResponse.json({ error: 'HTML content too large (>100KB)' }, { status: 400 });
    }

    // Log first 500 characters of HTML for debugging
    if (html) {
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
      throw new Error('HTML_CSSToIMAGE_USER_ID and HTML_CSSToIMAGE_API_KEY must be set in environment variables.');
    }
    // Use htmlcsstoimage.com API to generate actual images from HTML
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
          ms_delay: 2000, // Increased delay to ensure images load fully
          format: 'jpeg',
          quality: 90,
          device_scale: 1, // HTML is already generated at 2x scale, no need to scale again
          render_when_ready: false, // Don't wait for manual trigger
        }),
      });
      if (!htmlcsstoimageResponse.ok) {
        const errorText = await htmlcsstoimageResponse.text();
        // Fallback to placeholder if API fails
        publicImageUrl = `https://via.placeholder.com/${width}x${height}/000000/FFFFFF?text=${encodeURIComponent(templateType + ' Template (API Error)')}`;
      } else {
        const result = await htmlcsstoimageResponse.json();
        publicImageUrl = result.url;
      }
    } catch (apiError) {
      // Fallback to placeholder if API call fails completely
      publicImageUrl = `https://via.placeholder.com/${width}x${height}/000000/FFFFFF?text=${encodeURIComponent(templateType + ' Template (API Down)')}`;
    }

    return NextResponse.json({
      success: true,
      data: {
        imageUrl: publicImageUrl,
        templateType: templateType
      },
    }, { status: 201 });

  } catch (error: any) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : 'No stack trace available'
      },
      { status: 500 }
    );
  }
}
