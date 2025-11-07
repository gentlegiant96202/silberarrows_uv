import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Fixed marketing card details (no vehicle-specific data)
    const marketingDetails = {
      year: '2024',
      model: 'Mercedes-Benz',
      price: '3,999',
      heroImageUrl: 'https://database.silberarrows.com/storage/v1/object/public/media-files/hero-bg-silver-optimized.jpg',
    };

    // Call Railway renderer service to generate marketing card
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';

    console.log('🔄 Calling Railway renderer service for marketing card at:', rendererUrl);
    console.log('📊 Marketing details:', marketingDetails);

    const renderResponse = await fetch(`${rendererUrl}/render-leasing-catalog-alt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carDetails: marketingDetails, // Use generic details
      }),
    });

    console.log('📊 Marketing card render response status:', renderResponse.status);

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('❌ Renderer service error for marketing card:', errorText);
      return NextResponse.json({
        error: 'Failed to generate marketing card',
        details: `Renderer service returned ${renderResponse.status}: ${errorText}`,
        rendererUrl,
      }, { status: 500 });
    }

    const renderResult = await renderResponse.json();

    if (!renderResult.success || !renderResult.catalogImage) {
      return NextResponse.json({
        error: 'Renderer service returned invalid response for marketing card',
        details: renderResult
      }, { status: 500 });
    }

    // Convert base64 to buffer for storage
    const imageBuffer = Buffer.from(renderResult.catalogImage, 'base64');

    // Upload generated image to Supabase Storage
    const fileName = `leasing-marketing-card-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(`leasing-catalog-cards/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error for marketing card:', uploadError);
      return NextResponse.json({
        error: 'Failed to save generated marketing card',
        details: uploadError.message
      }, { status: 500 });
    }

    // Get public URL and replace with new domain
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(`leasing-catalog-cards/${fileName}`);

    // Replace old Supabase URL with new domain
    const updatedPublicUrl = publicUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');

    return NextResponse.json({
      success: true,
      message: 'Marketing card generated successfully',
      imageUrl: updatedPublicUrl,
      marketingDetails
    });

  } catch (error) {
    console.error('Error generating marketing card:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

