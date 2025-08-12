import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Fetch all available inventory cars
    const { data: cars, error } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        advertised_price_aed,
        colour,
        current_mileage_km,
        monthly_20_down_aed,
        xml_image_url,
        created_at,
        updated_at
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available');

    if (error) {
      console.error('Error fetching cars:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch inventory cars', 
        details: error.message 
      }, { status: 500 });
    }

    if (!cars || cars.length === 0) {
      return NextResponse.json({ error: 'No inventory cars found' }, { status: 404 });
    }

    // Get primary images for cars that don't have xml_image_url
    const carIds = cars.map(car => car.id);
    const { data: primaryImages } = await supabase
      .from('car_media')
      .select('car_id, url')
      .eq('kind', 'photo')
      .eq('is_primary', true)
      .in('car_id', carIds);

    // Create image lookup map
    const imageMap = new Map();
    primaryImages?.forEach(img => {
      imageMap.set(img.car_id, img.url);
    });

    // Generate XML feed
    const xmlContent = generateXMLFeed(cars, imageMap);

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="inventory-feed.xml"',
      },
    });

  } catch (error) {
    console.error('Error generating XML feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for direct XML feed access
  return POST(request);
}

function generateXMLFeed(cars: any[], imageMap: Map<string, string>): string {
  const currentDate = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<inventory_feed>
  <metadata>
    <generated_at>${currentDate}</generated_at>
    <total_cars>${cars.length}</total_cars>
    <source>SilberArrows CRM</source>
  </metadata>
  <cars>`;

  cars.forEach(car => {
    // Extract make and model from vehicle_model
    const modelParts = car.vehicle_model?.split(' ') || [];
    const make = modelParts[0] || '';
    const model = modelParts.slice(1).join(' ') || '';

    // Get image URL (prefer xml_image_url, fallback to primary image)
    const imageUrl = car.xml_image_url || imageMap.get(car.id) || '';

    xml += `
    <car>
      <id>${car.id}</id>
      <stock_number>${escapeXml(car.stock_number || '')}</stock_number>
      <make>${escapeXml(make)}</make>
      <model>${escapeXml(model)}</model>
      <year>${car.model_year || ''}</year>
      <price currency="AED">${car.advertised_price_aed || 0}</price>
      <monthly_payment currency="AED">${car.monthly_20_down_aed || 0}</monthly_payment>
      <color>${escapeXml(car.colour || '')}</color>
      <mileage_km>${car.current_mileage_km || 0}</mileage_km>
      <image_url>${escapeXml(imageUrl)}</image_url>
      <created_at>${car.created_at || ''}</created_at>
      <updated_at>${car.updated_at || ''}</updated_at>
    </car>`;
  });

  xml += `
  </cars>
</inventory_feed>`;

  return xml;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
} 