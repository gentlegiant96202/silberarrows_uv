// =====================================================
// SERVICE RECEIVABLES UPLOAD API
// POST: Upload and parse Excel file with receivables
// =====================================================

import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { parseReceivablesExcel, validateParsedData } from '@/lib/parsers/receivablesExcelParser';
import type { ServiceReceivable } from '@/types/receivables';

export const dynamic = 'force-dynamic';

/**
 * POST /api/service/receivables/upload
 * Upload Excel file and parse receivables data
 * 
 * Form data:
 * - file: Excel file (.xlsx)
 * - replace_existing: boolean (optional) - if true, deletes existing data before import
 */
export async function POST(request: NextRequest) {
  try {

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const replaceExisting = formData.get('replace_existing') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an Excel file (.xlsx or .xls)' },
        { status: 400 }
      );
    }

    // Parse Excel file
    console.log('Parsing Excel file:', file.name);
    const parseResult = await parseReceivablesExcel(file);

    // Validate parsed data
    const validation = validateParsedData(parseResult);
    if (!validation.valid) {
      return NextResponse.json({
        error: 'Invalid Excel data',
        details: validation.errors
      }, { status: 400 });
    }

    // Create import record
    const reportDate = parseResult.sheets[0]?.report_date || new Date().toISOString().split('T')[0];
    
    const { data: importRecord, error: importError } = await supabaseAdmin
      .from('service_receivables_imports')
      .insert({
        filename: file.name,
        report_date: reportDate,
        record_count: 0,
        status: 'processing'
      })
      .select()
      .single();

    if (importError || !importRecord) {
      console.error('Error creating import record:', importError);
      return NextResponse.json(
        { error: 'Failed to create import record' },
        { status: 500 }
      );
    }

    // Delete existing data if requested
    if (replaceExisting) {
      console.log('Deleting existing receivables data...');
      const { error: deleteError } = await supabaseAdmin
        .from('service_receivables')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteError) {
        console.error('Error deleting existing data:', deleteError);
      } else {
        console.log('Successfully deleted existing data');
      }
    }

    // Transform parsed data to database format
    // Each transaction will be stored with its running balance
    const receivables: Partial<ServiceReceivable>[] = [];
    
    for (const sheet of parseResult.sheets) {
      for (const transaction of sheet.transactions) {
        // Determine transaction type based on amounts
        let transactionType: 'INVOICE' | 'RECEIPT' | 'CREDIT' = 'INVOICE';
        if (transaction.receipt_amount > 0 && transaction.invoice_amount === 0) {
          transactionType = 'RECEIPT';
        } else if (transaction.balance < 0) {
          transactionType = 'CREDIT';
        }

        receivables.push({
          advisor_name: sheet.advisor_name,
          customer_id: transaction.customer_id,
          customer_name: transaction.customer_name,
          transaction_date: transaction.transaction_date,
          transaction_type: transactionType,
          reference_number: transaction.reference_number,
          invoice_amount: transaction.invoice_amount,
          receipt_amount: transaction.receipt_amount,
          balance: transaction.balance, // This is the running balance from Excel
          age_days: transaction.age_days,
          import_batch_id: importRecord.id
        });
      }
    }

    // Import data via main receivables endpoint
    const importResponse = await fetch(
      `${request.nextUrl.origin}/api/service/receivables`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || ''
        },
        body: JSON.stringify({
          import_id: importRecord.id,
          receivables
        })
      }
    );

    const importResult = await importResponse.json();

    if (!importResult.success) {
      return NextResponse.json({
        error: 'Import failed',
        details: importResult.errors
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      import_id: importRecord.id,
      report_date: reportDate,
      advisors_count: parseResult.sheets.length,
      records_imported: importResult.inserted,
      summary: {
        sheets: parseResult.sheets.map(s => ({
          advisor: s.advisor_name,
          transactions: s.transactions.length
        }))
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({
      error: 'Failed to process upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

