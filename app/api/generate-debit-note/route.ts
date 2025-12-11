import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Generate HTML content for Debit Note document (White background)
function generateDebitNoteHTML(data: any, logoSrc: string) {
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

  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return `AED ${num.toLocaleString()}`;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>DEBIT NOTE</title>
      <style>
        @page {
          margin: 0;
          size: A4;
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
          font-size: 11px;
          line-height: 1.4;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 0;
        }

        .page {
          background: #ffffff;
          padding: 30px 40px;
          width: 210mm;
          min-height: 297mm;
          position: relative;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
          padding-bottom: 20px;
          border-bottom: 2px solid #dc2626;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .title {
          font-size: 28px;
          font-weight: 900;
          color: #dc2626;
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .subtitle {
          font-size: 12px;
          color: #666;
          margin-top: 5px;
        }

        .logo {
          width: 80px;
          height: auto;
        }

        .section {
          margin-bottom: 25px;
        }

        .section-title {
          font-size: 12px;
          font-weight: bold;
          color: #1a1a1a;
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dotted #ddd;
        }

        .info-label {
          color: #666;
          font-size: 10px;
          text-transform: uppercase;
        }

        .info-value {
          color: #1a1a1a;
          font-weight: 600;
        }

        .amount-box {
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
          border: 2px solid #dc2626;
          border-radius: 8px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
        }

        .amount-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .amount-value {
          font-size: 32px;
          font-weight: 900;
          color: #dc2626;
        }

        .reason-box {
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          padding: 20px;
          margin-top: 20px;
        }

        .reason-label {
          font-size: 10px;
          color: #666;
          text-transform: uppercase;
          margin-bottom: 8px;
        }

        .reason-text {
          font-size: 12px;
          color: #1a1a1a;
          line-height: 1.6;
        }

        .footer {
          position: absolute;
          bottom: 30px;
          left: 40px;
          right: 40px;
          text-align: center;
          font-size: 9px;
          color: #666;
          padding-top: 15px;
          border-top: 1px solid #ddd;
        }

        .electronic-notice {
          text-align: center;
          margin-top: 30px;
          padding: 10px;
          background: #fafafa;
          border: 1px dashed #ddd;
          border-radius: 6px;
        }

        .electronic-notice-text {
          font-size: 10px;
          color: #888;
          font-style: italic;
        }

        .stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-size: 60px;
          font-weight: bold;
          color: rgba(220, 38, 38, 0.12);
          text-transform: uppercase;
          letter-spacing: 5px;
          pointer-events: none;
        }

        .note-box {
          background: #fef2f2;
          border: 1px solid #dc2626;
          border-radius: 6px;
          padding: 15px;
          margin-top: 20px;
          font-size: 10px;
          color: #991b1b;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="stamp">DEBIT NOTE</div>
        
        <div class="header">
          <div class="title-section">
            <div class="title">Debit Note</div>
            <div class="subtitle">Additional Charge</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="section">
          <div class="section-title">Debit Note Details</div>
          <div class="info-grid">
            <div>
              <div class="info-row">
                <span class="info-label">Debit Note No.</span>
                <span class="info-value">${data.adjustmentNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(data.createdAt)}</span>
              </div>
              ${data.invoiceNumber ? `
              <div class="info-row">
                <span class="info-label">Applied to Invoice</span>
                <span class="info-value">${data.invoiceNumber}</span>
              </div>
              ` : ''}
            </div>
            <div>
              <div class="info-row">
                <span class="info-label">Customer Name</span>
                <span class="info-value">${data.customerName}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Customer ID</span>
                <span class="info-value">${data.customerId || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Contact</span>
                <span class="info-value">${data.customerPhone || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        ${data.vehicleMakeModel ? `
        <div class="section">
          <div class="section-title">Vehicle Details</div>
          <div class="info-grid">
            <div>
              <div class="info-row">
                <span class="info-label">Vehicle</span>
                <span class="info-value">${data.vehicleMakeModel}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Model Year</span>
                <span class="info-value">${data.modelYear || '-'}</span>
              </div>
            </div>
            <div>
              <div class="info-row">
                <span class="info-label">Chassis No.</span>
                <span class="info-value">${data.chassisNo || '-'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Colour</span>
                <span class="info-value">${data.vehicleColour || '-'}</span>
              </div>
            </div>
          </div>
        </div>
        ` : ''}

        <div class="amount-box">
          <div class="amount-label">Additional Amount Due</div>
          <div class="amount-value">+${formatCurrency(data.amount)}</div>
        </div>

        <div class="reason-box">
          <div class="reason-label">Reason for Debit</div>
          <div class="reason-text">${data.reason || 'No reason specified'}</div>
        </div>

        <div class="note-box">
          <strong>Note:</strong> This debit note increases the balance due on the referenced invoice. 
          The additional charge has been automatically applied to the customer's account.
        </div>

        <div class="electronic-notice">
          <p class="electronic-notice-text">This is an electronically generated document. No signature is required.</p>
        </div>

        <div class="footer">
          Silber Arrows 1934 Used Car Trading LLC | Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
          TRN: 100281137800003 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adjustmentId } = body;
    
    console.log('[generate-debit-note] Request received:', { adjustmentId });

    if (!adjustmentId) {
      return NextResponse.json(
        { error: 'Adjustment ID is required' },
        { status: 400 }
      );
    }

    // Resolve logo
    const logoFileCandidates = [
      path.join(process.cwd(), 'public', 'main-logo.png'),
      path.join(process.cwd(), 'renderer', 'public', 'main-logo.png')
    ];
    let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
    for (const candidate of logoFileCandidates) {
      try {
        if (fs.existsSync(candidate)) {
          const data = fs.readFileSync(candidate);
          const b64 = data.toString('base64');
          logoSrc = `data:image/png;base64,${b64}`;
          break;
        }
      } catch (e) {
        // continue
      }
    }

    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }

    // Fetch adjustment data
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('uv_adjustments')
      .select('*')
      .eq('id', adjustmentId)
      .eq('adjustment_type', 'debit_note')
      .single();

    if (adjustmentError || !adjustment) {
      console.error('[generate-debit-note] Adjustment fetch error:', adjustmentError);
      return NextResponse.json(
        { error: 'Debit note not found' },
        { status: 404 }
      );
    }

    // Fetch lead/customer data
    const { data: lead } = await supabase
      .from('leads')
      .select('id, full_name, customer_number, phone_number, email')
      .eq('id', adjustment.lead_id)
      .single();

    // Fetch sales order to get vehicle and customer details (with lead for customer_number)
    const { data: salesOrder } = await supabase
      .from('uv_sales_orders')
      .select(`
        *,
        leads!inner(customer_number)
      `)
      .eq('lead_id', adjustment.lead_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch invoice if linked
    let invoiceNumber = null;
    if (adjustment.invoice_id) {
      const { data: invoice } = await supabase
        .from('uv_invoices')
        .select('invoice_number')
        .eq('id', adjustment.invoice_id)
        .single();
      invoiceNumber = invoice?.invoice_number;
    }

    // Prepare data for template
    const templateData = {
      adjustmentNumber: adjustment.adjustment_number,
      createdAt: adjustment.created_at,
      amount: adjustment.amount,
      reason: adjustment.reason,
      invoiceNumber,
      // Customer details from sales order or lead
      customerName: salesOrder?.customer_name || lead?.full_name || 'Customer',
      customerId: lead?.customer_number || (salesOrder as any)?.leads?.customer_number || (lead?.id ? `CUS-${lead.id.substring(0, 8).toUpperCase()}` : null),
      customerPhone: salesOrder?.customer_phone || lead?.phone_number,
      customerEmail: salesOrder?.customer_email || lead?.email,
      customerIdType: salesOrder?.customer_id_type,
      customerIdNumber: salesOrder?.customer_id_number,
      // Vehicle details from sales order
      vehicleMakeModel: salesOrder?.vehicle_make_model,
      modelYear: salesOrder?.model_year,
      chassisNo: salesOrder?.chassis_no,
      vehicleColour: salesOrder?.vehicle_colour,
    };

    // Generate HTML
    const htmlContent = generateDebitNoteHTML(templateData, logoSrc);

    // Call PDFShift
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
        delay: 500
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[generate-debit-note] PDFShift error:', errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status}`);
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    
    // Upload to Supabase storage
    const fileName = `debit-note-${adjustmentId}-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update adjustment with PDF URL
    await supabase
      .from('uv_adjustments')
      .update({ pdf_url: publicUrl })
      .eq('id', adjustmentId);

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      adjustmentId,
      adjustmentNumber: adjustment.adjustment_number
    });

  } catch (error) {
    console.error('[generate-debit-note] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

