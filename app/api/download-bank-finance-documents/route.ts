import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import JSZip from 'jszip';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[download-bank-finance-documents] Fetching application:', applicationId);

    // Fetch application with related data
    const { data: application, error: appError } = await supabase
      .from('uv_bank_finance_applications')
      .select(`
        *,
        sales_order:uv_sales_orders!inner(
          order_number,
          customer_name,
          vehicle_make_model
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[download-bank-finance-documents] Error fetching application:', appError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Fetch all documents for this application
    const { data: documents, error: docsError } = await supabase
      .from('uv_bank_finance_documents')
      .select('*')
      .eq('application_id', applicationId)
      .order('category', { ascending: true })
      .order('document_type', { ascending: true });

    if (docsError) {
      console.error('[download-bank-finance-documents] Error fetching documents:', docsError);
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
    }

    // Create ZIP file
    const zip = new JSZip();
    const customerName = application.sales_order?.customer_name || 'Customer';
    const bankName = application.bank_name || 'Bank';
    const appNumber = application.application_number || 1;

    // Create folder structure
    const customerFolder = zip.folder('01_Customer_Documents');
    const bankFolder = zip.folder('02_Bank_Documents');
    const quotationFolder = zip.folder('03_Quotation');

    // Download and add bank quotation PDF if exists
    if (application.bank_quotation_pdf_url) {
      try {
        console.log('[download-bank-finance-documents] Fetching quotation PDF...');
        const quotationResponse = await fetch(application.bank_quotation_pdf_url);
        if (quotationResponse.ok) {
          const quotationBuffer = await quotationResponse.arrayBuffer();
          const quotationFileName = `Bank_Quotation_${application.bank_quotation_number || appNumber}.pdf`;
          quotationFolder?.file(quotationFileName, quotationBuffer);
          console.log('[download-bank-finance-documents] Added quotation PDF');
        }
      } catch (err) {
        console.warn('[download-bank-finance-documents] Failed to fetch quotation PDF:', err);
      }
    }

    // Download and add bank invoice PDF if exists (generated on approval)
    if (application.bank_invoice_pdf_url) {
      try {
        console.log('[download-bank-finance-documents] Fetching bank invoice PDF...');
        const invoiceResponse = await fetch(application.bank_invoice_pdf_url);
        if (invoiceResponse.ok) {
          const invoiceBuffer = await invoiceResponse.arrayBuffer();
          const invoiceFileName = `Bank_Invoice_${application.bank_invoice_number || appNumber}.pdf`;
          quotationFolder?.file(invoiceFileName, invoiceBuffer);
          console.log('[download-bank-finance-documents] Added bank invoice PDF');
        }
      } catch (err) {
        console.warn('[download-bank-finance-documents] Failed to fetch bank invoice PDF:', err);
      }
    }

    // Download and add all documents
    for (const doc of documents || []) {
      try {
        console.log(`[download-bank-finance-documents] Fetching document: ${doc.document_name}`);
        const docResponse = await fetch(doc.file_url);
        if (docResponse.ok) {
          const docBuffer = await docResponse.arrayBuffer();
          
          // Get file extension from URL or default to pdf
          const urlParts = doc.file_url.split('.');
          const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'pdf';
          
          // Clean filename
          const cleanName = doc.document_name.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_');
          const fileName = `${cleanName}.${extension}`;
          
          // Add to appropriate folder
          if (doc.category === 'customer') {
            customerFolder?.file(fileName, docBuffer);
          } else if (doc.category === 'bank') {
            bankFolder?.file(fileName, docBuffer);
          }
          console.log(`[download-bank-finance-documents] Added: ${fileName}`);
        }
      } catch (err) {
        console.warn(`[download-bank-finance-documents] Failed to fetch document ${doc.document_name}:`, err);
      }
    }

    // Generate ZIP file
    console.log('[download-bank-finance-documents] Generating ZIP...');
    const zipBuffer = await zip.generateAsync({ 
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    // Create filename
    const safeCustomerName = customerName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const safeBankName = bankName.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_');
    const zipFileName = `BankFinance_${safeBankName}_${safeCustomerName}_App${appNumber}.zip`;

    console.log('[download-bank-finance-documents] ZIP generated:', zipFileName);

    // Return ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${zipFileName}"`,
        'Content-Length': zipBuffer.byteLength.toString(),
      },
    });

  } catch (error: any) {
    console.error('[download-bank-finance-documents] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate ZIP file' },
      { status: 500 }
    );
  }
}

