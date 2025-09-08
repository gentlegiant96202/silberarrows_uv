import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Fetching cars table schema...');

    // Get table columns information
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'cars' })
      .catch(async () => {
        // Fallback: Query information_schema directly
        const { data, error } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default')
          .eq('table_name', 'cars')
          .eq('table_schema', 'public')
          .order('ordinal_position');
        return { data, error };
      });

    if (columnsError) {
      console.error('❌ Error fetching columns:', columnsError);
      
      // Alternative approach: Get a sample record to infer structure
      const { data: sampleCar, error: sampleError } = await supabase
        .from('cars')
        .select('*')
        .limit(1)
        .single();

      if (sampleError) {
        return NextResponse.json({ 
          error: 'Could not fetch table structure',
          details: columnsError.message 
        }, { status: 500 });
      }

      // Return sample car structure
      const structure = Object.keys(sampleCar || {}).map(key => ({
        column_name: key,
        data_type: typeof sampleCar[key],
        sample_value: sampleCar[key],
        is_null: sampleCar[key] === null
      }));

      return NextResponse.json({
        success: true,
        method: 'sample_record_analysis',
        table_name: 'cars',
        columns: structure,
        sample_record: sampleCar
      });
    }

    // Get table constraints/indexes if possible
    const { data: constraints } = await supabase
      .from('information_schema.table_constraints')
      .select('constraint_name, constraint_type')
      .eq('table_name', 'cars')
      .eq('table_schema', 'public')
      .catch(() => ({ data: null }));

    // Get a sample record for reference
    const { data: sampleCar } = await supabase
      .from('cars')
      .select('*')
      .limit(1)
      .single()
      .catch(() => ({ data: null }));

    console.log('✅ Successfully fetched cars table schema');

    return NextResponse.json({
      success: true,
      method: 'information_schema',
      table_name: 'cars',
      columns: columns || [],
      constraints: constraints || [],
      sample_record: sampleCar,
      column_count: columns?.length || 0
    });

  } catch (error: any) {
    console.error('❌ Schema fetch error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch table schema',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
