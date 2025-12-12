import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LeasingInputFormData } from '@/types/leasing';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('leasing_daily_metrics')
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
      return NextResponse.json(
        { error: 'Failed to fetch leasing metrics: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: LeasingInputFormData = await request.json();
    
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
      current_a_class_sales: body.current_a_class_sales || 0,
      current_others_sales: body.current_others_sales || 0,
      number_of_invoices: body.number_of_invoices || 0,
      excess_mileage: body.excess_mileage || 0,
      traffic_fines: body.traffic_fines || 0,
      salik: body.salik || 0,
      current_marketing_spend: body.current_marketing_spend || 0,
      notes: body.notes || null
    };

    // Upsert into unified table (trigger will calculate derived metrics)
    const { data, error } = await supabase
      .from('leasing_daily_metrics')
      .upsert(metricsData, {
        onConflict: 'metric_date'
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save leasing input metrics: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

