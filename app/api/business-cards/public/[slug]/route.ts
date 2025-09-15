import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET - Fetch public business card by slug
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    console.log('Public API: Looking for business card with slug:', params.slug);
    
    console.log('Using supabaseAdmin client for public business card access');
    
    // Fetch business card (public access, no authentication required)
    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true) // Only return active cards
      .single();

    console.log('Public API: Query result - error:', error, 'data:', businessCard);

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    return NextResponse.json({ businessCard });
  } catch (error) {
    console.error('GET /api/business-cards/public/[slug] error:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
