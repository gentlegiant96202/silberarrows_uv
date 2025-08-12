import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Fetch all available inventory cars with their generated catalog images
    const { data: cars, error: carsError } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        model_family,
        colour,
        interior_colour,
        chassis_number,
        advertised_price_aed,
        current_mileage_km,
        description,
        key_equipment,
        engine,
        transmission,
        horsepower_hp,
        torque_nm,
        cubic_capacity_cc,
        regional_specification,
        ownership_type,
        xml_image_url,
        created_at,
        updated_at
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .order('created_at', { ascending: false });

    if (carsError) {
      console.error('Error fetching cars:', carsError);
      return NextResponse.json({ 
        error: 'Failed to fetch inventory cars', 
        details: carsError.message 
      }, { status: 500 });
    }

    if (!cars || cars.length === 0) {
      return NextResponse.json({ error: 'No inventory cars found' }, { status: 404 });
    }

    // For cars without xml_image_url, fetch their primary photos as fallback
    const carsWithoutXMLImages = cars.filter(car => !car.xml_image_url);
    let fallbackImageMap: Record<string, string> = {};

    if (carsWithoutXMLImages.length > 0) {
      const carIds = carsWithoutXMLImages.map(car => car.id);
      const { data: fallbackImages, error: fallbackError } = await supabase
        .from('car_media')
        .select('car_id, url')
        .eq('kind', 'photo')
        .eq('is_primary', true)
        .in('car_id', carIds);

      if (!fallbackError && fallbackImages) {
        fallbackImages.forEach(image => {
          fallbackImageMap[image.car_id] = image.url;
        });
      }
    }

    // Generate enhanced XML feed
    const xmlContent = generatePublicXMLFeed(cars, fallbackImageMap);

    // Save XML to Supabase Storage for public access
    const fileName = `uv-catalog-${new Date().toISOString().split('T')[0]}.xml`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(`xml-feeds/${fileName}`, xmlContent, {
        contentType: 'application/xml',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to save XML feed',
        details: uploadError.message 
      }, { status: 500 });
    }

    // Also save as latest.xml for consistent URL
    const { error: latestError } = await supabase.storage
      .from('media-files')
      .upload('xml-feeds/latest.xml', xmlContent, {
        contentType: 'application/xml',
        cacheControl: '3600',
        upsert: true
      });

    if (latestError) {
      console.error('Latest XML upload error:', latestError);
    }

    // Get public URLs
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(`xml-feeds/${fileName}`);

    const { data: { publicUrl: latestUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl('xml-feeds/latest.xml');

    return NextResponse.json({
      success: true,
      message: 'Public XML feed generated successfully',
      publicUrl,
      latestUrl,
      carsCount: cars.length,
      fileName
    });

  } catch (error) {
    console.error('Error generating public XML feed:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for direct XML feed access
  return POST(request);
}

function generatePublicXMLFeed(cars: any[], fallbackImageMap: Record<string, string>): string {
  const currentDate = new Date().toISOString();
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<listings>
  <title>SilberArrows UV Vehicle Catalog</title>`;

  cars.forEach(car => {
    // Extract make and model from vehicle_model
    const modelParts = car.vehicle_model?.split(' ') || [];
    const make = modelParts[0] || 'Unknown';
    const model = modelParts.slice(1).join(' ') || car.vehicle_model || 'Unknown';
    
    // Determine body style based on model name
    const bodyStyle = determineBodyStyle(car.vehicle_model || '');
    
    // Determine state of vehicle
    const stateOfVehicle = car.current_mileage_km && car.current_mileage_km > 100 ? 'USED' : 'NEW';
    
    // Generate description
    const description = generateVehicleDescription(car);
    
    // Generate URL (placeholder for now)
    const vehicleUrl = `https://silberarrows.com/inventory/${car.stock_number}`;
    
    // Get image URL (prefer xml_image_url, fallback to primary photo)
    const imageUrl = car.xml_image_url || 
                    fallbackImageMap[car.id] || 
                    'https://placehold.co/800x600/000000/FFFFFF/png?text=No+Image';

    xml += `
  <listing>
    <image>
      <url>${escapeXml(imageUrl)}</url>
      <tag>Primary</tag>
    </image>
    <vehicle_id>${escapeXml(car.stock_number || car.id)}</vehicle_id>
    <description>${escapeXml(description)}</description>
    <url>${escapeXml(vehicleUrl)}</url>
    <title>${escapeXml(`${car.model_year} ${car.vehicle_model}`)}</title>
    <body_style>${escapeXml(bodyStyle)}</body_style>
    <price>${car.advertised_price_aed || 0}.00 AED</price>
    <state_of_vehicle>${stateOfVehicle}</state_of_vehicle>
    <make>${escapeXml(make)}</make>
    <model>${escapeXml(model)}</model>
    <year>${car.model_year || ''}</year>
    <mileage>
      <unit>KM</unit>
      <value>${car.current_mileage_km || 0}</value>
    </mileage>
    <address format="simple">
      <component name="addr1">SilberArrows Showroom</component>
      <component name="addr2">Premium Used Cars</component>
      <component name="addr3">Ground Floor</component>
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
    <custom_number_4>${car.chassis_number || ''}</custom_number_4>
    <product_tags>luxury</product_tags>
    <product_tags>premium</product_tags>
    ${car.ownership_type === 'consignment' ? '<product_tags>consignment</product_tags>' : ''}
    ${car.regional_specification ? `<product_tags>${escapeXml(car.regional_specification.toLowerCase())}</product_tags>` : ''}
  </listing>`;
  });

  xml += `
</listings>`;

  return xml;
}

function determineBodyStyle(vehicleModel: string): string {
  const model = vehicleModel.toLowerCase();
  
  if (model.includes('convertible') || model.includes('cabriolet') || model.includes('roadster')) {
    return 'CONVERTIBLE';
  } else if (model.includes('coupe') || model.includes('coupé')) {
    return 'COUPE';
  } else if (model.includes('suv') || model.includes('x1') || model.includes('x3') || model.includes('x5') || model.includes('x7') || 
           model.includes('q3') || model.includes('q5') || model.includes('q7') || model.includes('q8') || 
           model.includes('gle') || model.includes('glc') || model.includes('gls') || model.includes('gla')) {
    return 'SUV';
  } else if (model.includes('wagon') || model.includes('estate') || model.includes('touring')) {
    return 'WAGON';
  } else if (model.includes('sedan') || model.includes('saloon')) {
    return 'SEDAN';
  } else if (model.includes('hatchback') || model.includes('hatch')) {
    return 'HATCHBACK';
  } else if (model.includes('pickup') || model.includes('truck')) {
    return 'PICKUP';
  } else if (model.includes('van')) {
    return 'VAN';
  }
  
  // Default fallback
  return 'SEDAN';
}

function generateVehicleDescription(car: any): string {
  let description = `${car.model_year} ${car.vehicle_model}`;
  
  if (car.colour) {
    description += ` in ${car.colour}`;
  }
  
  if (car.interior_colour) {
    description += ` with ${car.interior_colour} interior`;
  }
  
  if (car.current_mileage_km) {
    description += `, ${car.current_mileage_km.toLocaleString()} km`;
  }
  
  if (car.engine) {
    description += `, ${car.engine} engine`;
  }
  
  if (car.transmission) {
    description += `, ${car.transmission} transmission`;
  }
  
  if (car.horsepower_hp) {
    description += `, ${car.horsepower_hp} HP`;
  }
  
  if (car.regional_specification) {
    description += `, ${car.regional_specification} specification`;
  }
  
  if (car.description) {
    description += `. ${car.description}`;
  } else {
    description += '. Premium vehicle available at SilberArrows.';
  }
  
  if (car.key_equipment) {
    description += ` Key features: ${car.key_equipment}`;
  }
  
  return description;
}

function escapeXml(unsafe: string): string {
  if (!unsafe) return '';
  
  return unsafe.replace(/[<>&'"]/g, function (c) {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
} 