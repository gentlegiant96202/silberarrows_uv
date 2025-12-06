import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update a charge
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chargeId } = await params;
    const body = await request.json();
    const { charge_type, description, amount } = body;

    const updateData: any = {};
    if (charge_type !== undefined) updateData.charge_type = charge_type;
    if (description !== undefined) updateData.description = description;
    if (amount !== undefined) updateData.amount = amount;

    const { data, error } = await supabase
      .from('uv_charges')
      .update(updateData)
      .eq('id', chargeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ charge: data });
  } catch (error: any) {
    console.error('Error updating charge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a charge
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: chargeId } = await params;

    const { error } = await supabase
      .from('uv_charges')
      .delete()
      .eq('id', chargeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting charge:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
