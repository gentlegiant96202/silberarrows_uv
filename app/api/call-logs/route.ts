import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  try {
    // -------- Pagination workaround for Supabase 1k row cap --------
    const pageSize = 1000;
    let offset = 0;
    let allRows: any[] = [];
    let totalCount = 0;

    while (true) {
      const { data: batch, error, count } = await supabase
        .from('call_management')
        .select('*', { count: 'exact' }) // include count in first call
        .eq('record_type', 'call_entry')
        .order('call_date', { ascending: false })
        .order('call_time', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (error) {
        console.error('Error fetching call logs:', error);
        return NextResponse.json(
          { error: 'Failed to fetch call logs' },
          { status: 500 }
        );
      }

      if (count !== null) {
        totalCount = count; // only captured on first call
      }

      allRows = allRows.concat(batch || []);

      if (!batch || batch.length < pageSize) {
        break; // fetched last page
      }

      offset += pageSize;
    }

    console.log(`📊 API Debug: Fetched ${allRows.length} / ${totalCount || allRows.length} call entries`);

    // Transform data to match frontend interface
    const transformedData = allRows.map(row => ({
      id: row.id,
      date: row.call_date,
      time: row.call_time,
      customer_name: row.customer_name,
      phone_number: row.phone_number,
      reach_out_method: row.reach_out_method,
      person_in_charge: row.person_in_charge,
      answered_yn: row.answered_yn,
      action_taken: row.action_taken,
      person_in_charge_2: row.person_in_charge_2,
      answered_yn_2: row.answered_yn_2,
      notes: row.notes
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const insertData = {
      record_type: 'call_entry',
      call_date: body.call_date || body.date,
      call_time: body.call_time || body.time,
      customer_name: body.customer_name,
      phone_number: body.phone_number,
      reach_out_method: body.reach_out_method || 'Call',
      person_in_charge: body.person_in_charge,
      answered_yn: body.answered_yn || 'Yes',
      action_taken: body.action_taken,
      person_in_charge_2: body.person_in_charge_2 || null,
      answered_yn_2: body.answered_yn_2 || null,
      notes: body.notes || null
    };

    const { data, error } = await supabase
      .from('call_management')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Error creating call log:', error);
      return NextResponse.json(
        { error: 'Failed to create call log' },
        { status: 500 }
      );
    }

    // Transform response to match frontend interface
    const transformedData = {
      id: data.id,
      date: data.call_date,
      time: data.call_time,
      customer_name: data.customer_name,
      phone_number: data.phone_number,
      reach_out_method: data.reach_out_method,
      person_in_charge: data.person_in_charge,
      answered_yn: data.answered_yn,
      action_taken: data.action_taken,
      person_in_charge_2: data.person_in_charge_2,
      answered_yn_2: data.answered_yn_2,
      notes: data.notes
    };

    return NextResponse.json(transformedData);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 