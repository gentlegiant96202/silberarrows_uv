import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    console.log('Testing single insert...');

    const testData = {
      record_type: 'call_entry',
      call_date: '2024-08-12',
      call_time: '10:30:00',
      customer_name: 'Test Customer',
      phone_number: '123456789',
      reach_out_method: 'Call',
      person_in_charge: 'Test User',
      answered_yn: 'Yes',
      action_taken: 'Test action',
      person_in_charge_2: null,
      answered_yn_2: null,
      notes: 'Test note'
    };

    console.log('Inserting test data:', testData);

    const { data, error } = await supabase
      .from('call_management')
      .insert([testData])
      .select();

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error,
        testData
      });
    }

    console.log('Insert successful:', data);
    return NextResponse.json({
      success: true,
      message: 'Test insert successful',
      data,
      testData
    });

  } catch (error) {
    console.error('Exception:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Exception occurred', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
} 