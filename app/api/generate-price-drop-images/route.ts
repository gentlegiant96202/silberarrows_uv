import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { carDetails, pricing, firstImageUrl, secondImageUrl } = await request.json();

    if (!carDetails || !pricing || !firstImageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // This route now serves as a fallback only - the main app should use the external Railway renderer
    // via NEXT_PUBLIC_RENDERER_URL in PriceDropModal.tsx
    
    return NextResponse.json({ 
      success: false, 
      error: 'Please configure NEXT_PUBLIC_RENDERER_URL to use the external Railway renderer' 
    }, { status: 501 });

  } catch (error) {
    console.error('Error in generate-price-drop-images:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 