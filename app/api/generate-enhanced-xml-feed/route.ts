import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Fetch all available inventory cars with their primary images
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

    // Fetch primary images for all cars [[memory:5456998]]
    const carIds = cars.map(car => car.id);
    const { data: images, error: imagesError } = await supabase
      .from('car_media')
      .select('car_id, url')
      .eq('kind', 'photo')
      .eq('is_primary', true)
      .in('car_id', carIds);

    if (imagesError) {
      console.error('Error fetching car images:', imagesError);
    }

    // Create image map
    const imageMap: Record<string, string> = {};
    images?.forEach(image => {
      imageMap[image.car_id] = image.url;
    });

    // Generate enhanced XML feed matching user's format
    const xmlContent = generateEnhancedXMLFeed(cars, imageMap);

    return new NextResponse(xmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml',
        'Content-Disposition': 'attachment; filename="uv-catalog-feed.xml"',
      },
    });

  } catch (error) {
    console.error('Error generating enhanced XML feed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // Support GET requests for direct XML feed access
  return POST(request);
}

function generateEnhancedXMLFeed(cars: any[], imageMap: Record<string, string>): string {
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
    
    // Get primary image
    const imageUrl = imageMap[car.id] || 'https://placehold.co/800x600/000000/FFFFFF/png?text=No+Image';

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