import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function GET(req: NextRequest) {
  try {
    // Get table structure
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('get_table_columns', { table_name: 'content_pillars' });
    
    if (columnsError) {
      // Fallback: try to query the table directly
      const { data: sampleData, error: sampleError } = await supabaseAdmin
        .from('content_pillars')
        .select('*')
        .limit(1);
      
      if (sampleError) {
        return NextResponse.json({ 
          error: 'Failed to query table', 
          details: sampleError,
          columnsError 
        }, { status: 500 });
      }
      
      // Get column names from sample data
      const columnNames = sampleData && sampleData.length > 0 ? Object.keys(sampleData[0]) : [];
      
      return NextResponse.json({
        method: 'fallback',
        columnNames: columnNames.sort(),
        sampleData: sampleData?.[0] || null,
        hasFormFields: {
          titleFontSize: columnNames.includes('titleFontSize'),
          imageFit: columnNames.includes('imageFit'),
          imageAlignment: columnNames.includes('imageAlignment'),
          imageZoom: columnNames.includes('imageZoom'),
          imageVerticalPosition: columnNames.includes('imageVerticalPosition')
        }
      });
    }
    
    return NextResponse.json({
      method: 'rpc',
      columns: columns,
      hasFormFields: {
        titleFontSize: columns?.some((c: any) => c.column_name === 'titleFontSize'),
        imageFit: columns?.some((c: any) => c.column_name === 'imageFit'),
        imageAlignment: columns?.some((c: any) => c.column_name === 'imageAlignment'),
        imageZoom: columns?.some((c: any) => c.column_name === 'imageZoom'),
        imageVerticalPosition: columns?.some((c: any) => c.column_name === 'imageVerticalPosition')
      }
    });
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
