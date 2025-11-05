import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { vehicleId } = await params;

    // Fetch vehicle data with catalog information (including photos JSON field)
    const { data: vehicle, error: vehicleError } = await supabase
      .from('leasing_inventory')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        monthly_lease_rate,
        current_mileage_km,
        regional_specification,
        horsepower_hp,
        photos
      `)
      .eq('id', vehicleId)
      .single();
      
    // Also get catalog data for standardized title
    const { data: catalogData } = await supabase
      .from('leasing_catalog')
      .select('title, make, model, description')
      .eq('vehicle_id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Extract photos from the JSONB photos field
    const photos = (vehicle.photos || []) as Array<{
      id: string;
      url: string;
      filename: string;
      is_primary: boolean;
      sort_order: number;
      uploaded_at: string;
    }>;

    // Get primary photo or first photo
    let primaryPhoto = photos.find(photo => photo.is_primary);
    if (!primaryPhoto && photos.length > 0) {
      // Use first photo if no primary is set
      primaryPhoto = photos[0];
    }

    if (!primaryPhoto) {
      return NextResponse.json({ 
        error: 'No suitable image found. Please upload a photo for this vehicle.' 
      }, { status: 404 });
    }

    // Calculate leasing payment options (monthly rate already exists)
    const monthlyRate = vehicle.monthly_lease_rate || 0;
    const zeroDown = monthlyRate;
    const twentyDown = monthlyRate * 0.85; // 15% discount with 20% down

    // Prepare vehicle details for renderer
    const vehicleDetails = {
      year: vehicle.model_year,
      model: (vehicle.vehicle_model || '').replace(/\bMercedes[- ]Benz\b/gi, '').replace(/\bMercedes[- ]AMG\b/gi, '').trim(),
      mileage: vehicle.current_mileage_km ? vehicle.current_mileage_km.toLocaleString() : '0',
      stockNumber: vehicle.stock_number,
      price: monthlyRate ? monthlyRate.toLocaleString() : '0',
      engine: '—', // Engine field not available in leasing_inventory
      regionalSpecification: (vehicle.regional_specification || 'GCC').replace(/\s*SPECIFICATION/i, ''),
      horsepower: vehicle.horsepower_hp || '—',
      originalPrice: monthlyRate ? monthlyRate.toLocaleString() : '—',
      zeroDownPayment: zeroDown ? zeroDown.toLocaleString() : '—',
      twentyDownPayment: twentyDown ? twentyDown.toFixed(0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '—'
    };

    // Call Railway renderer service to generate catalog image
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
    
    console.log('🔄 Calling Railway renderer service at:', rendererUrl);
    console.log('📊 Vehicle details:', vehicleDetails);
    console.log('🖼️ Photo URL:', primaryPhoto.url);
    
    const renderResponse = await fetch(`${rendererUrl}/render-leasing-catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carDetails: vehicleDetails, // Renderer expects 'carDetails'
        catalogImageUrl: primaryPhoto.url,
      }),
    });

    console.log('📊 Render response status:', renderResponse.status);

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('❌ Renderer service error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to generate catalog image',
        details: `Renderer service returned ${renderResponse.status}: ${errorText}`,
        rendererUrl,
        vehicleDetails,
        photoUrl: primaryPhoto.url
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
    const fileName = `leasing-catalog-card-${vehicle.stock_number}-${Date.now()}.png`;
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

    // Update or create Leasing catalog entry with generated image
    const { error: catalogUpdateError } = await supabase
      .from('leasing_catalog')
      .upsert({
        vehicle_id: vehicleId,
        title: catalogData?.title || `${vehicle.model_year} ${vehicle.vehicle_model}`,
        description: catalogData?.description || `Premium ${vehicle.model_year} ${vehicle.vehicle_model} available for lease`,
        make: catalogData?.make || 'MERCEDES-BENZ',
        model: catalogData?.model || vehicle.vehicle_model,
        year: vehicle.model_year,
        mileage_km: vehicle.current_mileage_km || 0,
        price_aed: monthlyRate,
        catalog_image_url: updatedPublicUrl,
        status: 'ready',
        last_generated_at: new Date().toISOString(),
        error_message: null
      }, {
        onConflict: 'vehicle_id'
      });

    if (catalogUpdateError) {
      console.error('❌ CRITICAL: Leasing catalog upsert error:', catalogUpdateError);
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
      message: 'Catalog image generated successfully',
      imageUrl: updatedPublicUrl,
      vehicleDetails
    });

  } catch (error) {
    console.error('Error generating catalog image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

