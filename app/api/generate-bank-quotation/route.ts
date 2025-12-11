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
  // Bank details
  bankName: string;
}

// Generate HTML content for Bank Quotation document
function generateBankQuotationHTML(data: BankQuotationData, logoSrc: string) {
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
          background: radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%, #000000 100%);
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          background: radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%, #000000 100%);
          color: white;
          font-family: 'Arial', sans-serif;
          font-size: 10px;
          line-height: 1.25;
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 0;
          overflow: hidden;
          box-sizing: border-box;
        }

        .page {
          background: rgba(255, 255, 255, 0.02);
          border: none;
          padding: 15px 10px 15px 10px;
          width: 210mm;
          height: 297mm;
          position: relative;
          overflow: hidden;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin: 0 0 25px 0;
          padding: 10px 15px 8px 15px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 15px;
          position: relative;
          z-index: 2;
          width: 100%;
          box-sizing: border-box;
        }

        .header::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.1) 0%, 
            rgba(255, 255, 255, 0.02) 50%, 
            rgba(255, 255, 255, 0.08) 100%);
          border-radius: 15px;
          pointer-events: none;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          position: relative;
          z-index: 3;
        }

        .title {
          font-size: 21px;
          font-weight: 900;
          color: white;
          margin-bottom: 8px;
          letter-spacing: 0.5px;
          line-height: 1.1;
        }

        .logo {
          width: 55px;
          height: auto;
          position: relative;
          z-index: 3;
        }

        .content-container {
          position: relative;
          z-index: 1;
          width: 100%;
          flex: 1 1 auto;
          overflow: visible;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .section {
          margin: 0;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          padding: 10px 12px;
          position: relative;
          width: 100%;
          box-sizing: border-box;
        }

        .section::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.06) 0%, 
            rgba(255, 255, 255, 0.01) 50%, 
            rgba(255, 255, 255, 0.04) 100%);
          border-radius: 12px;
          pointer-events: none;
        }

        .section-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 8px;
          color: white;
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
          z-index: 2;
          padding-bottom: 4px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.15);
        }

        .form-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          overflow: hidden;
          position: relative;
          z-index: 2;
          box-sizing: border-box;
        }

        .form-table td {
          border: 1px solid rgba(255, 255, 255, 0.15);
          padding: 8px 10px;
          vertical-align: middle;
          color: white;
          font-size: 10px;
          background: rgba(255, 255, 255, 0.02);
          position: relative;
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
          background: rgba(255, 255, 255, 0.08);
          font-weight: bold;
          width: 25%;
          color: rgba(255, 255, 255, 0.95);
        }

        .form-table .data {
          width: 25%;
        }

        .price-section {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .price-label {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .price-value {
          font-size: 36px;
          font-weight: 900;
          color: white;
          letter-spacing: 1px;
        }

        .bank-badge {
          display: inline-block;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 20px;
          padding: 8px 20px;
          font-size: 11px;
          color: white;
          margin-top: 15px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .footer {
          text-align: center;
          margin-top: auto;
          padding-top: 15px;
          font-size: 8px;
          color: rgba(255, 255, 255, 0.7);
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          position: relative;
          z-index: 2;
        }

        .stamp-section {
          margin-top: 20px;
          padding: 15px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          position: relative;
          z-index: 2;
        }

        .stamp-box {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 30px;
        }

        .stamp-item {
          flex: 1;
        }

        .stamp-label {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 8px;
        }

        .stamp-area {
          border: 1px dashed rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.02);
          height: 80px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.3);
          font-size: 9px;
        }

        .validity-note {
          font-size: 9px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          margin-top: 10px;
          font-style: italic;
        }

        .disclaimer {
          font-size: 8px;
          color: rgba(255, 255, 255, 0.5);
          text-align: center;
          padding: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          margin-top: 15px;
          position: relative;
          z-index: 2;
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
                <td class="label">Prepared For:</td>
                <td class="data">${safeString(data.bankName)}</td>
              </tr>
            </table>
          </div>

          <!-- CUSTOMER SECTION -->
          <div class="section">
            <div class="section-title">CUSTOMER DETAILS</div>
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
            <div class="section-title">VEHICLE DETAILS</div>
            <table class="form-table">
              <tr>
                <td class="label">Make & Model:</td>
                <td class="data">${safeString(data.vehicleMakeModel)}</td>
                <td class="label">Model Year:</td>
                <td class="data">${safeString(data.modelYear)}</td>
              </tr>
              <tr>
                <td class="label">Chassis No.:</td>
                <td class="data">${safeString(data.chassisNo)}</td>
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
          <div class="section">
            <div class="section-title">VEHICLE PRICE</div>
            <div class="price-section">
              <div class="price-label">Total Vehicle Price (Including VAT)</div>
              <div class="price-value">${formatCurrency(data.bankQuotationPrice)}</div>
              <div class="bank-badge">For ${safeString(data.bankName)} Finance</div>
            </div>
          </div>

          <!-- STAMP & SIGNATURE -->
          <div class="stamp-section">
            <div class="stamp-box">
              <div class="stamp-item">
                <div class="stamp-label">Company Stamp</div>
                <div class="stamp-area">COMPANY STAMP</div>
              </div>
              <div class="stamp-item">
                <div class="stamp-label">Authorized Signature</div>
                <div class="stamp-area">SIGNATURE</div>
              </div>
            </div>
            <div class="validity-note">
              This quotation is valid until ${formatDate(data.validUntil)}. Prices are subject to change without prior notice.
            </div>
          </div>

          <div class="disclaimer">
            This quotation is issued for bank finance purposes only. The vehicle price stated above includes all applicable taxes.
            Terms and conditions apply. Subject to vehicle availability.
          </div>

          <!-- FOOTER -->
          <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095 | TRN: 100281137800003 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com
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

    // Get logo as base64
    const logoPath = path.join(process.cwd(), 'public', 'silberarrows-logo.png');
    let logoSrc = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoSrc = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (logoError) {
      console.warn('[generate-bank-quotation] Logo not found, using empty string');
    }

    // Prepare data for template
    const salesOrder = application.sales_order;
    const lead = salesOrder.lead;

    const quotationDate = application.bank_quotation_date || new Date().toISOString().split('T')[0];
    const validUntilDate = application.bank_quotation_valid_until || 
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // 7 days validity

    const quotationData: BankQuotationData = {
      applicationId: application.id,
      quotationNumber,
      quotationDate,
      validUntil: validUntilDate,
      customerName: lead.full_name || '',
      customerPhone: lead.phone_number || '',
      customerEmail: lead.email || salesOrder.customer_email || '',
      emiratesId: salesOrder.customer_id_type === 'Emirates ID' ? salesOrder.customer_id_number : '',
      vehicleMakeModel: salesOrder.vehicle_make_model || '',
      modelYear: salesOrder.model_year?.toString() || '',
      chassisNo: salesOrder.chassis_no || '',
      vehicleColour: salesOrder.vehicle_colour || '',
      vehicleMileage: salesOrder.vehicle_mileage?.toString() || '',
      bankQuotationPrice: application.bank_quotation_price || application.actual_vehicle_price || salesOrder.total_amount,
      bankName: application.bank_name || 'Bank',
    };

    // Generate HTML
    console.log('[generate-bank-quotation] Generating HTML...');
    const htmlContent = generateBankQuotationHTML(quotationData, logoSrc);

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


