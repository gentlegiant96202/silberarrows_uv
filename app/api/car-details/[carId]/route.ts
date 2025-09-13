import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    
    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }

    console.log('🚗 API: Loading car details for ID:', carId);

    // Get full car details using admin client (bypasses RLS)
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError) {
      console.error('❌ API: Error loading car details:', carError);
      return NextResponse.json({ error: carError.message }, { status: 500 });
    }

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    console.log('✅ API: Loaded car details for:', car.stock_number);

    return NextResponse.json({
      success: true,
      car
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to load car details' },
      { status: 500 }
    );
  }
}
