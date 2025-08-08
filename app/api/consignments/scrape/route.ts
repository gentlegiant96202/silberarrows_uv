import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Scraping consignment data...');

    // Note: This endpoint previously used Playwright for web scraping.
    // Since we've moved to external Railway renderer architecture,
    // web scraping functionality would need to be implemented separately
    // or configured with appropriate scraping tools.
    
    return NextResponse.json({
      success: false,
      error: 'Web scraping endpoint requires manual configuration. Please implement your preferred scraping solution.'
    }, { status: 501 });

  } catch (error) {
    console.error('❌ Error in scraping:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'id query param required' }, { status: 400 });
  }

  try {
    const { data } = await supabaseAdmin.from('scrape_jobs').select('*').eq('id', id).single();
    if (!data) {
      return NextResponse.json({ error: 'job not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ Error fetching scrape job:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
} 