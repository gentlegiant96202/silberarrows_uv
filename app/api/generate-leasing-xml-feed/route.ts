import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🌐 Generating Facebook leasing catalog XML feed...');

    // Fetch all vehicles from Leasing catalog that are ready with catalog images
    const { data: catalogEntries, error: catalogError } = await supabase
      .from('leasing_catalog')
      .select(`
        id,
        vehicle_id,
        title,
        description,
        catalog_image_url,
        status,
        make,
        model,
        year,
        mileage_km,
        price_aed,
        body_style,
        state_of_vehicle,
        url,
        address_line1,
        address_line2,
        city,
        region,
        country,
        postal_code,
        latitude,
        longitude,
        neighborhood
      `)
      .eq('status', 'ready')
      .not('catalog_image_url', 'is', null);

    if (catalogError) {
      console.error('Error fetching catalog entries:', catalogError);
      return NextResponse.json({ error: 'Failed to fetch catalog entries' }, { status: 500 });
    }

    // Fetch vehicle details with stock numbers
    const vehicleIds = catalogEntries?.map(entry => entry.vehicle_id) || [];
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('leasing_inventory')
      .select('id, stock_number, status')
      .in('id', vehicleIds)
      .eq('status', 'inventory');

    if (vehiclesError) {
      console.error('Error fetching vehicle details:', vehiclesError);
    }

    // Create a map of vehicle_id to stock_number
    const vehicleMap = new Map(vehicles?.map(v => [v.id, v.stock_number]) || []);

    // Filter valid entries that are available
    const validEntries = catalogEntries?.filter(entry => 
      entry.catalog_image_url &&
      entry.price_aed > 0 &&
      vehicleMap.has(entry.vehicle_id)
    ) || [];

    console.log(`Found ${validEntries.length} ready leasing catalog entries with images`);

    // Generate Facebook automotive XML format
    const xmlContent = generateFacebookLeasingXML(validEntries, vehicleMap);

    // Upload to Supabase storage for permanent public URL
    const fileName = `xml-feeds/leasing-facebook-public-${new Date().toISOString().slice(0, 10)}.xml`;
    
    const { error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(fileName, xmlContent, {
        contentType: 'application/xml',
        upsert: true,
        cacheControl: '0'
      });

    if (uploadError) {
      console.error('Error uploading XML to storage:', uploadError);
    } else {
      // Also update the latest.xml file for permanent URL with cache busting
      await supabase.storage
        .from('media-files')
        .upload('xml-feeds/leasing-facebook-latest.xml', xmlContent, {
          contentType: 'application/xml',
          upsert: true,
          cacheControl: '0'
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
    console.error('Error generating XML feed:', error);
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

function generateFacebookLeasingXML(entries: any[], vehicleMap: Map<string, string>): string {
  const listings = entries.map(entry => {
    // Get stock number from vehicle map
    const stockNumber = vehicleMap.get(entry.vehicle_id) || entry.vehicle_id;
    
    // Clean and format description
    const description = entry.description || `${entry.year} ${entry.make} ${entry.model} available for lease. Monthly rate starting from AED ${entry.price_aed}. Contact SilberArrows for more details.`;
    
    // Clean description for XML (escape special characters)
    const cleanDescription = description
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Use actual AED price (monthly lease rate)
    const priceAED = entry.price_aed;

    // Body style from database, default to SEDAN if not available
    const bodyStyle = entry.body_style || 'SEDAN';

    // State of vehicle (NEW or USED)
    const stateOfVehicle = entry.state_of_vehicle || 'USED';

    // URL to vehicle showroom page
    const vehicleUrl = entry.url || `https://portal.silberarrows.com/leasing/showroom/${entry.vehicle_id}`;

    // Address components
    const addr1 = entry.address_line1 || 'Sheikh Zayed Road';
    const addr2 = entry.address_line2 || 'Dubai';
    const city = entry.city || 'Dubai';
    const region = entry.region || 'Dubai';
    const country = entry.country || 'United Arab Emirates';
    const postalCode = entry.postal_code || '00000';
    const latitude = entry.latitude || 25.2048;
    const longitude = entry.longitude || 55.2708;
    const neighborhood = entry.neighborhood || 'Dubai';

    // Replace Supabase URL with custom domain
    const imageUrl = entry.catalog_image_url?.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com') || entry.catalog_image_url;

    return `  <listing>
    <image>
      <url>${imageUrl}</url>
      <tag>Primary</tag>
    </image>
    <vehicle_id>${stockNumber}</vehicle_id>
    <description>${cleanDescription}</description>
    <url>${vehicleUrl}</url>
    <title>${entry.year} ${entry.make} ${entry.model}</title>
    <availability>in stock</availability>
    <body_style>${bodyStyle}</body_style>
    <mileage>
      <unit>KM</unit>
      <value>${entry.mileage_km || 0}</value>
    </mileage>
    <price>${priceAED.toFixed(2)} AED</price>
    <address format="simple">
      <component name="addr1">${addr1}</component>
      <component name="addr2">${addr2}</component>
      <component name="addr3">Showroom</component>
      <component name="unit_number">1</component>
      <component name="city">${city}</component>
      <component name="city_id">DXB</component>
      <component name="region">${region}</component>
      <component name="province">${region}</component>
      <component name="postal_code">${postalCode}</component>
      <component name="country">${country}</component>
    </address>
    <latitude>${latitude}</latitude>
    <longitude>${longitude}</longitude>
    <neighborhood>${neighborhood}</neighborhood>
    <state_of_vehicle>${stateOfVehicle}</state_of_vehicle>
    <make>${entry.make}</make>
    <model>${entry.model}</model>
    <year>${entry.year}</year>
    <custom_number_4>${stockNumber}</custom_number_4>
    <product_tags>luxury</product_tags>
    <product_tags>lease</product_tags>
    <product_tags>mercedes-benz</product_tags>
  </listing>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<listings>
  <title>SilberArrows Leasing Catalog - Dubai</title>
${listings}
</listings>`;
}

