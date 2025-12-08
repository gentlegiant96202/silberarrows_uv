import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    
    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }
    // Get full car details using admin client (bypasses RLS)
    const { data: car, error: carError } = await supabaseAdmin
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError) {
      return NextResponse.json({ error: carError.message }, { status: 500 });
    }

    if (!car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      car
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load car details' },
      { status: 500 }
    );
  }
}
