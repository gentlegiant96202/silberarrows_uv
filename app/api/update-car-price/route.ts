import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carId, newPrice } = body;

    if (!carId || !newPrice) {
      return NextResponse.json(
        { error: 'Car ID and new price are required' },
        { status: 400 }
      );
    }

    // Update the car's advertised price
    const { data, error } = await supabase
      .from('cars')
      .update({ 
        advertised_price_aed: newPrice,
        updated_at: new Date().toISOString()
      })
      .eq('id', carId)
      .select('id, stock_number, advertised_price_aed');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update car price' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      car: data[0]
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 