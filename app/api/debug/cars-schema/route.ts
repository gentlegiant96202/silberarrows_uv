import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    // Get a sample record to infer structure (simpler approach)
    const { data: sampleCar, error: sampleError } = await supabase
      .from('cars')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      return NextResponse.json({ 
        error: 'Could not fetch table structure',
        details: sampleError.message 
      }, { status: 500 });
    }

    // Return sample car structure
    const columns = Object.keys(sampleCar || {}).map(key => ({
      column_name: key,
      data_type: typeof sampleCar[key],
      sample_value: sampleCar[key],
      is_null: sampleCar[key] === null
    }));
    return NextResponse.json({
      success: true,
      method: 'sample_record_analysis',
      table_name: 'cars',
      columns,
      sample_record: sampleCar,
      column_count: columns.length
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch table schema',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
