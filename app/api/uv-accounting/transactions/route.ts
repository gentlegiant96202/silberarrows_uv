import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Add a new transaction (deposit, payment, credit_note, refund)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      deal_id, 
      transaction_type, 
      amount, 
      payment_method, 
      reference_number, 
      reason,
      created_by 
    } = body;

    if (!deal_id || !transaction_type || amount === undefined) {
      return NextResponse.json(
        { error: 'deal_id, transaction_type, and amount are required' },
        { status: 400 }
      );
    }

    // Validate transaction_type
    const validTypes = ['deposit', 'payment', 'credit_note', 'refund'];
    if (!validTypes.includes(transaction_type)) {
      return NextResponse.json(
        { error: 'Invalid transaction_type' },
        { status: 400 }
      );
    }

    // Validate payment_method for deposits, payments, refunds
    if (['deposit', 'payment', 'refund'].includes(transaction_type)) {
      const validMethods = ['cash', 'card', 'bank_transfer', 'cheque'];
      if (!payment_method || !validMethods.includes(payment_method)) {
        return NextResponse.json(
          { error: 'Valid payment_method is required for this transaction type' },
          { status: 400 }
        );
      }
    }

    // Credit notes require reason
    if (transaction_type === 'credit_note' && !reason) {
      return NextResponse.json(
        { error: 'Reason is required for credit notes' },
        { status: 400 }
      );
    }

    // Use the function that handles gapless numbering and status update
    const { data, error } = await supabase.rpc('add_uv_transaction', {
      p_deal_id: deal_id,
      p_transaction_type: transaction_type,
      p_amount: amount,
      p_payment_method: payment_method || null,
      p_reference_number: reference_number || null,
      p_reason: reason || null,
      p_created_by: created_by || null
    });

    if (error) throw error;

    return NextResponse.json({ transaction: data });
  } catch (error: any) {
    console.error('Error adding transaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET - Get transactions for a deal
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
      .from('uv_transactions')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ transactions: data });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

