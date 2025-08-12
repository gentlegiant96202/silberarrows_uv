import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🚗 Generating Facebook automotive catalog XML feed (Enhanced)...');

    // Fetch all cars from UV catalog with detailed information
    const { data: catalogEntries, error: catalogError } = await supabase
      .from('uv_catalog')
      .select(`
        id,
        car_id,
        title,
        description,
        catalog_image_url,
        status,
        cars!inner (
          id,
          stock_number,
          model_year,
          vehicle_model,
          advertised_price_aed,
          colour,
          current_mileage_km,
          regional_specification,
          engine,
          transmission,
          horsepower_hp,
          website_url,
          status,
          sale_status
        )
      `)
      .eq('cars.status', 'inventory')
      .eq('cars.sale_status', 'available');

    if (catalogError) {
      console.error('Error fetching catalog entries:', catalogError);
      return NextResponse.json({ error: 'Failed to fetch catalog entries' }, { status: 500 });
    }

    // For enhanced feed, get primary images for cars that don't have catalog images
    const carIds = catalogEntries?.map(entry => entry.car_id) || [];
    const { data: mediaData } = await supabase
      .from('car_media')
      .select('car_id, url')
      .eq('kind', 'photo')
      .eq('is_primary', true)
      .in('car_id', carIds);

    // Create image lookup
    const imageMap = new Map();
    mediaData?.forEach(media => {
      imageMap.set(media.car_id, media.url);
    });

    const validEntries = catalogEntries?.filter(entry => {
      const imageUrl = entry.catalog_image_url || imageMap.get(entry.car_id);
      const car = entry.cars as any; // Type assertion to fix build error
      return car && 
             imageUrl &&
             car.advertised_price_aed > 0;
    }) || [];

    console.log(`Found ${validEntries.length} catalog entries with images`);

    // Generate Facebook automotive XML format
    const xmlContent = generateFacebookXML(validEntries, imageMap);

    // Upload to Supabase storage for permanent public URL
    const fileName = `xml-feeds/facebook-enhanced-${new Date().toISOString().slice(0, 10)}.xml`;
    
    const { error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(fileName, xmlContent, {
        contentType: 'application/xml',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading enhanced XML to storage:', uploadError);
    } else {
      // Also update the latest.xml file for permanent URL
      await supabase.storage
        .from('media-files')
        .upload('xml-feeds/facebook-enhanced-latest.xml', xmlContent, {
          contentType: 'application/xml',
          upsert: true
        });
    }

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Error generating enhanced XML feed:', error);
    return NextResponse.json({ 
      error: 'Failed to generate XML feed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Also support POST for backward compatibility
export async function POST(request: NextRequest) {
  return GET(request);
}

function generateFacebookXML(entries: any[], imageMap: Map<string, string>): string {
  const listings = entries.map(entry => {
    const car = entry.cars;
    
    // Get image URL (prefer catalog image, fallback to primary image)
    const imageUrl = entry.catalog_image_url || imageMap.get(entry.car_id) || '';
    
    // Extract make and model from vehicle_model field
    const vehicleModel = car.vehicle_model || '';
    const modelParts = vehicleModel.split(' ');
    const make = modelParts[0] || 'Unknown';
    const model = modelParts.slice(1).join(' ') || vehicleModel;
    
    // Clean and format description
    const description = entry.description || `${car.model_year} ${vehicleModel} in ${car.colour}. ${car.regional_specification || 'GCC SPECIFICATION'}. Contact SilberArrows for more details.`;
    
    // Clean description for XML
    const cleanDescription = description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Format price in USD (Facebook prefers USD)
    const priceUSD = Math.round(car.advertised_price_aed / 3.67); // AED to USD conversion

    // Default body style to SEDAN since we don't have this field
    const bodyStyle = 'SEDAN';

    // Add status indicator for enhanced feed
    const statusTag = entry.status === 'ready' ? 'ready' : 'draft';

    return `    <listing>
      <image>
        <url>${imageUrl}</url>
        <tag>Primary</tag>
      </image>
      <vehicle_id>${car.stock_number || car.id}</vehicle_id>
      <description>${cleanDescription}</description>
      <url>${car.website_url || 'https://silberarrows.com/inventory/' + car.id}</url>
      <title>${car.model_year} ${make} ${model}</title>
      <body_style>${bodyStyle}</body_style>
      <price>${priceUSD}.00 USD</price>
      <state_of_vehicle>USED</state_of_vehicle>
      <make>${make}</make>
      <model>${model}</model>
      <year>${car.model_year}</year>
      <mileage>
        <unit>KM</unit>
        <value>${car.current_mileage_km || 0}</value>
      </mileage>
      <address format="simple">
        <component name="addr1">SilberArrows Premium Used Cars</component>
        <component name="addr2">Ground Floor</component>
        <component name="addr3">Showroom</component>
        <component name="unit_number">1</component>
        <component name="city">Dubai</component>
        <component name="city_id">DXB</component>
        <component name="region">Dubai</component>
        <component name="province">UAE</component>
        <component name="postal_code">00000</component>
        <component name="country">United Arab Emirates</component>
      </address>
      <latitude>25.2048</latitude>
      <longitude>55.2708</longitude>
      <neighborhood>Business Bay</neighborhood>
      <custom_number_4>${car.stock_number || car.id}</custom_number_4>
      <product_tags>luxury</product_tags>
      <product_tags>premium</product_tags>
      <product_tags>used</product_tags>
      <product_tags>${statusTag}</product_tags>
      <product_tags>${car.regional_specification?.toLowerCase() || 'gcc'}</product_tags>
    </listing>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <title>SilberArrows Premium Used Cars - Dubai (Enhanced)</title>
${listings}
</listings>`;
} 