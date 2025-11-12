import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

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
    // Delete from unified table
    const { error, count } = await supabase
      .from('sales_daily_metrics')
      .delete()
      .eq('metric_date', date);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete sales metrics: ' + error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      message: `Deleted ${count || 0} sales metrics for ${date}`,
      deletedCount: count || 0
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 