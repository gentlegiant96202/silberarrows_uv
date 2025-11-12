import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// GET: Fetch daily service metrics for a date range or specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabaseAdmin
      .from('daily_service_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    // Filter by specific date
    if (date) {
      query = query.eq('metric_date', date);
    }
    // Filter by date range
    else if (startDate && endDate) {
      query = query.gte('metric_date', startDate).lte('metric_date', endDate);
    }
    // Filter by year/month
    else if (year && month) {
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const endOfMonth = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];
      query = query.gte('metric_date', startOfMonth).lte('metric_date', endOfMonth);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to fetch metrics: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data || []
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST: Create or update daily service metrics
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      date,
      working_days_elapsed,
      current_net_sales,
      current_net_labor_sales,
      number_of_invoices,
      current_marketing_spend,
      
      // Individual salesperson data (simplified)
      daniel_total_sales,
      essrar_total_sales,
      lucy_total_sales,
      
      notes
    } = body;

    // Validate required fields
    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date is required' },
        { status: 400 }
      );
    }
    // Upsert the record (insert or update if exists)
    const { data, error } = await supabaseAdmin
      .from('daily_service_metrics')
      .upsert({
        metric_date: date,
        working_days_elapsed: working_days_elapsed || 0,
        current_net_sales: current_net_sales || 0,
        current_net_labor_sales: current_net_labor_sales || 0,
        number_of_invoices: number_of_invoices || 0,
        current_marketing_spend: current_marketing_spend || 0,
        
        // Individual salesperson data
        daniel_total_sales: daniel_total_sales || 0,
        essrar_total_sales: essrar_total_sales || 0,
        lucy_total_sales: lucy_total_sales || 0,
        
        notes: notes || null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'metric_date'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to save metrics: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      data: data,
      message: 'Service metrics saved successfully'
    });

  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE: Delete daily service metrics for a specific date
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json(
        { success: false, error: 'Date parameter is required' },
        { status: 400 }
      );
    }
    const { error, count } = await supabaseAdmin
      .from('daily_service_metrics')
      .delete()
      .eq('metric_date', date);

    if (error) {
      return NextResponse.json(
        { success: false, error: `Failed to delete metrics: ${error.message}` },
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
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 