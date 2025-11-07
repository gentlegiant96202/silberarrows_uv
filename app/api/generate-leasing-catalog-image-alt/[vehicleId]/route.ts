import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { vehicleId } = await params;

    // Fetch vehicle data
    const { data: vehicle, error: vehicleError } = await supabase
      .from('leasing_inventory')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        monthly_lease_rate,
        current_mileage_km,
        regional_specification
      `)
      .eq('id', vehicleId)
      .single();
      
    // Also get catalog data
    const { data: catalogData } = await supabase
      .from('leasing_catalog')
      .select('title, make, model')
      .eq('vehicle_id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Calculate leasing payment
    const monthlyRate = vehicle.monthly_lease_rate || 0;

    // Prepare vehicle details for renderer (no car image needed for alt design)
    const vehicleDetails = {
      year: vehicle.model_year,
      model: (vehicle.vehicle_model || '').replace(/\bMercedes[- ]Benz\b/gi, '').replace(/\bMercedes[- ]AMG\b/gi, '').trim(),
      mileage: vehicle.current_mileage_km ? vehicle.current_mileage_km.toLocaleString() : '0',
      stockNumber: vehicle.stock_number,
      regionalSpecification: (vehicle.regional_specification || 'GCC').replace(/\s*SPECIFICATION/i, ''),
      originalPrice: monthlyRate ? monthlyRate.toLocaleString() : '—',
    };

    // Call Railway renderer service to generate alt catalog image
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
    
    console.log('🔄 Calling Railway renderer service (ALT) at:', rendererUrl);
    console.log('📊 Vehicle details:', vehicleDetails);
    
    const renderResponse = await fetch(`${rendererUrl}/render-leasing-catalog-alt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carDetails: vehicleDetails,
      }),
    });

    console.log('📊 Render response status:', renderResponse.status);

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('❌ Renderer service error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to generate alt catalog image',
        details: `Renderer service returned ${renderResponse.status}: ${errorText}`,
        rendererUrl,
        vehicleDetails
      }, { status: 500 });
    }

    const renderResult = await renderResponse.json();
    
    if (!renderResult.success || !renderResult.catalogImage) {
      return NextResponse.json({ 
        error: 'Renderer service returned invalid response',
        details: renderResult 
      }, { status: 500 });
    }

    // Convert base64 to buffer for storage
    const imageBuffer = Buffer.from(renderResult.catalogImage, 'base64');

    // Upload generated image to Supabase Storage
    const fileName = `leasing-catalog-alt-${vehicle.stock_number}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(`leasing-catalog-cards/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to save generated image',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL and replace with new domain
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(`leasing-catalog-cards/${fileName}`);
    
    // Replace old Supabase URL with new domain
    const updatedPublicUrl = publicUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');

    // Update Leasing catalog entry with alt image
    const { error: catalogUpdateError } = await supabase
      .from('leasing_catalog')
      .update({
        catalog_image_alt_url: updatedPublicUrl,
      })
      .eq('vehicle_id', vehicleId);

    if (catalogUpdateError) {
      console.error('❌ CRITICAL: Leasing catalog update error:', catalogUpdateError);
      console.error('❌ Database update failed for vehicle:', vehicleId, 'with URL:', updatedPublicUrl);
      return NextResponse.json({ 
        error: 'Failed to update catalog database',
        details: catalogUpdateError.message,
        imageUrl: updatedPublicUrl,
        note: 'Image was generated but not saved to database'
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Alt catalog image generated successfully',
      imageUrl: updatedPublicUrl,
      vehicleDetails
    });

  } catch (error) {
    console.error('Error generating alt catalog image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

