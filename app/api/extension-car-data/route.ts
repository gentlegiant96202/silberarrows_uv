import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for extension API to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const stockNumber = searchParams.get('stock');
    const carId = searchParams.get('id');

    console.log('🔌 Extension API: Fetching car data...', { stockNumber, carId });

    if (!stockNumber && !carId) {
      return NextResponse.json(
        { error: 'Either stock number or car ID is required' },
        { status: 400 }
      );
    }

    // Build query based on available parameters
    let query = supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        colour,
        interior_colour,
        chassis_number,
        advertised_price_aed,
        current_mileage_km,
        engine,
        transmission,
        horsepower_hp,
        torque_nm,
        cubic_capacity_cc,
        key_equipment,
        description,
        regional_specification,
        ownership_type,
        number_of_keys,
        fuel_level,
        monthly_0_down_aed,
        monthly_20_down_aed,
        body_style,
        current_service,
        model_family,
        current_warranty,
        car_media(url, kind, sort_order)
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .order('sort_order', { ascending: true, foreignTable: 'car_media' });

    if (stockNumber) {
      query = query.eq('stock_number', stockNumber);
    } else if (carId) {
      query = query.eq('id', carId);
    }

    const { data: cars, error } = await query;

    if (error) {
      console.error('❌ Extension API: Error fetching car:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!cars || cars.length === 0) {
      return NextResponse.json(
        { error: 'Car not found or not available' },
        { status: 404 }
      );
    }

    const car = cars[0];
    console.log(`✅ Extension API: Successfully fetched car ${car.stock_number}`);

    // Parse ServiceCare pricing from current_service text
    const parseServiceCare = (serviceText: string) => {
      const serviceCare2YrMatch = serviceText?.match(/2yr:\s*AED\s*(\d+)/i);
      const serviceCare4YrMatch = serviceText?.match(/4yr:\s*AED\s*(\d+)/i);
      
      return {
        serviceCare2Year: serviceCare2YrMatch ? parseInt(serviceCare2YrMatch[1]) : null,
        serviceCare4Year: serviceCare4YrMatch ? parseInt(serviceCare4YrMatch[1]) : null
      };
    };

    // Parse warranty information from current_warranty text
    const parseWarranty = (warrantyText: string) => {
      if (!warrantyText) return { type: 'standard', date: null, kmLimit: null };
      
      // Check for SilberArrows warranty -> Extended warranty (no date/mileage)
      if (warrantyText.toLowerCase().includes('silberarrows')) {
        return { type: 'extended', date: null, kmLimit: null };
      }
      
      // Check for dealer warranty -> Standard/Manufacturer warranty (with date and mileage)
      const dealerMatch = warrantyText.match(/Dealer warranty until (.+?) or (\d+) km/i);
      if (dealerMatch) {
        return {
          type: 'standard', // Dealer warranty maps to standard/manufacturer warranty
          date: dealerMatch[1].trim(),
          kmLimit: parseInt(dealerMatch[2])
        };
      }
      
      return { type: 'standard', date: null, kmLimit: null };
    };

    const serviceCareData = parseServiceCare(car.current_service || '');
    const warrantyData = parseWarranty(car.current_warranty || '');

    // Format data for extension consumption
    const formattedCar = {
      id: car.id,
      stockNumber: car.stock_number,
      year: car.model_year,
      make: 'Mercedes-Benz', // Assuming all cars are Mercedes
      title: `${car.model_year || 'Unknown'} Mercedes-Benz ${(car.vehicle_model || 'Unknown Model').replace(/^\d{4}\s+/, '')}`, // Create title from year, make, model
      model: (car.vehicle_model || 'Unknown Model').replace(/^\d{4}\s+/, ''), // Remove year prefix from model
      color: car.colour,
      interiorColor: car.interior_colour,
      chassis: car.chassis_number,
      price: car.advertised_price_aed,
      mileage: car.current_mileage_km,
      engine: car.engine,
      transmission: car.transmission,
      horsepower: car.horsepower_hp,
      torque: car.torque_nm,
      displacement: car.cubic_capacity_cc,
      keyEquipment: car.key_equipment,
      description: car.description,
      specification: car.regional_specification,
      regionalSpec: car.regional_specification || 'GCC SPECIFICATION', // For Dubizzle field mapping
      ownership: car.ownership_type,
      keys: car.number_of_keys,
      fuelLevel: car.fuel_level,
      monthlyPayment0Down: car.monthly_0_down_aed,
      monthlyPayment20Down: car.monthly_20_down_aed,
      bodyStyle: car.body_style,
      modelFamily: car.model_family,
      fuelType: 'Petrol', // Default for Mercedes-Benz (fuel_type column doesn't exist)
      warrantyType: warrantyData.type,
      warrantyDate: warrantyData.date,
      warrantyKmLimit: warrantyData.kmLimit,
      serviceCare2Year: serviceCareData.serviceCare2Year,
      serviceCare4Year: serviceCareData.serviceCare4Year,
      // Service package field for SilberArrows website
      servicePackage: car.current_service && car.current_service.toLowerCase().includes('silberarrows') 
        ? 'Available' 
        : (car.current_service ? `${warrantyData.date} / ${warrantyData.kmLimit}` : ''),
      images: car.car_media?.filter((media: any) => media.kind === 'photo').map((media: any) => {
        // Use storage proxy for extension to avoid CORS issues
        if (media.url?.includes('database.silberarrows.com') || media.url?.includes('.supabase.co')) {
          return `/api/storage-proxy?url=${encodeURIComponent(media.url)}`;
        }
        return media.url;
      }) || [],
      // Dubizzle-specific fields
      location: 'Dubai', // Default location for UAE
      sellerType: 'Dealer', // Default seller type
      // Format price for dubizzle (no currency symbol)
      priceNumeric: parseInt(car.advertised_price_aed.toString().replace(/[^\d]/g, '')),
      // Additional Dubizzle fields
      doors: '4', // Default to 4 doors (not in DB)
      seatingCapacity: '5', // Default to 5 seats (not in DB)
      steeringSide: 'Left', // Default for UAE
      targetMarket: 'GCC', // Default for regional spec
      phoneNumber: '+971561742746', // Default phone number
      whatsappNumber: '+971561742746', // Default WhatsApp number
      view360: '' // 360 tour URL (empty by default)
    };

    return NextResponse.json({
      success: true,
      car: formattedCar
    });

  } catch (error) {
    console.error('❌ Extension API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const timestamp = new Date().toISOString();
    console.log(`🔌 Extension API: Listing ALL KANBAN cars (NO LIMIT)... (${timestamp})`);

    // Debug: Check what cars exist in production
    const { data: allCars, error: allError } = await supabase
      .from('cars')
      .select('id, stock_number, status, sale_status')
      .limit(20);
    
    console.log('🔍 PRODUCTION DEBUG: Sample cars:', allCars);
    console.log('🔍 PRODUCTION DEBUG: Error:', allError);
    
    // Show status distribution
    const statusCounts = allCars?.reduce((acc: any, car: any) => {
      const key = `${car.status}/${car.sale_status}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    console.log('🔍 PRODUCTION DEBUG: Status distribution:', statusCounts);

    // Fetch all cars in kanban (inventory status with any sale_status)
    const { data: cars, error } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        colour,
        advertised_price_aed,
        sale_status
      `)
      .eq('status', 'inventory') // All kanban cars have status='inventory'
      .in('sale_status', ['available', 'reserved', 'sold', 'returned', 'archived'])
      // No limit - show ALL kanban cars
      .order('sale_status') // Order by sale_status first
      .order('model_year', { ascending: false })
      .order('vehicle_model');

    if (error) {
      console.error('❌ Extension API: Error fetching car list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Extension API: Successfully fetched ${cars?.length || 0} kanban cars`);
    
    // Debug: Log the actual cars being returned
    console.log('🔍 EXTENSION DEBUG: Cars being returned to extension:');
    cars?.forEach(car => {
      console.log(`  - ${car.stock_number}: ${car.model_year} ${car.vehicle_model} (status: inventory, sale_status: ${car.sale_status})`);
    });

    const formattedCars = cars?.map(car => ({
      id: car.id,
      stockNumber: car.stock_number,
      displayName: `${car.model_year} ${car.vehicle_model} - ${car.colour} (${car.stock_number}) [${car.sale_status?.toUpperCase()}]`,
      price: car.advertised_price_aed,
      saleStatus: car.sale_status
    })) || [];

    return NextResponse.json({
      success: true,
      cars: formattedCars,
      version: "ALL_KANBAN_CARS_UNLIMITED_v3", // Version identifier
      timestamp: new Date().toISOString(),
      debug: {
        totalKanbanCars: cars?.length || 0,
        sampleCars: allCars?.map(c => ({ stock: c.stock_number, status: c.status, sale_status: c.sale_status })) || [],
        kanbanCarsByStatus: cars?.reduce((acc: any, car: any) => {
          acc[car.sale_status] = (acc[car.sale_status] || 0) + 1;
          return acc;
        }, {}) || {},
        hasError: !!error,
        allCarsError: allError?.message
      }
    });

  } catch (error) {
    console.error('❌ Extension API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car list' },
      { status: 500 }
    );
  }
}