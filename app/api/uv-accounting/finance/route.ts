import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Create a finance application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      deal_id, 
      bank_name, 
      loan_amount, 
      application_date,
      application_ref,
      notes 
    } = body;

    if (!deal_id || !bank_name) {
      return NextResponse.json(
        { error: 'deal_id and bank_name are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('uv_finance_applications')
      .insert({
        deal_id,
        bank_name,
        loan_amount,
        application_date,
        application_ref,
        notes,
        status: 'documents_ready'
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ finance: data });
  } catch (error: any) {
    console.error('Error creating finance application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get finance applications for a deal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dealId = searchParams.get('deal_id');

    if (!dealId) {
      return NextResponse.json(
        { error: 'deal_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('uv_finance_applications')
      .select(`
        *,
        documents:uv_finance_documents(*)
      `)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ finance: data });
  } catch (error: any) {
    console.error('Error fetching finance applications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

