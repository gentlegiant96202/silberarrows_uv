import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Upload a document for a finance application
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const financeId = params.id;
    const body = await request.json();
    const { document_type, file_url, file_name } = body;

    if (!document_type || !file_url || !file_name) {
      return NextResponse.json(
        { error: 'document_type, file_url, and file_name are required' },
        { status: 400 }
      );
    }

    // Validate document_type
    const validTypes = [
      'eid_front', 'eid_back', 'passport', 'visa',
      'salary_certificate', 'bank_statements', 'trade_license',
      'vehicle_quotation', 'other'
    ];
    if (!validTypes.includes(document_type)) {
      return NextResponse.json(
        { error: 'Invalid document_type' },
        { status: 400 }
      );
    }

    // Check if document of this type already exists (except 'other')
    if (document_type !== 'other') {
      const { data: existing } = await supabase
        .from('uv_finance_documents')
        .select('id')
        .eq('finance_id', financeId)
        .eq('document_type', document_type)
        .single();

      if (existing) {
        // Update existing document
        const { data, error } = await supabase
          .from('uv_finance_documents')
          .update({ file_url, file_name, uploaded_at: new Date().toISOString() })
          .eq('id', existing.id)
          .select()
          .single();

        if (error) throw error;
        return NextResponse.json({ document: data, updated: true });
      }
    }

    // Insert new document
    const { data, error } = await supabase
      .from('uv_finance_documents')
      .insert({
        finance_id: financeId,
        document_type,
        file_url,
        file_name
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ document: data, updated: false });
  } catch (error: any) {
    console.error('Error uploading finance document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('document_id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'document_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('uv_finance_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting finance document:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

