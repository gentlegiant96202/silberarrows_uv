import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request: NextRequest) {
  try {
    console.log('🚗 API: Fetching inventory cars...');

    // Fetch available cars from inventory with social media images
    const { data: cars, error } = await supabase
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
        key_equipment,
        description,
        car_media!inner(url, kind, sort_order)
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .eq('car_media.kind', 'social_media')
      .order('model_year', { ascending: false })
      .order('vehicle_model');

    if (error) {
      console.error('❌ API: Error fetching cars:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ API: Successfully fetched ${cars?.length || 0} inventory cars`);

    return NextResponse.json({
      success: true,
      cars: cars || []
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory cars' },
      { status: 500 }
    );
  }
}
