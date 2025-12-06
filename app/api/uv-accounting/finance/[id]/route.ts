import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PATCH - Update a finance application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: financeId } = await params;
    const body = await request.json();
    const { 
      bank_name, 
      loan_amount, 
      application_date,
      application_ref,
      status,
      notes 
    } = body;

    const updateData: any = {};
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (loan_amount !== undefined) updateData.loan_amount = loan_amount;
    if (application_date !== undefined) updateData.application_date = application_date;
    if (application_ref !== undefined) updateData.application_ref = application_ref;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data, error } = await supabase
      .from('uv_finance_applications')
      .update(updateData)
      .eq('id', financeId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ finance: data });
  } catch (error: any) {
    console.error('Error updating finance application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a finance application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: financeId } = await params;

    const { error } = await supabase
      .from('uv_finance_applications')
      .delete()
      .eq('id', financeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting finance application:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
