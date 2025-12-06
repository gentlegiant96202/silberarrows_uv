import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Allocate payment to invoice
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_id, invoice_id } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    // Verify transaction exists and is a payment/deposit
    const { data: transaction, error: txError } = await supabase
      .from('uv_transactions')
      .select('id, transaction_type, deal_id')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (!['deposit', 'payment'].includes(transaction.transaction_type)) {
      return NextResponse.json({ error: 'Only payments and deposits can be allocated' }, { status: 400 });
    }

    // If invoice_id provided, verify it exists and belongs to same deal
    if (invoice_id) {
      const { data: invoice, error: invError } = await supabase
        .from('uv_invoices')
        .select('id, deal_id, status')
        .eq('id', invoice_id)
        .single();

      if (invError || !invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      if (invoice.deal_id !== transaction.deal_id) {
        return NextResponse.json({ error: 'Invoice and transaction must belong to same deal' }, { status: 400 });
      }

      if (invoice.status !== 'active') {
        return NextResponse.json({ error: 'Cannot allocate to voided invoice' }, { status: 400 });
      }
    }

    // Update allocation
    const { data, error } = await supabase
      .from('uv_transactions')
      .update({ allocated_invoice_id: invoice_id || null })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ 
      success: true, 
      transaction: data,
      allocated: !!invoice_id
    });
  } catch (error: any) {
    console.error('Error allocating payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Unallocate payment (set invoice_id to null)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transaction_id = searchParams.get('transaction_id');

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('uv_transactions')
      .update({ allocated_invoice_id: null })
      .eq('id', transaction_id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, transaction: data });
  } catch (error: any) {
    console.error('Error unallocating payment:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


