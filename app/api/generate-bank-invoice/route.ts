import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

interface BankInvoiceData {
  applicationId: string;
  invoiceNumber: string;
  invoiceDate: string;
  // Customer
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  emiratesId: string;
  // Vehicle
  vehicleMakeModel: string;
  modelYear: string;
  chassisNo: string;
  vehicleColour: string;
  vehicleMileage: string;
  // Pricing (same as quotation)
  bankQuotationPrice: number;
  bankDownPayment: number;
  bankDownPaymentPct: number;
  amountDue: number;
  // Bank details
  bankName: string;
  bankReference: string;
}

// Generate HTML content for Bank Invoice document
function generateBankInvoiceHTML(data: BankInvoiceData, logoSrc: string, stampSrc: string, signatureSrc: string) {
  const safeString = (value: any) => String(value || '-');

  const formatDate = (dateString: any) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return new Intl.NumberFormat('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const safeNumber = (value: any) => {
    const num = Number(value) || 0;
    return num.toLocaleString();
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bank Invoice - ${safeString(data.invoiceNumber)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
      <style>
        @page { margin: 0; size: A4; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
          background: #ffffff;
          color: #1f2937;
          font-family: 'Inter', -apple-system, sans-serif;
          font-size: 10px;
          line-height: 1.4;
          width: 210mm;
          height: 297mm;
        }

        .page {
          background: #ffffff;
          padding: 20px 28px;
          width: 210mm;
          height: 297mm;
          display: flex;
          flex-direction: column;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding-bottom: 14px;
          margin-bottom: 14px;
          border-bottom: 2px solid #9ca3af;
        }

        .document-type {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .document-title {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          letter-spacing: -0.5px;
        }

        .logo { width: 70px; height: auto; }

        /* Meta Bar */
        .meta-bar {
          display: flex;
          margin-bottom: 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          overflow: hidden;
        }

        .meta-item {
          flex: 1;
          padding: 10px 12px;
          background: #f9fafb;
          border-right: 1px solid #d1d5db;
        }
        .meta-item:last-child { border-right: none; }
        .meta-item.highlight {
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
        }

        .meta-label {
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #9ca3af;
          margin-bottom: 2px;
        }
        .meta-item.highlight .meta-label { color: rgba(255,255,255,0.7); }

        .meta-value {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
        }
        .meta-item.highlight .meta-value { color: #ffffff; }

        /* Vehicle Banner */
        .vehicle-banner {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .vehicle-name {
          font-size: 15px;
          font-weight: 800;
          margin-bottom: 2px;
        }

        .vehicle-details {
          font-size: 9px;
          color: rgba(255,255,255,0.7);
        }

        .vehicle-year {
          background: #9ca3af;
          color: #111827;
          font-size: 12px;
          font-weight: 800;
          padding: 6px 12px;
          border-radius: 4px;
        }

        /* Sections */
        .sections-row {
          display: flex;
          gap: 12px;
          margin-bottom: 12px;
        }

        .section {
          flex: 1;
        }

        .section-header {
          display: flex;
          align-items: center;
          margin-bottom: 6px;
        }

        .section-icon {
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 8px;
        }
        .section-icon svg { width: 10px; height: 10px; fill: white; }

        .section-title {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #374151;
        }

        .section-content {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          overflow: hidden;
        }

        .info-row {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }
        .info-row:last-child { border-bottom: none; }

        .info-label {
          flex: 0 0 100px;
          padding: 8px 10px;
          font-size: 8px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          color: #6b7280;
          background: #f3f4f6;
          border-right: 1px solid #e5e7eb;
        }

        .info-value {
          flex: 1;
          padding: 8px 10px;
          font-size: 10px;
          font-weight: 500;
          color: #111827;
          background: #ffffff;
        }
        .info-value.highlight { font-weight: 700; color: #4b5563; }
        .info-value.mono { font-family: monospace; font-size: 9px; }

        /* Pricing */
        .pricing-card {
          border: 1px solid #d1d5db;
          border-radius: 8px;
          overflow: hidden;
          margin-bottom: 12px;
        }

        .pricing-header {
          background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
          color: white;
          padding: 10px 14px;
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .pricing-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid #f3f4f6;
        }
        .pricing-row:last-child { border-bottom: none; }

        .pricing-row.total {
          background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
          color: white;
        }

        .pricing-label { font-size: 10px; color: #6b7280; }
        .pricing-row.total .pricing-label { color: rgba(255,255,255,0.9); font-weight: 600; }

        .pricing-value { font-size: 12px; font-weight: 700; color: #111827; }
        .pricing-row.total .pricing-value { color: white; font-size: 14px; }

        .pricing-note { font-size: 8px; color: #9ca3af; }

        /* Validity */
        .validity-row {
          text-align: center;
          padding: 8px;
          background: #f3f4f6;
          border-radius: 6px;
          margin-bottom: 12px;
        }
        .validity-text {
          font-size: 9px;
          color: #6b7280;
          font-weight: 500;
        }
        .validity-text strong { color: #374151; }

        /* Signatures - Overlaid, Left Aligned, Above Footer */
        .signature-section {
          position: absolute;
          bottom: 100px;
          left: 28px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .signature-combined {
          position: relative;
          width: 360px;
          height: 220px;
        }

        .stamp-img {
          position: absolute;
          bottom: 0;
          left: 0;
          width: 220px;
          height: auto;
          opacity: 0.9;
        }

        .signature-img {
          position: absolute;
          bottom: 45px;
          left: 70px;
          width: 200px;
          height: auto;
          z-index: 2;
        }

        .signature-name {
          font-size: 11px;
          font-weight: 700;
          color: #111827;
          margin-top: 8px;
          padding-top: 6px;
          border-top: 2px solid #6b7280;
          min-width: 180px;
          text-transform: uppercase;
        }

        .signature-title {
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 1px;
          font-weight: 600;
        }

        /* Footer */
        .footer {
          position: absolute;
          bottom: 20px;
          left: 28px;
          right: 28px;
          padding-top: 10px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
        }

        .footer-company {
          font-size: 9px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 3px;
        }

        .footer-details {
          font-size: 8px;
          color: #6b7280;
          line-height: 1.4;
        }

        .footer-trn {
          font-size: 9px;
          font-weight: 600;
          color: #6b7280;
          margin-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <!-- Header -->
        <div class="header">
          <div>
            <div class="document-type">Official Invoice</div>
            <div class="document-title">PRE-OWNED VEHICLE INVOICE</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows" class="logo">
        </div>

        <!-- Meta Bar -->
        <div class="meta-bar">
          <div class="meta-item">
            <div class="meta-label">Invoice No.</div>
            <div class="meta-value">${safeString(data.invoiceNumber)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Invoice Date</div>
            <div class="meta-value">${formatDate(data.invoiceDate)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Reference</div>
            <div class="meta-value">${safeString(data.bankReference)}</div>
          </div>
          <div class="meta-item highlight">
            <div class="meta-label">Addressed To</div>
            <div class="meta-value">${safeString(data.bankName)}</div>
          </div>
        </div>

        <!-- Vehicle Banner -->
        <div class="vehicle-banner">
          <div>
            <div class="vehicle-name">${safeString(data.vehicleMakeModel)}</div>
            <div class="vehicle-details">Chassis: ${safeString(data.chassisNo)} • ${safeString(data.vehicleColour)} • ${safeNumber(data.vehicleMileage)} km</div>
          </div>
          <div class="vehicle-year">${safeString(data.modelYear)}</div>
        </div>

        <!-- Customer & Vehicle Sections Side by Side -->
        <div class="sections-row">
          <!-- Customer -->
          <div class="section">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              </div>
              <div class="section-title">Customer</div>
            </div>
            <div class="section-content">
              <div class="info-row">
                <div class="info-label">Name</div>
                <div class="info-value highlight">${safeString(data.customerName)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Contact</div>
                <div class="info-value">${safeString(data.customerPhone)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Email</div>
                <div class="info-value">${safeString(data.customerEmail)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Emirates ID</div>
                <div class="info-value mono">${safeString(data.emiratesId)}</div>
              </div>
            </div>
          </div>

          <!-- Vehicle -->
          <div class="section">
            <div class="section-header">
              <div class="section-icon">
                <svg viewBox="0 0 24 24"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>
              </div>
              <div class="section-title">Vehicle Details</div>
            </div>
            <div class="section-content">
              <div class="info-row">
                <div class="info-label">Make/Model</div>
                <div class="info-value highlight">${safeString(data.vehicleMakeModel)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Year</div>
                <div class="info-value">${safeString(data.modelYear)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Chassis</div>
                <div class="info-value mono">${safeString(data.chassisNo)}</div>
              </div>
              <div class="info-row">
                <div class="info-label">Colour</div>
                <div class="info-value">${safeString(data.vehicleColour)}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Pricing -->
        <div class="pricing-card">
          <div class="pricing-header">Finance Breakdown</div>
          <div class="pricing-row">
            <div>
              <div class="pricing-label">Vehicle Price</div>
              <div class="pricing-note">Including 5% VAT</div>
            </div>
            <div class="pricing-value">AED ${formatCurrency(data.bankQuotationPrice)}</div>
          </div>
          <div class="pricing-row">
            <div>
              <div class="pricing-label">Down Payment</div>
              <div class="pricing-note">${data.bankDownPaymentPct}% of vehicle price</div>
            </div>
            <div class="pricing-value">AED ${formatCurrency(data.bankDownPayment)}</div>
          </div>
          <div class="pricing-row total">
            <div class="pricing-label">Amount to Finance</div>
            <div class="pricing-value">AED ${formatCurrency(data.amountDue)}</div>
          </div>
        </div>

        <!-- Reference -->
        <div class="validity-row">
          <div class="validity-text">Bank Reference: <strong>${safeString(data.bankReference)}</strong></div>
        </div>

        <!-- Signature & Stamp Overlay - Fixed Bottom Left -->
        <div class="signature-section">
          <div class="signature-combined">
            ${stampSrc ? `<img src="${stampSrc}" alt="Company Stamp" class="stamp-img">` : ''}
            ${signatureSrc ? `<img src="${signatureSrc}" alt="Signature" class="signature-img">` : ''}
          </div>
          <div class="signature-name">Glen Hawkins</div>
          <div class="signature-title">Authorized Signatory</div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-company">SilberArrows Used Car Trading L.L.C</div>
          <div class="footer-details">
            Al Manara Street, Al Quoz 1, Dubai, UAE | P.O. Box 185095 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com
          </div>
          <div class="footer-trn">TRN: 100281137800003</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { applicationId } = body;

    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    console.log('[generate-bank-invoice] Fetching application:', applicationId);

    // Fetch application with related data
    const { data: application, error: appError } = await supabase
      .from('uv_bank_finance_applications')
      .select(`
        *,
        sales_order:uv_sales_orders!inner(
          *,
          lead:leads!inner(*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('[generate-bank-invoice] Error fetching application:', appError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate invoice number if not exists
    let invoiceNumber = application.bank_invoice_number;
    if (!invoiceNumber) {
      const { data: counterData, error: counterError } = await supabase.rpc('get_next_document_number', {
        p_document_type: 'bank_invoice'
      });
      
      if (counterError) {
        console.error('[generate-bank-invoice] Error getting document number:', counterError);
        // Fallback to timestamp-based number
        invoiceNumber = `BI-${Date.now()}`;
      } else {
        invoiceNumber = counterData;
      }
    }

    // Get logo as base64
    const logoFileCandidates = [
      path.join(process.cwd(), 'public', 'main-logo.png'),
      path.join(process.cwd(), 'public', 'MAIN LOGO.png'),
    ];
    let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
    for (const candidate of logoFileCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          const logoBuffer = fs.readFileSync(candidate);
          const b64 = logoBuffer.toString('base64');
          logoSrc = `data:image/png;base64,${b64}`;
          break;
        }
      } catch (logoError) {
        console.warn('[generate-bank-invoice] Logo file not found:', candidate);
      }
    }

    // Get company stamp as base64
    const stampFileCandidates = [
      path.join(process.cwd(), 'public', 'unnamed@1x_1-1.png'),
      path.join(process.cwd(), 'public', 'company-stamp.png'),
    ];
    let stampSrc = '';
    for (const candidate of stampFileCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          const stampBuffer = fs.readFileSync(candidate);
          const b64 = stampBuffer.toString('base64');
          stampSrc = `data:image/png;base64,${b64}`;
          break;
        }
      } catch (stampError) {
        console.warn('[generate-bank-invoice] Stamp file not found:', candidate);
      }
    }

    // Get signature as base64
    const signatureFilePath = path.join(process.cwd(), 'public', '4eb96ec09c7c44204b994499cc716641.png');
    let signatureSrc = '';
    try {
      if (fs.existsSync(signatureFilePath)) {
        const sigBuffer = fs.readFileSync(signatureFilePath);
        const b64 = sigBuffer.toString('base64');
        signatureSrc = `data:image/png;base64,${b64}`;
      }
    } catch (sigError) {
      console.warn('[generate-bank-invoice] Signature file not found');
    }

    // Prepare data for template
    const salesOrder = application.sales_order;
    const lead = salesOrder.lead;

    // Calculate pricing values based on APPROVED amount
    const bankQuotationPrice = application.bank_quotation_price || application.actual_vehicle_price || salesOrder.total_amount;
    const approvedFinanceAmount = application.approved_amount || application.bank_finance_amount || 0;
    
    // Down payment = Vehicle Price - Approved Finance Amount
    const bankDownPayment = bankQuotationPrice - approvedFinanceAmount;
    const bankDownPaymentPct = bankQuotationPrice > 0 ? Math.round((bankDownPayment / bankQuotationPrice) * 100) : 0;
    const amountDue = approvedFinanceAmount;

    const invoiceData: BankInvoiceData = {
      applicationId: application.id,
      invoiceNumber,
      invoiceDate: new Date().toISOString().split('T')[0],
      customerName: salesOrder.customer_name || lead.full_name || '',
      customerPhone: salesOrder.customer_phone || `${lead.country_code || ''}${lead.phone_number || ''}`,
      customerEmail: salesOrder.customer_email || lead.email || '',
      emiratesId: salesOrder.customer_id_type === 'EID' ? salesOrder.customer_id_number : (salesOrder.customer_id_number || ''),
      vehicleMakeModel: salesOrder.vehicle_make_model || '',
      modelYear: salesOrder.model_year?.toString() || '',
      chassisNo: salesOrder.chassis_no || '',
      vehicleColour: salesOrder.vehicle_colour || '',
      vehicleMileage: salesOrder.vehicle_mileage?.toString() || '',
      bankQuotationPrice,
      bankDownPayment,
      bankDownPaymentPct,
      amountDue,
      bankName: application.bank_name || 'Bank',
      bankReference: application.bank_reference || '',
    };

    // Generate HTML
    console.log('[generate-bank-invoice] Generating HTML...');
    const htmlContent = generateBankInvoiceHTML(invoiceData, logoSrc, stampSrc, signatureSrc);

    // Call PDFShift API
    console.log('[generate-bank-invoice] Calling PDFShift API...');
    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: htmlContent,
        format: 'A4',
        margin: '0',
        landscape: false,
        use_print: true,
        delay: 1000
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[generate-bank-invoice] PDFShift error:', pdfShiftResponse.status, errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status} - ${errorText}`);
    }

    console.log('[generate-bank-invoice] PDF generated successfully');
    const pdfBuffer = await pdfShiftResponse.arrayBuffer();

    // Upload to Supabase storage
    const fileName = `bank-invoice-${applicationId}-${Date.now()}.pdf`;
    console.log('[generate-bank-invoice] Uploading to storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[generate-bank-invoice] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update application with PDF URL and invoice number
    const { error: updateError } = await supabase
      .from('uv_bank_finance_applications')
      .update({
        bank_invoice_number: invoiceNumber,
        bank_invoice_pdf_url: pdfUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('[generate-bank-invoice] Error updating application:', updateError);
    }

    console.log('[generate-bank-invoice] Complete! URL:', pdfUrl);

    return NextResponse.json({
      success: true,
      pdfUrl,
      invoiceNumber
    });

  } catch (error: any) {
    console.error('[generate-bank-invoice] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate bank invoice' },
      { status: 500 }
    );
  }
}

