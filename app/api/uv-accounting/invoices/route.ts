import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Get all invoices for a deal
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deal_id = searchParams.get('deal_id');

    if (!deal_id) {
      return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Get all invoices for this deal (including voided)
    const { data: invoices, error } = await supabase
      .from('uv_invoices')
      .select('*')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get allocation totals for each invoice
    const invoicesWithAllocations = await Promise.all(
      (invoices || []).map(async (invoice) => {
        const { data: allocations } = await supabase
          .from('uv_transactions')
          .select('amount')
          .eq('allocated_invoice_id', invoice.id)
          .in('transaction_type', ['deposit', 'payment']);

        const allocatedTotal = (allocations || []).reduce((sum, t) => sum + Number(t.amount), 0);
        
        return {
          ...invoice,
          allocated_amount: allocatedTotal,
          invoice_balance: Number(invoice.total_amount) - allocatedTotal
        };
      })
    );

    // Separate active and voided
    const activeInvoice = invoicesWithAllocations.find(i => i.status === 'active');
    const voidedInvoices = invoicesWithAllocations.filter(i => i.status === 'voided');

    return NextResponse.json({
      invoices: invoicesWithAllocations,
      activeInvoice,
      voidedInvoices,
      hasActiveInvoice: !!activeInvoice
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


