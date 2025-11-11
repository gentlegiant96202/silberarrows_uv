// =====================================================
// SERVICE RECEIVABLES API
// GET: Fetch receivables data
// POST: Bulk import receivables
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import type { ServiceReceivable, ReceivablesFilter, ReceivablesStats } from '@/types/receivables';

export const dynamic = 'force-dynamic';

/**
 * GET /api/service/receivables
 * Fetch receivables data with optional filters
 * 
 * Query params:
 * - advisor: Filter by advisor name
 * - customer_id: Filter by customer
 * - aging_bucket: Filter by aging (0-30, 31-60, 61-90, 91+)
 * - stats: If 'true', return summary stats only
 */
export async function GET(request: NextRequest) {
  try {

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const advisor = searchParams.get('advisor');
    const customer_id = searchParams.get('customer_id');
    const aging_bucket = searchParams.get('aging_bucket');
    const wantsStats = searchParams.get('stats') === 'true';

    // Return stats if requested
    if (wantsStats) {
      const stats = await getReceivablesStats();
      return NextResponse.json(stats);
    }

    // Build query
    let query = supabaseAdmin
      .from('service_receivables')
      .select('*')
      .order('transaction_date', { ascending: false });

    // Apply filters
    if (advisor && advisor !== 'all') {
      query = query.eq('advisor_name', advisor.toUpperCase());
    }

    if (customer_id) {
      query = query.eq('customer_id', customer_id);
    }

    if (aging_bucket && aging_bucket !== 'all') {
      query = query.eq('aging_bucket', aging_bucket);
    }

    // Only show non-zero balances by default
    query = query.neq('balance', 0);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching receivables:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ receivables: data || [] });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/service/receivables
 * Bulk import receivables from parsed Excel data
 * 
 * Body:
 * {
 *   import_id: string,
 *   receivables: ServiceReceivable[]
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { import_id, receivables } = body;

    if (!import_id || !receivables || !Array.isArray(receivables)) {
      return NextResponse.json(
        { error: 'Invalid request body. Expected import_id and receivables array' },
        { status: 400 }
      );
    }

    // Add import_batch_id to all receivables
    const receivablesWithBatch = receivables.map(r => ({
      ...r,
      import_batch_id: import_id
    }));

    // Insert in batches of 500 to avoid timeout
    const batchSize = 500;
    const batches = [];
    for (let i = 0; i < receivablesWithBatch.length; i += batchSize) {
      batches.push(receivablesWithBatch.slice(i, i + batchSize));
    }

    let totalInserted = 0;
    const errors: string[] = [];

    for (const batch of batches) {
      const { data, error } = await supabaseAdmin
        .from('service_receivables')
        .insert(batch)
        .select();

      if (error) {
        errors.push(`Batch insert error: ${error.message}`);
        console.error('Insert error:', error);
      } else {
        totalInserted += data?.length || 0;
      }
    }

    // Update import record status
    await supabaseAdmin
      .from('service_receivables_imports')
      .update({
        status: errors.length > 0 ? 'failed' : 'completed',
        record_count: totalInserted,
        error_message: errors.length > 0 ? errors.join('; ') : null
      })
      .eq('id', import_id);

    return NextResponse.json({
      success: errors.length === 0,
      inserted: totalInserted,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Helper: Get receivables statistics
 * Only counts the LATEST balance per customer (not all transactions)
 */
async function getReceivablesStats(): Promise<ReceivablesStats> {
  // Get only the latest balance per customer using the view
  const { data: receivables, error } = await supabaseAdmin
    .from('service_receivables_summary')
    .select('*');

  if (error || !receivables) {
    console.error('Error fetching receivables summary:', error);
    return {
      total_outstanding: 0,
      total_customers: 0,
      total_advisors: 0,
      aging_breakdown: {
        days_0_30: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_91_plus: 0
      },
      at_risk_amount: 0
    };
  }

  // Calculate stats from summary (already has only latest balances)
  const uniqueAdvisors = new Set(receivables.map(r => r.advisor_name));

  const stats: ReceivablesStats = {
    total_outstanding: receivables.reduce((sum, r) => sum + (r.total_balance || 0), 0),
    total_customers: receivables.length, // Each row is one customer
    total_advisors: uniqueAdvisors.size,
    aging_breakdown: {
      days_0_30: receivables.reduce((sum, r) => sum + (r.balance_0_30 || 0), 0),
      days_31_60: receivables.reduce((sum, r) => sum + (r.balance_31_60 || 0), 0),
      days_61_90: receivables.reduce((sum, r) => sum + (r.balance_61_90 || 0), 0),
      days_91_plus: receivables.reduce((sum, r) => sum + (r.balance_91_plus || 0), 0)
    },
    at_risk_amount: receivables.reduce((sum, r) => sum + (r.balance_91_plus || 0), 0)
  };

  // Get latest import date
  const { data: latestImport } = await supabaseAdmin
    .from('service_receivables_imports')
    .select('report_date')
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (latestImport) {
    stats.latest_import_date = latestImport.report_date;
  }

  return stats;
}

