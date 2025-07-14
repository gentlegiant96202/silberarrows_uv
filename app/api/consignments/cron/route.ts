import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnon);

// Verify this is a legitimate cron request
function verifyCronRequest(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // In production, verify the request is from Vercel cron
  if (process.env.NODE_ENV === 'production') {
    if (!authHeader || !cronSecret) {
      return false;
    }
    return authHeader === `Bearer ${cronSecret}`;
  }
  
  // In development, COMPLETELY DISABLE automatic cron execution
  // Only allow explicit manual triggers via POST with special header
  const manualTrigger = request.headers.get('x-manual-trigger');
  const method = request.method;
  
  // Block ALL GET requests in development (these are automatic)
  if (method === 'GET') {
    return false;
  }
  
  // Only allow POST requests with the manual trigger header
  return method === 'POST' && manualTrigger === 'true';
}

export async function GET(request: NextRequest) {
  // COMPLETELY DISABLE CRON IN DEVELOPMENT
  // Check multiple conditions to ensure we're not in production
  const isProduction = process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV === 'production';
  
  if (!isProduction) {
    console.log('🚫 Cron disabled in development mode (NODE_ENV:', process.env.NODE_ENV, ', VERCEL_ENV:', process.env.VERCEL_ENV, ')');
    return NextResponse.json({ error: 'Cron disabled in development mode' }, { status: 403 });
  }

  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      console.log('🚫 Unauthorized cron request blocked in development mode');
      return NextResponse.json({ error: 'Unauthorized - requires x-manual-trigger header in development' }, { status: 401 });
    }

    console.log('🕐 Daily cron job triggered at:', new Date().toISOString());

    // Calculate starting page using reverse round-robin strategy
    const totalPages = 11;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
    const startingPage = totalPages - (dayOfYear % totalPages);
    
    console.log(`📄 Reverse Round-Robin: Starting from page ${startingPage} today`);

    // Default search URL for Mercedes-Benz (you can customize this)
    const defaultSearchUrl = 'https://dubai.dubizzle.com/motors/used-cars/mercedes-benz/?seller_type=OW&regional_specs=824&regional_specs=827&fuel_type=380&fuel_type=383&kilometers__lte=100000&kilometers__gte=0&year__gte=2015&year__lte=2026';
    const targetLeads = 20; // Daily target - guaranteed successful leads

    // Create a new scrape job with search parameters
    const { data: job, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert([{
        status: 'queued',
        total: 0,
        processed: 0,
        successful_leads: 0,
        search_url: defaultSearchUrl,
        max_listings: targetLeads,
        log: `Starting from page ${startingPage} (reverse round-robin)`
      }])
      .select()
      .single();

    if (jobError) {
      console.error('Failed to create scrape job:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    console.log('📝 Created scrape job:', job.id);

    // Trigger the scraper (this will run in the background)
    const scrapeResponse = await fetch(`${request.nextUrl.origin}/api/consignments/scrape`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: defaultSearchUrl,
        max: targetLeads
      })
    });

    if (!scrapeResponse.ok) {
      console.error('Failed to trigger scraper:', await scrapeResponse.text());
      
      // Update job status to error
      await supabase
        .from('scrape_jobs')
        .update({ 
          status: 'error', 
          finished_at: new Date(),
          log: 'Failed to trigger scraper'
        })
        .eq('id', job.id);

      return NextResponse.json({ error: 'Failed to trigger scraper' }, { status: 500 });
    }

    console.log('✅ Scraper triggered successfully');

    return NextResponse.json({ 
      message: 'Daily scraping job started successfully',
      jobId: job.id,
      searchUrl: defaultSearchUrl,
      targetLeads: targetLeads,
      startingPage: startingPage,
      strategy: 'Reverse Round-Robin (page 11→10→9...→1)',
      scheduledAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Allow POST requests for manual testing (with proper header)
export async function POST(request: NextRequest) {
  // For manual testing, add the required header
  const headers = new Headers(request.headers);
  if (process.env.NODE_ENV === 'development') {
    headers.set('x-manual-trigger', 'true');
  }
  
  // Create a new request with the updated headers
  const newRequest = new NextRequest(request.url, {
    method: request.method,
    headers: headers,
    body: request.body
  });
  
  return GET(newRequest);
} 