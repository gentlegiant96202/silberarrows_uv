import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - List all deals with filters OR get single deal by lead_id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('lead_id');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';

    // If lead_id provided, get single deal with all related data
    if (leadId) {
      const { data: deal, error: dealError } = await supabase
        .from('uv_deal_summary')
        .select('*')
        .eq('lead_id', leadId)
        .maybeSingle();

      if (dealError) throw dealError;

      // No deal found for this lead
      if (!deal) {
        return NextResponse.json({ deal: null, charges: [], transactions: [], finance: [] });
      }

      // Fetch all related data in parallel
      const [chargesResult, transactionsResult, financeResult] = await Promise.all([
        supabase.from('uv_charges').select('*').eq('deal_id', deal.id).order('created_at', { ascending: true }),
        supabase.from('uv_transactions').select('*').eq('deal_id', deal.id).order('created_at', { ascending: true }),
        supabase.from('uv_finance_applications').select('*, documents:uv_finance_documents(*)').eq('deal_id', deal.id).order('created_at', { ascending: false })
      ]);

      return NextResponse.json({
        deal,
        charges: chargesResult.data || [],
        transactions: transactionsResult.data || [],
        finance: financeResult.data || []
      });
    }

    // Otherwise, list all deals with filters
    let query = supabase
      .from('uv_deal_summary')
      .select('*')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    // Filter by status
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Search by customer name or deal number
    if (search) {
      query = query.or(`customer_name.ilike.%${search}%,deal_number.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Get totals for summary cards
    const { data: totalsData, error: totalsError } = await supabase
      .from('uv_deal_summary')
      .select('invoice_total, total_paid, balance_due, status');

    if (totalsError) throw totalsError;

    const totals = {
      total_invoiced: totalsData?.reduce((sum, d) => sum + (d.invoice_total || 0), 0) || 0,
      total_collected: totalsData?.reduce((sum, d) => sum + (d.total_paid || 0), 0) || 0,
      total_outstanding: totalsData?.reduce((sum, d) => sum + Math.max(d.balance_due || 0, 0), 0) || 0,
      count_pending: totalsData?.filter(d => d.status === 'pending').length || 0,
      count_partial: totalsData?.filter(d => d.status === 'partial').length || 0,
      count_paid: totalsData?.filter(d => d.status === 'paid').length || 0,
      count_cancelled: totalsData?.filter(d => d.status === 'cancelled').length || 0,
    };

    return NextResponse.json({ deals: data, totals });
  } catch (error: any) {
    console.error('Error fetching deals:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new deal and return full data (optimized single call)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      lead_id, 
      customer_name, 
      customer_phone, 
      customer_email,
      customer_id_type,
      customer_id_number,
      vehicle_id,
      created_by 
    } = body;

    if (!lead_id || !customer_name || !customer_phone) {
      return NextResponse.json(
        { error: 'lead_id, customer_name, and customer_phone are required' },
        { status: 400 }
      );
    }

    let dealId: string;
    let isExisting = false;

    // Check if deal already exists for this lead
    const { data: existingDeal, error: existingError } = await supabase
      .from('uv_deals')
      .select('id')
      .eq('lead_id', lead_id)
      .maybeSingle();  // Use maybeSingle() - doesn't error when no row found

    if (existingDeal && !existingError) {
      dealId = existingDeal.id;
      isExisting = true;
    } else {
      // Create deal using the function (handles gapless numbering)
      const { data, error } = await supabase.rpc('create_uv_deal', {
        p_lead_id: lead_id,
        p_customer_name: customer_name,
        p_customer_phone: customer_phone,
        p_vehicle_id: vehicle_id || null,
        p_created_by: created_by || null
      });

      if (error) throw error;
      dealId = data.id;

      // Update additional fields if provided
      if (customer_email || customer_id_type || customer_id_number) {
        await supabase
          .from('uv_deals')
          .update({ customer_email, customer_id_type, customer_id_number })
          .eq('id', dealId);
      }

      // If vehicle_id provided, auto-add vehicle price as first charge
      if (vehicle_id) {
        const { data: car } = await supabase
          .from('cars')
          .select('advertised_price_aed')
          .eq('id', vehicle_id)
          .single();

        if (car?.advertised_price_aed) {
          await supabase.from('uv_charges').insert({
            deal_id: dealId,
            charge_type: 'vehicle_price',
            description: 'Vehicle Sale Price',
            amount: car.advertised_price_aed
          });
        }
      }
    }

    // Fetch all data in parallel for fast response
    const [dealResult, chargesResult, transactionsResult, financeResult] = await Promise.all([
      supabase.from('uv_deal_summary').select('*').eq('id', dealId).single(),
      supabase.from('uv_charges').select('*').eq('deal_id', dealId).order('created_at', { ascending: true }),
      supabase.from('uv_transactions').select('*').eq('deal_id', dealId).order('created_at', { ascending: true }),
      supabase.from('uv_finance_applications').select('*, documents:uv_finance_documents(*)').eq('deal_id', dealId).order('created_at', { ascending: false })
    ]);

    return NextResponse.json({
      deal: dealResult.data,
      charges: chargesResult.data || [],
      transactions: transactionsResult.data || [],
      finance: financeResult.data || [],
      existing: isExisting
    });
  } catch (error: any) {
    console.error('Error creating deal:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

