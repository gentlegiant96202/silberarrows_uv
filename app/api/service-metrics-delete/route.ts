import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

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

    console.log('Deleting service metrics for date:', date);

    // First, let's see what data exists for this date
    const { data: existingData, error: queryError } = await supabase
      .from('daily_service_metrics')
      .select('*')
      .eq('metric_date', date);

    console.log('Found existing data for date:', date, existingData);

    // Also check for any data with similar dates
    const { data: allData, error: allError } = await supabase
      .from('daily_service_metrics')
      .select('metric_date')
      .order('metric_date', { ascending: false })
      .limit(10);

    console.log('Recent dates in database:', allData?.map(d => d.metric_date));

    // Delete all metrics for the specified date
    const { error, count } = await supabase
      .from('daily_service_metrics')
      .delete()
      .eq('metric_date', date);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: `Failed to delete metrics: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`Successfully deleted ${count || 0} metrics for date ${date}`);

    return NextResponse.json({
      success: true,
      message: `Deleted ${count || 0} metrics for ${date}`,
      deletedCount: count || 0
    });

  } catch (error: any) {
    console.error('API error in service-metrics-delete:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 