import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// Force this API route to use Node.js runtime and be dynamic
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Use try-catch for search params to avoid static generation issues
    let startDate: string;
    let endDate: string;
    
    try {
      const url = new URL(request.url);
      startDate = url.searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate = url.searchParams.get('endDate') || new Date().toISOString().split('T')[0];
    } catch {
      // Fallback if URL parsing fails
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      endDate = new Date().toISOString().split('T')[0];
    }

    // Call the database function
    const { data: funnelData, error: funnelError } = await supabase
      .rpc('get_cumulative_funnel', {
        start_date: startDate,
        end_date: endDate
      });

    if (funnelError) {
      console.error('Funnel error:', funnelError);
      return NextResponse.json({ error: funnelError.message }, { status: 500 });
    }

    // Simple, clean response
    const response = {
      dateRange: { startDate, endDate },
      funnelData: funnelData || [],
      totalLeads: funnelData?.reduce((sum: number, stage: any) => sum + stage.currently_in_stage, 0) || 0
    };

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 