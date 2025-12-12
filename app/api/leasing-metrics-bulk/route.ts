import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { LeasingInputFormData } from '@/types/leasing';

export const runtime = 'edge';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body: { records: LeasingInputFormData[] } = await request.json();
    
    if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
      return NextResponse.json(
        { error: 'Records array is required' },
        { status: 400 }
      );
    }

    // Prepare all records for bulk insert
    const metricsData = body.records.map(record => {
      const date = new Date(record.date);
      return {
        metric_date: record.date,
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        working_days_elapsed: record.working_days_elapsed || 0,
        current_a_class_sales: record.current_a_class_sales || 0,
        current_others_sales: record.current_others_sales || 0,
        number_of_invoices: record.number_of_invoices || 0,
        excess_mileage: record.excess_mileage || 0,
        traffic_fines: record.traffic_fines || 0,
        salik: record.salik || 0,
        current_marketing_spend: record.current_marketing_spend || 0,
        notes: record.notes || null
      };
    });

    // Bulk upsert all records at once
    const { data, error } = await supabase
      .from('leasing_daily_metrics')
      .upsert(metricsData, {
        onConflict: 'metric_date'
      })
      .select();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to bulk insert leasing metrics: ' + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      message: `Successfully imported ${data?.length || 0} records`
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

