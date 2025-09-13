import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🚗 API: Fetching inventory cars...');

    // Fetch available cars from inventory with social media images
    const { data: cars, error } = await supabaseAdmin
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
        monthly_20_down_aed,
        monthly_0_down_aed,
        current_mileage_km,
        engine,
        transmission,
        horsepower_hp,
        key_equipment,
        description,
        car_media(url, kind, sort_order)
      `)
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .order('model_year', { ascending: false })
      .order('vehicle_model');

    if (error) {
      console.error('❌ API: Error fetching cars:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform image URLs to use custom domain and filter for social media images
    const transformedCars = cars?.map(car => ({
      ...car,
      car_media: car.car_media
        ?.filter((media: any) => media.kind === 'social_media') // Only get social media images
        ?.map((media: any) => ({
          ...media,
          url: media.url?.replace('rrxfvdtubynlsanplbta.supabase.co', 'database.silberarrows.com') || media.url
        })) || []
    }))?.filter(car => car.car_media && car.car_media.length > 0) || []; // Only include cars with social media images

    console.log(`✅ API: Successfully fetched ${transformedCars.length} inventory cars with transformed URLs`);

    return NextResponse.json({
      success: true,
      cars: transformedCars
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory cars' },
      { status: 500 }
    );
  }
}
