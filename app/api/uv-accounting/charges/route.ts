import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Add a new charge
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deal_id, charge_type, description, amount } = body;

    if (!deal_id || !charge_type || amount === undefined) {
      return NextResponse.json(
        { error: 'deal_id, charge_type, and amount are required' },
        { status: 400 }
      );
    }

    // Validate charge_type
    const validTypes = [
      'vehicle_price', 'rta_fee', 'insurance', 'extended_warranty',
      'servicecare_standard', 'servicecare_premium', 'ceramic_coating',
      'window_tints', 'other'
    ];
    if (!validTypes.includes(charge_type)) {
      return NextResponse.json(
        { error: 'Invalid charge_type' },
        { status: 400 }
      );
    }

    // 'other' requires description
    if (charge_type === 'other' && !description) {
      return NextResponse.json(
        { error: 'Description is required for "other" charge type' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('uv_charges')
      .insert({
        deal_id,
        charge_type,
        description,
        amount
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ charge: data });
  } catch (error: any) {
    console.error('Error adding charge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

