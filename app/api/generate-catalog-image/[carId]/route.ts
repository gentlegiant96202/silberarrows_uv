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

    @font-face {
      font-family: 'Resonate';
      src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Regular.woff2') format('woff2');
      font-weight: 400;
      font-style: normal;
    }

    @font-face {
      font-family: 'Resonate';
      src: url('https://database.silberarrows.com/storage/v1/object/public/media-files/fonts/Resonate-Black.woff2') format('woff2');
      font-weight: 900;
      font-style: normal;
    }

    body {
      font-family: 'Inter', sans-serif;
      background: #0a0a0a;
      color: #ffffff;
      height: 100vh;
      width: 100vw;
      padding: 0;
      margin: 0;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      -webkit-font-smoothing: antialiased;
    }

    .catalog-card-container {
      position: relative;
      width: 3000px;
      height: 3000px;
      background: linear-gradient(135deg, 
        #000000 0%, 
        #1a1a1a 25%, 
        #2a2a2a 50%, 
        #1a1a1a 75%, 
        #000000 100%);
      border-radius: 0;
      padding: 6px;
      box-sizing: border-box;
      overflow: hidden;
      box-shadow: 0 0 100px rgba(255, 255, 255, 0.05);
    }

    .catalog-card-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(45deg, 
        rgba(255, 255, 255, 0.1) 0%, 
        rgba(255, 255, 255, 0.2) 25%, 
        rgba(255, 255, 255, 0.1) 50%, 
        rgba(255, 255, 255, 0.05) 75%, 
        rgba(255, 255, 255, 0.1) 100%);
      background-size: 400% 400%;
      animation: silver-glow 6s ease infinite;
      z-index: 0;
      border-radius: 0;
      margin: -6px;
    }

    @keyframes silver-glow {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    .catalog-card-inner {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #0a0a0a;
      border-radius: 0;
      z-index: 1;
      display: flex;
      flex-direction: column;
    }

    .catalog-bg-image {
      position: absolute;
      top: -7%;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
      z-index: 1;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 90%);
      -webkit-mask-image: linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 90%);
    }

    .content-section {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40%;
      padding: 120px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: linear-gradient(to top, rgba(10, 10, 10, 0.95) 60%, rgba(10, 10, 10, 0.6) 100%);
      z-index: 2;
    }

    .header {
      margin-bottom: 75px;
    }

    .header h1 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 9rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 20px;
      color: #ffffff;
      text-shadow: 0 4px 30px rgba(255, 255, 255, 0.1);
      letter-spacing: -1px;
    }

    .subtitle {
      font-size: 3.5rem;
      color: #aaaaaa;
      font-weight: 400;
      margin-bottom: 30px;
      letter-spacing: 3px;
      text-transform: uppercase;
    }

    .highlight {
      color: #ffffff;
      font-weight: 600;
      position: relative;
      display: inline-block;
    }

    .highlight::after {
      content: '';
      position: absolute;
      bottom: -10px;
      left: 0;
      width: 100%;
      height: 4px;
      background: linear-gradient(90deg, #cccccc, #888888);
      border-radius: 4px;
    }

    .accent-line {
      height: 10px;
      width: 150px;
      background: linear-gradient(90deg, #ffffff, #888888);
      margin: 35px 0;
      border-radius: 5px;
    }

    .specs-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 50px;
      margin-bottom: 75px;
    }

    .spec-item {
      background: rgba(255, 255, 255, 0.05);
      padding: 55px 40px;
      border-radius: 40px;
      text-align: center;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(40px);
      -webkit-backdrop-filter: blur(40px);
      box-shadow: 0 16px 64px rgba(0, 0, 0, 0.3), 
                  inset 0 2px 0 rgba(255, 255, 255, 0.1),
                  0 0 40px rgba(255, 255, 255, 0.1);
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .spec-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(200, 200, 200, 0.1) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: -1;
    }

    .spec-item:hover {
      transform: translateY(-10px);
      box-shadow: 0 24px 80px rgba(0, 0, 0, 0.4), 
                  inset 0 2px 0 rgba(255, 255, 255, 0.15),
                  0 0 60px rgba(255, 255, 255, 0.2);
    }

    .spec-item:hover::before {
      opacity: 1;
    }

    .spec-value {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 5rem;
      font-weight: 700;
      margin-bottom: 20px;
      color: #ffffff;
      background: linear-gradient(135deg, #ffffff 0%, #cccccc 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .spec-label {
      font-size: 2.2rem;
      color: #888888;
      text-transform: uppercase;
      font-weight: 400;
      letter-spacing: 3px;
    }

    .metal-detail {
      position: absolute;
      bottom: 50px;
      left: 50%;
      transform: translateX(-50%);
      width: 80%;
      height: 4px;
      background: linear-gradient(90deg, 
        transparent, 
        rgba(255, 255, 255, 0.5), 
        rgba(200, 200, 200, 0.8), 
        rgba(255, 255, 255, 0.5), 
        transparent);
      z-index: 2;
    }

    .reflection {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, 
        transparent 30%, 
        rgba(255, 255, 255, 0.03) 50%, 
        transparent 70%);
      transform: rotate(25deg);
      z-index: 1;
      animation: reflection-move 8s infinite linear;
    }

    @keyframes reflection-move {
      0% { transform: rotate(25deg) translateY(-100%); }
      100% { transform: rotate(25deg) translateY(100%); }
    }
  </style>
</head>
<body>
  <div class="catalog-card-container">
    <div class="reflection"></div>
    <div class="catalog-card-inner">
      <!-- Full Background Image -->
      <img src="${catalogImageUrl}" alt="${carDetails.year} ${carDetails.model}" class="catalog-bg-image" onerror="this.style.display='none';" />
      
      <!-- Content Overlay (Bottom) -->
      <div class="content-section">
        <div class="header">
          <h1>${carDetails.year} ${carDetails.model}</h1>
          <div class="accent-line"></div>
          <p class="subtitle"><span class="highlight">Premium Selection</span></p>
        </div>

        <div class="specs-grid">
          <!-- Top Row -->
          <div class="spec-item">
            <div class="spec-value">AED ${carDetails.originalPrice}</div>
            <div class="spec-label">Cash Price</div>
          </div>
          <div class="spec-item">
            <div class="spec-value">AED ${carDetails.zeroDownPayment}</div>
            <div class="spec-label">0% Down Payment</div>
          </div>
          <div class="spec-item">
            <div class="spec-value">AED ${carDetails.twentyDownPayment}</div>
            <div class="spec-label">20% Down Payment</div>
          </div>
          
          <!-- Bottom Row -->
          <div class="spec-item">
            <div class="spec-value">${carDetails.mileage} KM</div>
            <div class="spec-label">Mileage</div>
          </div>
          <div class="spec-item">
            <div class="spec-value">${carDetails.horsepower}${carDetails.horsepower !== '—' ? ' HP' : ''}</div>
            <div class="spec-label">Horsepower</div>
          </div>
          <div class="spec-item">
            <div class="spec-value">${carDetails.regionalSpecification}</div>
            <div class="spec-label">Regional</div>
          </div>
        </div>
      </div>
      
      <!-- Metal Detail -->
      <div class="metal-detail"></div>
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

    // Fetch car data with catalog information
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        advertised_price_aed,
        current_mileage_km,
        engine,
        regional_specification,
        horsepower_hp,
        monthly_0_down_aed,
        monthly_20_down_aed
      `)
      .eq('id', carId)
      .single();
      
    // Also get catalog data for standardized title
    const { data: catalogData } = await supabase
      .from('uv_catalog')
      .select('title, make, model, description')
      .eq('car_id', carId)
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

    // Prepare car details for renderer (keep original format for images - no make)
    const carDetails = {
      year: car.model_year,
      model: (car.vehicle_model || '').replace(/\bMercedes[- ]Benz\b/gi, '').replace(/\bMercedes[- ]AMG\b/gi, '').trim(), // Remove make for images
      mileage: car.current_mileage_km ? car.current_mileage_km.toLocaleString() : '0',
      stockNumber: car.stock_number,
      price: car.advertised_price_aed ? car.advertised_price_aed.toLocaleString() : '0',
      engine: car.engine || '—',
      regionalSpecification: (car.regional_specification || 'GCC SPECIFICATION').replace(/\s*SPECIFICATION/i, ''),
      horsepower: car.horsepower_hp || '—',
      originalPrice: car.advertised_price_aed ? car.advertised_price_aed.toLocaleString() : '—',
      zeroDownPayment: car.monthly_0_down_aed ? car.monthly_0_down_aed.toLocaleString() : '—',
      twentyDownPayment: car.monthly_20_down_aed ? car.monthly_20_down_aed.toLocaleString() : '—'
    };

    // Call Railway renderer service to generate catalog image (same as price drop)
    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
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
    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
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
      return NextResponse.json({ 
        error: 'Failed to save generated image',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Get public URL and replace with new domain
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(`catalog-cards/${fileName}`);
    
    // Replace old Supabase URL with new domain
    const updatedPublicUrl = publicUrl.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com');

    // Update or create UV catalog entry with generated image
    const { error: catalogUpdateError } = await supabase
      .from('uv_catalog')
      .upsert({
        car_id: carId,
        title: catalogData?.title || `${car.model_year} ${car.vehicle_model}`,
        description: catalogData?.description || `Premium ${car.model_year} ${car.vehicle_model} in excellent condition`,
        make: catalogData?.make || 'MERCEDES-BENZ',
        model: catalogData?.model || car.vehicle_model,
        year: car.model_year,
        mileage_km: car.current_mileage_km || 0,
        price_aed: car.advertised_price_aed,
        catalog_image_url: updatedPublicUrl,
        status: 'ready',
        last_generated_at: new Date().toISOString(),
        error_message: null
      }, {
        onConflict: 'car_id'
      });

    if (catalogUpdateError) {
      // Return error since catalog update is critical for frontend display
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
      carDetails
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 