import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for public access (bypasses RLS)
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

// GET - Fetch public business card by slug
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  try {
    const params = await context.params;
    
    // Fetch business card (public access, no authentication required)
    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .select('*')
      .eq('slug', params.slug)
      .eq('is_active', true) // Only return active cards
      .single();

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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
