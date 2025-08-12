import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

function generateCatalogHTML(carDetails: any, catalogImageUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${carDetails.year} ${carDetails.model} | UV Catalog</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: transparent;
      color: #ffffff;
      height: 100vh;
      width: 100vw;
      padding: 0;
      margin: 0;
      overflow: hidden;
    }

    .catalog-card-square {
      display: flex;
      flex-direction: column;
      width: 1080px;
      height: 1080px;
      position: relative;
      overflow: hidden;
      background-image: url('${catalogImageUrl}');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .price-badge {
      position: absolute;
      top: 30px;
      right: 30px;
      background: rgba(0, 0, 0, 0.8);
      backdrop-filter: blur(20px);
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 20px;
      padding: 12px 20px;
      z-index: 3;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .price-text {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 25%, #d4d4d4 50%, #f0f0f0 75%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
      text-align: center;
      letter-spacing: 1px;
    }

    .info-panel {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 35%;
      background: linear-gradient(180deg, 
        rgba(0, 0, 0, 0.1) 0%, 
        rgba(0, 0, 0, 0.7) 40%, 
        rgba(0, 0, 0, 0.9) 100%);
      backdrop-filter: blur(15px);
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding: 25px 30px;
      z-index: 2;
    }

    .car-title {
      font-size: 42px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #f0f0f0 25%, #d4d4d4 50%, #f0f0f0 75%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 15px;
      filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.4));
      letter-spacing: 2px;
      text-transform: uppercase;
    }

    .specs-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 20px;
      gap: 30px;
    }

    .spec-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 15px 10px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .spec-label {
      font-size: 14px;
      font-weight: 500;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .spec-value {
      font-size: 20px;
      font-weight: 700;
      background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 50%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.3));
      text-align: center;
    }

    .brand-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: auto;
    }

    .brand-logo {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ffffff 0%, #e8e8e8 50%, #ffffff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      filter: drop-shadow(0 0 15px rgba(255, 255, 255, 0.4));
      letter-spacing: 1px;
    }

    .contact-info {
      text-align: right;
      font-size: 16px;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.9);
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="catalog-card-square">
    <!-- Price Badge -->
    <div class="price-badge">
      <div class="price-text">AED ${carDetails.price}</div>
    </div>

    <!-- Bottom Info Panel -->
    <div class="info-panel">
      <!-- Car Title -->
      <div class="car-title">${carDetails.year} ${carDetails.model}</div>
      
      <!-- Specs Row -->
      <div class="specs-row">
        <div class="spec-item">
          <div class="spec-label">Mileage</div>
          <div class="spec-value">${carDetails.mileage} KM</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Stock</div>
          <div class="spec-value">${carDetails.stockNumber}</div>
        </div>
        <div class="spec-item">
          <div class="spec-label">Price</div>
          <div class="spec-value">AED ${carDetails.price}</div>
        </div>
      </div>

      <!-- Brand Footer -->
      <div class="brand-footer">
        <div class="brand-logo">SilberArrows</div>
        <div class="contact-info">
          +971 4 380 5515<br>
          sales@silberarrows.com
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;

    // Fetch car data
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        advertised_price_aed,
        current_mileage_km
      `)
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // Fetch catalog image (kind = 'catalog') or fall back to primary photo [[memory:5456998]]
    let { data: catalogMedia, error: catalogError } = await supabase
      .from('car_media')
      .select('url')
      .eq('car_id', carId)
      .eq('kind', 'catalog')
      .single();

    // If no catalog image, fall back to primary photo
    if (catalogError || !catalogMedia) {
      const { data: photoMedia, error: photoError } = await supabase
        .from('car_media')
        .select('url')
        .eq('car_id', carId)
        .eq('kind', 'photo')
        .eq('is_primary', true)
        .single();

      if (photoError || !photoMedia) {
        return NextResponse.json({ 
          error: 'No suitable image found. Please upload a catalog image or primary photo for this car.' 
        }, { status: 404 });
      }
      
      catalogMedia = photoMedia;
    }

    // Prepare car details for renderer
    const carDetails = {
      year: car.model_year,
      model: car.vehicle_model,
      mileage: car.current_mileage_km ? car.current_mileage_km.toLocaleString() : '0',
      stockNumber: car.stock_number,
      price: car.advertised_price_aed ? car.advertised_price_aed.toLocaleString() : '0'
    };

    // Call Railway renderer service to generate catalog image (same as price drop)
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
    
    console.log('🔄 Calling Railway renderer service at:', rendererUrl);
    console.log('📊 Car details:', carDetails);
    console.log('🖼️ Catalog image URL:', catalogMedia.url);
    
    const renderResponse = await fetch(`${rendererUrl}/render-catalog`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        carDetails,
        catalogImageUrl: catalogMedia.url,
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
        carDetails,
        catalogImageUrl: catalogMedia.url
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
    const fileName = `catalog-card-${car.stock_number}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(`catalog-cards/${fileName}`, imageBuffer, {
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

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(`catalog-cards/${fileName}`);

    // Update UV catalog table with generated image and mark as ready
    const { error: catalogUpdateError } = await supabase
      .from('uv_catalog')
      .update({
        catalog_image_url: publicUrl,
        status: 'ready',
        last_generated_at: new Date().toISOString(),
        error_message: null
      })
      .eq('car_id', carId);

    if (catalogUpdateError) {
      console.error('UV catalog table error:', catalogUpdateError);
      console.error('Full error details:', JSON.stringify(catalogUpdateError, null, 2));
      return NextResponse.json({ 
        error: 'Failed to update catalog record',
        details: catalogUpdateError.message || catalogUpdateError,
        fullError: catalogUpdateError
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Catalog image generated successfully',
      imageUrl: publicUrl,
      carDetails
    });

  } catch (error) {
    console.error('Error generating catalog image:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 