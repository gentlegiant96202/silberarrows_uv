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
    console.log('🔍 DEBUG: Checking database directly...');
    
    // Query database directly
    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log('📦 Total pillars from API:', data.length);
    
    // Filter Monday pillars
    const mondayPillars = data.filter((item: any) => item.day_of_week === 'monday');
    console.log('📅 Monday pillars found:', mondayPillars.length);
    console.log('📋 Monday titles:', mondayPillars.map((p: any) => p.title));
    
    // Look for the problematic entries
    const problematicEntries = data.filter((item: any) => 
      ['test', 'rewew', 'Customer Delivery Joy'].includes(item.title)
    );
    
    console.log('🚨 Problematic entries found:', problematicEntries.length);
    if (problematicEntries.length > 0) {
      console.log('🚨 Problematic details:', problematicEntries.map((p: any) => ({
        id: p.id,
        title: p.title,
        day_of_week: p.day_of_week,
        created_by: p.created_by,
        created_at: p.created_at
      })));
    }
    
    return NextResponse.json({
      total: data.length,
      mondayCount: mondayPillars.length,
      mondayTitles: mondayPillars.map((p: any) => p.title),
      problematicCount: problematicEntries.length,
      problematicEntries: problematicEntries.map((p: any) => ({
        id: p.id,
        title: p.title,
        day_of_week: p.day_of_week,
        created_by: p.created_by
      }))
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
