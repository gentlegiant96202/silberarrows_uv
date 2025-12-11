import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

interface BankQuotationData {
  applicationId: string;
  quotationNumber: string;
  quotationDate: string;
  validUntil: string;
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
  // Pricing (inflated for bank)
  bankQuotationPrice: number;
  bankDownPayment: number;
  bankDownPaymentPct: number;
  amountDue: number; // What bank will finance
  // Bank details
  bankName: string;
}

// Generate HTML content for Bank Quotation document
function generateBankQuotationHTML(data: BankQuotationData, logoSrc: string, stampSrc: string, signatureSrc: string) {
  const documentTitle = 'BANK FINANCE QUOTATION';
  
  // Safely handle string values
  const safeString = (value: any) => String(value || '');

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  // Format currency
  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return `AED ${num.toLocaleString()}`;
  };

  // Safely handle numeric values
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
      <title>${documentTitle}</title>
      <style>
        @page {
          margin: 0;
          background: #ffffff;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: #ffffff;
          color: #1a1a1a;
          font-family: 'Arial', sans-serif;
          font-size: 10px;
          line-height: 1.25;
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }

        .page {
          background: #ffffff;
          padding: 15px 20px;
          width: 210mm;
          height: 297mm;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 0 0 20px 0;
          padding: 12px 18px 10px 18px;
          background: #f8f8f8;
          border: 1px solid #e0e0e0;
          border-radius: 12px;
          position: relative;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .title {
          font-size: 26px;
          font-weight: 900;
          color: #1a1a1a;
          letter-spacing: 1px;
          line-height: 1.15;
        }

        .logo {
          width: 70px;
          height: auto;
        }

        .content-container {
          position: relative;
          width: 100%;
          flex: 1 1 auto;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .section {
          margin: 0;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 10px 14px;
          position: relative;
          width: 100%;
        }

        .section-title {
          font-size: 11px;
          font-weight: bold;
          margin-bottom: 6px;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-bottom: 4px;
          border-bottom: 1px solid #ddd;
        }

        .form-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0;
          background: #ffffff;
          border-radius: 6px;
          overflow: hidden;
        }

        .form-table td {
          border: 1px solid #e5e5e5;
          padding: 8px 10px;
          vertical-align: middle;
          color: #1a1a1a;
          font-size: 10px;
          background: #ffffff;
        }

        .form-table td:first-child {
          border-left: none;
        }

        .form-table td:last-child {
          border-right: none;
        }

        .form-table tr:first-child td {
          border-top: none;
        }

        .form-table tr:last-child td {
          border-bottom: none;
        }

        .form-table .label {
          background: #f5f5f5;
          font-weight: bold;
          width: 25%;
          color: #444;
        }

        .form-table .data {
          width: 25%;
        }

        /* Pricing Section - matching sales order style */
        .pricing-section {
          margin: 0;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
          padding: 10px 14px;
        }

        .totals-table {
          width: 100%;
          margin-top: 8px;
        }

        .totals-table td {
          padding: 6px 10px;
          font-size: 10px;
        }

        .totals-table .label-cell {
          text-align: right;
          width: 70%;
          color: #666;
        }

        .totals-table .value-cell {
          text-align: right;
          width: 30%;
          color: #1a1a1a;
          font-weight: 600;
        }

        .totals-table .total-row td {
          font-weight: bold;
          font-size: 14px;
          border-top: 2px solid #1a1a1a;
          padding-top: 10px;
          color: #1a1a1a;
        }

        .totals-table .subtotal-row td {
          border-top: 1px solid #ddd;
          padding-top: 8px;
        }

        /* Signature Section - matching sales order style */
        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 15px;
          gap: 40px;
          padding: 15px;
          background: #fafafa;
          border: 1px solid #e5e5e5;
          border-radius: 10px;
        }

        .signature-box {
          flex: 1;
          text-align: center;
        }

        .signature-box.stamp {
          flex: 1.3;
        }

        .signature-label {
          font-size: 9px;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #666;
          margin-bottom: 10px;
          font-weight: bold;
        }

        .signature-area {
          background: #ffffff;
          border: 1px solid #ddd;
          height: 120px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 8px;
        }

        .signature-area img {
          max-height: 110px;
          max-width: 90%;
          object-fit: contain;
        }

        .signature-box.stamp .signature-area {
          height: 150px;
        }

        .signature-box.stamp .signature-area img {
          max-height: 140px;
        }

        .signature-name {
          font-size: 10px;
          color: #1a1a1a;
          font-weight: 600;
          border-top: 1px solid #1a1a1a;
          padding-top: 5px;
          display: inline-block;
          min-width: 120px;
        }

        .validity-note {
          text-align: center;
          margin-top: 12px;
          padding: 8px;
          font-size: 9px;
          color: #666;
          font-style: italic;
        }

        .footer {
          text-align: center;
          margin-top: auto;
          padding-top: 12px;
          font-size: 8px;
          color: #666;
          border-top: 1px solid #ddd;
        }

        .footer-company {
          font-weight: bold;
          color: #1a1a1a;
          font-size: 9px;
          margin-bottom: 4px;
        }

        .footer-trn {
          color: #888;
          margin-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="title-section">
            <div class="title">PRE-OWNED VEHICLE<br>QUOTATION</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="content-container">
          <!-- DOCUMENT INFO -->
          <div class="section">
            <table class="form-table">
              <tr>
                <td class="label">Quotation No.:</td>
                <td class="data">${safeString(data.quotationNumber)}</td>
                <td class="label">Date:</td>
                <td class="data">${formatDate(data.quotationDate)}</td>
              </tr>
              <tr>
                <td class="label">Valid Until:</td>
                <td class="data">${formatDate(data.validUntil)}</td>
                <td class="label">Addressed To:</td>
                <td class="data"><strong>${safeString(data.bankName)}</strong></td>
              </tr>
            </table>
          </div>

          <!-- CUSTOMER SECTION -->
          <div class="section">
            <div class="section-title">Customer</div>
            <table class="form-table">
              <tr>
                <td class="label">Customer Name:</td>
                <td class="data">${safeString(data.customerName)}</td>
                <td class="label">Contact No.:</td>
                <td class="data">${safeString(data.customerPhone)}</td>
              </tr>
              <tr>
                <td class="label">Email Address:</td>
                <td class="data">${safeString(data.customerEmail)}</td>
                <td class="label">Emirates ID:</td>
                <td class="data">${safeString(data.emiratesId)}</td>
              </tr>
            </table>
          </div>

          <!-- VEHICLE SECTION -->
          <div class="section">
            <div class="section-title">Vehicle</div>
            <table class="form-table">
              <tr>
                <td class="label">Make & Model:</td>
                <td class="data"><strong>${safeString(data.vehicleMakeModel)}</strong></td>
                <td class="label">Model Year:</td>
                <td class="data">${safeString(data.modelYear)}</td>
              </tr>
              <tr>
                <td class="label">Chassis No.:</td>
                <td class="data" style="font-family: monospace;">${safeString(data.chassisNo)}</td>
                <td class="label">Colour:</td>
                <td class="data">${safeString(data.vehicleColour)}</td>
              </tr>
              <tr>
                <td class="label">Mileage (Km):</td>
                <td class="data">${safeNumber(data.vehicleMileage)}</td>
                <td class="label"></td>
                <td class="data"></td>
              </tr>
            </table>
          </div>

          <!-- PRICING SECTION -->
          <div class="pricing-section">
            <div class="section-title">Pricing</div>
            <table class="totals-table">
              <tr>
                <td class="label-cell">Vehicle Price (Including VAT):</td>
                <td class="value-cell">${formatCurrency(data.bankQuotationPrice)}</td>
              </tr>
              <tr class="subtotal-row">
                <td class="label-cell">Down Payment (${safeNumber(data.bankDownPaymentPct)}%):</td>
                <td class="value-cell">${formatCurrency(data.bankDownPayment)}</td>
              </tr>
              <tr class="total-row">
                <td class="label-cell">Amount to Finance:</td>
                <td class="value-cell">${formatCurrency(data.amountDue)}</td>
              </tr>
            </table>
          </div>

          <!-- SIGNATURE SECTION -->
          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-label">Authorized Signature</div>
              <div class="signature-area">
                ${signatureSrc ? `<img src="${signatureSrc}" alt="Signature">` : ''}
              </div>
              <div class="signature-name">Glen Hawkins</div>
            </div>
            <div class="signature-box stamp">
              <div class="signature-label">Company Stamp</div>
              <div class="signature-area">
                ${stampSrc ? `<img src="${stampSrc}" alt="Company Stamp">` : ''}
              </div>
            </div>
          </div>

          <div class="validity-note">
            This quotation is valid until ${formatDate(data.validUntil)}
          </div>

          <!-- FOOTER -->
          <div class="footer">
            <div class="footer-company">SilberArrows Used Car Trading L.L.C</div>
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com
            <div class="footer-trn">TRN: 100281137800003</div>
          </div>
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

    console.log('[generate-bank-quotation] Fetching application:', applicationId);

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
      console.error('[generate-bank-quotation] Error fetching application:', appError);
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Generate quotation number if not exists
    let quotationNumber = application.bank_quotation_number;
    if (!quotationNumber) {
      const { data: counterData, error: counterError } = await supabase.rpc('get_next_document_number', {
        p_document_type: 'bank_quotation'
      });
      
      if (counterError) {
        console.error('[generate-bank-quotation] Error getting document number:', counterError);
        return NextResponse.json({ error: 'Failed to generate quotation number' }, { status: 500 });
      }
      
      quotationNumber = counterData;
    }

    // Get logo as base64 - use main-logo.png with cloudinary fallback
    const logoFileCandidates = [
      path.join(process.cwd(), 'public', 'main-logo.png'),
      path.join(process.cwd(), 'public', 'MAIN LOGO.png'),
      path.join(process.cwd(), 'renderer', 'public', 'main-logo.png')
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
        console.warn('[generate-bank-quotation] Logo file not found:', candidate);
      }
    }

    // Get company stamp as base64
    const stampFileCandidates = [
      path.join(process.cwd(), 'public', 'unnamed@1x_1-1.png'),
      path.join(process.cwd(), 'public', 'company-stamp.png'),
      path.join(process.cwd(), 'renderer', 'public', 'company-stamp.png')
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
        console.warn('[generate-bank-quotation] Stamp file not found:', candidate);
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
      console.warn('[generate-bank-quotation] Signature file not found');
    }

    // Prepare data for template
    const salesOrder = application.sales_order;
    const lead = salesOrder.lead;

    const quotationDate = application.bank_quotation_date || new Date().toISOString().split('T')[0];
    const validUntilDate = application.bank_quotation_valid_until || 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days validity

    // Calculate pricing values
    const bankQuotationPrice = application.bank_quotation_price || application.actual_vehicle_price || salesOrder.total_amount;
    const bankDownPaymentPct = application.bank_required_down_pct || 20;
    const bankDownPayment = application.bank_shown_down_payment || Math.round(bankQuotationPrice * (bankDownPaymentPct / 100));
    const amountDue = application.bank_finance_amount || (bankQuotationPrice - bankDownPayment);

    const quotationData: BankQuotationData = {
      applicationId: application.id,
      quotationNumber,
      quotationDate,
      validUntil: validUntilDate,
      customerName: salesOrder.customer_name || lead.full_name || '',
      customerPhone: salesOrder.customer_phone || `${lead.country_code || ''}${lead.phone_number || ''}`,
      customerEmail: salesOrder.customer_email || lead.email || '',
      emiratesId: salesOrder.customer_id_type === 'Emirates ID' ? salesOrder.customer_id_number : '',
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
    };

    // Generate HTML
    console.log('[generate-bank-quotation] Generating HTML...');
    const htmlContent = generateBankQuotationHTML(quotationData, logoSrc, stampSrc, signatureSrc);

    // Call PDFShift API
    console.log('[generate-bank-quotation] Calling PDFShift API...');
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
      console.error('[generate-bank-quotation] PDFShift error:', pdfShiftResponse.status, errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status} - ${errorText}`);
    }

    console.log('[generate-bank-quotation] PDF generated successfully');
    const pdfBuffer = await pdfShiftResponse.arrayBuffer();

    // Upload to Supabase storage
    const fileName = `bank-quotation-${applicationId}-${Date.now()}.pdf`;
    console.log('[generate-bank-quotation] Uploading to storage:', fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('[generate-bank-quotation] Upload error:', uploadError);
      throw new Error(`Storage upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    const pdfUrl = urlData.publicUrl;

    // Update application with PDF URL and quotation details
    const { error: updateError } = await supabase
      .from('uv_bank_finance_applications')
      .update({
        bank_quotation_number: quotationNumber,
        bank_quotation_pdf_url: pdfUrl,
        bank_quotation_date: quotationDate,
        bank_quotation_valid_until: validUntilDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', applicationId);

    if (updateError) {
      console.error('[generate-bank-quotation] Error updating application:', updateError);
    }

    console.log('[generate-bank-quotation] Complete! URL:', pdfUrl);

    return NextResponse.json({
      success: true,
      pdfUrl,
      quotationNumber,
      quotationDate,
      validUntil: validUntilDate
    });

  } catch (error: any) {
    console.error('[generate-bank-quotation] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate bank quotation' },
      { status: 500 }
    );
  }
}


