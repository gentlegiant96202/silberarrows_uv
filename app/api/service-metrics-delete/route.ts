import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    // First, let's see what data exists for this date
    const { data: existingData, error: queryError } = await supabaseAdmin
      .from('daily_service_metrics')
      .select('*')
      .eq('metric_date', date);
    // Also check for any data with similar dates
    const { data: allData, error: allError } = await supabaseAdmin
      .from('daily_service_metrics')
      .select('metric_date')
      .order('metric_date', { ascending: false })
      .limit(10);
    // Delete all metrics for the specified date
    const { error, count } = await supabaseAdmin
      .from('daily_service_metrics')
      .delete()
      .eq('metric_date', date);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete metrics: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: `Deleted ${count || 0} metrics for ${date}`,
      deletedCount: count || 0
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 