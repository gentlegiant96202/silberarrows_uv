import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'Call log ID is required' },
        { status: 400 }
      );
    }

    // Delete the call log entry from the database
    const { error } = await supabase
      .from('call_management')
      .delete()
      .eq('id', id)
      .eq('record_type', 'call_entry');

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete call log entry' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Call log entry deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Call log ID is required' },
        { status: 400 }
      );
    }

    const updateData = {
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
      .update(updateData)
      .eq('id', id)
      .eq('record_type', 'call_entry')
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update call log entry' },
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
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 