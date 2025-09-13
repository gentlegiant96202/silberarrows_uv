import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import type { SalesInputFormData } from '@/types/sales';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('sales_daily_metrics')
      .select('*')
      .order('metric_date', { ascending: false });

    // Apply filters
    if (date) {
      query = query.eq('metric_date', date);
    } else if (startDate && endDate) {
      query = query.gte('metric_date', startDate).lte('metric_date', endDate);
    } else if (year && month) {
      query = query.eq('year', parseInt(year)).eq('month', parseInt(month));
    } else if (year) {
      query = query.eq('year', parseInt(year));
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching sales metrics:', error);
      return NextResponse.json(
        { error: 'Failed to fetch sales metrics: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0
    });

  } catch (error) {
    console.error('Unexpected error in sales metrics GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SalesInputFormData = await request.json();
    
    // Validate required fields
    if (!body.date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Extract year and month from date
    const date = new Date(body.date);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;

    // Prepare data for unified table
    const metricsData = {
      metric_date: body.date,
      year,
      month,
      working_days_elapsed: body.working_days_elapsed || 0,
      gross_sales_year_actual: body.gross_sales_year_actual || 0,
      cost_of_sales_year_actual: body.cost_of_sales_year_actual || 0,
      gross_sales_month_actual: body.gross_sales_month_actual || 0,
      cost_of_sales_month_actual: body.cost_of_sales_month_actual || 0,
      marketing_spend_month: body.marketing_spend_month || 0,
      units_disposed_month: body.units_disposed_month || 0,
      units_sold_stock_month: body.units_sold_stock_month || 0,
      units_sold_consignment_month: body.units_sold_consignment_month || 0,
      notes: body.notes || null
    };

    // Upsert into unified table (trigger will calculate target-based metrics)
    const { data, error } = await supabase
      .from('sales_daily_metrics')
      .upsert(metricsData, {
        onConflict: 'metric_date'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving sales metrics:', error);
      return NextResponse.json(
        { error: 'Failed to save sales input metrics: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('Unexpected error in sales metrics POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 