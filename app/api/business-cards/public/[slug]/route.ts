import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch public business card by ID (simple 5-digit number)
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    const identifier = params.slug;
    // Try to parse as integer first (new simple ID system)
    const isNumericId = /^\d+$/.test(identifier);
    
    let query = supabaseAdmin
      .from('business_cards')
      .select('*')
      .eq('is_active', true);
    
    if (isNumericId) {
      // New system: simple integer ID
      query = query.eq('id', parseInt(identifier));
    } else {
      // Legacy system: slug-based (for backward compatibility)
      query = query.eq('slug', identifier);
    }
    
    const { data: businessCard, error } = await query.single();
    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    return NextResponse.json({ businessCard });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
