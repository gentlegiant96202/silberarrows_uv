import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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
        car_media!inner(url, kind, sort_order)
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .eq('car_media.kind', 'photo')
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

    // Format data for extension consumption
    const formattedCar = {
      id: car.id,
      stockNumber: car.stock_number,
      year: car.model_year,
      make: 'Mercedes-Benz', // Assuming all cars are Mercedes
      model: car.vehicle_model,
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
      ownership: car.ownership_type,
      keys: car.number_of_keys,
      fuelLevel: car.fuel_level,
      monthlyPayment0Down: car.monthly_0_down_aed,
      monthlyPayment20Down: car.monthly_20_down_aed,
      images: car.car_media?.map((media: any) => media.url) || []
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
    console.log('🔌 Extension API: Listing available cars...');

    // Fetch all available cars for the extension dropdown
    const { data: cars, error } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        colour,
        advertised_price_aed
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .order('model_year', { ascending: false })
      .order('vehicle_model');

    if (error) {
      console.error('❌ Extension API: Error fetching car list:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Extension API: Successfully fetched ${cars?.length || 0} available cars`);

    const formattedCars = cars?.map(car => ({
      id: car.id,
      stockNumber: car.stock_number,
      displayName: `${car.model_year} ${car.vehicle_model} - ${car.colour} (${car.stock_number})`,
      price: car.advertised_price_aed
    })) || [];

    return NextResponse.json({
      success: true,
      cars: formattedCars
    });

  } catch (error) {
    console.error('❌ Extension API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch car list' },
      { status: 500 }
    );
  }
}
