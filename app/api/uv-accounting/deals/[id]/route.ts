import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get deal with all related data
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;

    // Get deal from summary view
    const { data: deal, error: dealError } = await supabase
      .from('uv_deal_summary')
      .select('*')
      .eq('id', dealId)
      .single();

    if (dealError) throw dealError;

    // Get charges
    const { data: charges, error: chargesError } = await supabase
      .from('uv_charges')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (chargesError) throw chargesError;

    // Get transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('uv_transactions')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (transactionsError) throw transactionsError;

    // Get finance applications
    const { data: financeApps, error: financeError } = await supabase
      .from('uv_finance_applications')
      .select(`
        *,
        documents:uv_finance_documents(*)
      `)
      .eq('deal_id', dealId)
      .order('created_at', { ascending: false });

    if (financeError) throw financeError;

    return NextResponse.json({
      deal,
      charges,
      transactions,
      finance: financeApps
    });
  } catch (error: any) {
    console.error('Error fetching deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Update deal
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dealId = params.id;
    const body = await request.json();
    
    const {
      customer_name,
      customer_phone,
      customer_email,
      customer_id_type,
      customer_id_number,
      status
    } = body;

    const updateData: any = {};
    if (customer_name !== undefined) updateData.customer_name = customer_name;
    if (customer_phone !== undefined) updateData.customer_phone = customer_phone;
    if (customer_email !== undefined) updateData.customer_email = customer_email;
    if (customer_id_type !== undefined) updateData.customer_id_type = customer_id_type;
    if (customer_id_number !== undefined) updateData.customer_id_number = customer_id_number;
    if (status !== undefined) updateData.status = status;

    const { data, error } = await supabase
      .from('uv_deals')
      .update(updateData)
      .eq('id', dealId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ deal: data });
  } catch (error: any) {
    console.error('Error updating deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

