import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Generate HTML content for Receipt document (White background)
function generateReceiptHTML(data: any, logoSrc: string) {
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

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'card': 'Credit/Debit Card',
      'bank_transfer': 'Bank Transfer',
      'cheque': 'Cheque',
      'bank_finance': 'Bank Finance'
    };
    return methods[method] || method;
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RECEIPT</title>
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
          font-size: 10px;
          line-height: 1.4;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 0;
        }

        .page {
          background: #ffffff;
          padding: 25px 35px;
          width: 210mm;
          min-height: 297mm;
          position: relative;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 25px;
          padding-bottom: 15px;
          border-bottom: 2px solid #1a1a1a;
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
          letter-spacing: 2px;
          text-transform: uppercase;
        }

        .receipt-number {
          font-size: 14px;
          color: #666;
          margin-top: 5px;
          font-weight: 600;
        }

        .logo {
          width: 70px;
          height: auto;
        }

        .meta-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 12px 15px;
          background: #f8f8f8;
          border-radius: 6px;
        }

        .meta-item {
          text-align: center;
        }

        .meta-label {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .meta-value {
          font-size: 12px;
          font-weight: 700;
          color: #1a1a1a;
          margin-top: 2px;
        }

        .section {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 11px;
          font-weight: bold;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }

        .details-table {
          width: 100%;
          border-collapse: collapse;
        }

        .details-table td {
          padding: 8px 12px;
          border: 1px solid #e5e5e5;
          font-size: 10px;
        }

        .details-table .label {
          background: #f5f5f5;
          font-weight: 600;
          color: #555;
          width: 25%;
        }

        .details-table .value {
          color: #1a1a1a;
          width: 25%;
        }

        .amount-box {
          background: #f5f5f5;
          border: 2px solid #e0e0e0;
          border-radius: 10px;
          padding: 30px;
          text-align: center;
          margin: 25px 0;
        }

        .amount-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 10px;
        }

        .amount-value {
          font-size: 38px;
          font-weight: 900;
          color: #1a1a1a;
          letter-spacing: 1px;
        }

        .payment-method-badge {
          display: inline-block;
          background: #e8e8e8;
          color: #333;
          padding: 5px 15px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 600;
          margin-top: 12px;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .footer {
          position: absolute;
          bottom: 25px;
          left: 35px;
          right: 35px;
          text-align: center;
          font-size: 8px;
          color: #999;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }

        .electronic-notice {
          text-align: center;
          margin-top: 40px;
          padding: 15px;
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
          top: 45%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-size: 90px;
          font-weight: bold;
          color: rgba(34, 197, 94, 0.12);
          text-transform: uppercase;
          letter-spacing: 15px;
          pointer-events: none;
        }

        .thank-you {
          text-align: center;
          margin: 25px 0;
          padding: 15px;
          background: #f0fdf4;
          border: 1px solid #bbf7d0;
          border-radius: 8px;
        }

        .thank-you-text {
          font-size: 12px;
          color: #166534;
          font-weight: 600;
        }

        .thank-you-sub {
          font-size: 10px;
          color: #4ade80;
          margin-top: 3px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="stamp">PAID</div>
        
        <div class="header">
          <div class="title-section">
            <div class="title">Receipt</div>
            <div class="receipt-number">${data.paymentNumber}</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="meta-row">
          <div class="meta-item">
            <div class="meta-label">Receipt Date</div>
            <div class="meta-value">${formatDate(data.paymentDate)}</div>
          </div>
          <div class="meta-item">
            <div class="meta-label">Payment Method</div>
            <div class="meta-value">${getPaymentMethodLabel(data.paymentMethod)}</div>
          </div>
          ${data.reference ? `
          <div class="meta-item">
            <div class="meta-label">Reference</div>
            <div class="meta-value">${data.reference}</div>
          </div>
          ` : ''}
          ${data.invoiceNumber ? `
          <div class="meta-item">
            <div class="meta-label">Invoice</div>
            <div class="meta-value">${data.invoiceNumber}</div>
          </div>
          ` : ''}
        </div>

        <div class="section">
          <div class="section-title">Customer Details</div>
          <table class="details-table">
            <tr>
              <td class="label">Customer Name</td>
              <td class="value">${data.customerName}</td>
              <td class="label">Customer ID</td>
              <td class="value">${data.customerId || '-'}</td>
            </tr>
            <tr>
              <td class="label">Contact Number</td>
              <td class="value">${data.customerPhone || '-'}</td>
              <td class="label">Email</td>
              <td class="value">${data.customerEmail || '-'}</td>
            </tr>
            ${data.customerIdType ? `
            <tr>
              <td class="label">${data.customerIdType}</td>
              <td class="value" colspan="3">${data.customerIdNumber || '-'}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        ${data.vehicleMakeModel ? `
        <div class="section">
          <div class="section-title">Vehicle Details</div>
          <table class="details-table">
            <tr>
              <td class="label">Vehicle</td>
              <td class="value">${data.vehicleMakeModel}</td>
              <td class="label">Model Year</td>
              <td class="value">${data.modelYear || '-'}</td>
            </tr>
            <tr>
              <td class="label">Chassis No.</td>
              <td class="value">${data.chassisNo || '-'}</td>
              <td class="label">Colour</td>
              <td class="value">${data.vehicleColour || '-'}</td>
            </tr>
          </table>
        </div>
        ` : ''}

        <div class="amount-box">
          <div class="amount-label">Amount Received</div>
          <div class="amount-value">${formatCurrency(data.amount)}</div>
          <div class="payment-method-badge">${getPaymentMethodLabel(data.paymentMethod)}</div>
        </div>

        <div class="thank-you">
          <div class="thank-you-text">Thank you for your payment</div>
          <div class="thank-you-sub">This receipt confirms your payment has been received</div>
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
    const { paymentId } = body;
    
    console.log('[generate-receipt] Request received:', { paymentId });

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
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

    // Fetch payment data
    const { data: payment, error: paymentError } = await supabase
      .from('uv_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('[generate-receipt] Payment fetch error:', paymentError);
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Fetch lead/customer data
    const { data: lead } = await supabase
      .from('leads')
      .select('id, full_name, customer_number, phone_number, email')
      .eq('id', payment.lead_id)
      .single();

    // Fetch sales order to get vehicle and customer details (with lead for customer_number)
    const { data: salesOrder } = await supabase
      .from('uv_sales_orders')
      .select(`
        *,
        leads!inner(customer_number)
      `)
      .eq('lead_id', payment.lead_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    console.log('[generate-receipt] Lead customer_number:', lead?.customer_number);
    console.log('[generate-receipt] Sales Order lead customer_number:', (salesOrder as any)?.leads?.customer_number);

    // Fetch first allocation to get invoice number
    const { data: firstAllocation } = await supabase
      .from('uv_payment_allocations')
      .select(`
        invoice_id,
        uv_invoices!inner(invoice_number)
      `)
      .eq('payment_id', paymentId)
      .limit(1)
      .single();

    const invoiceNumber = (firstAllocation as any)?.uv_invoices?.invoice_number || null;

    // Prepare data for template - prefer sales order data, fallback to lead data
    const templateData = {
      paymentNumber: payment.payment_number,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      amount: payment.amount,
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
    const htmlContent = generateReceiptHTML(templateData, logoSrc);

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
      console.error('[generate-receipt] PDFShift error:', errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status}`);
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    
    // Upload to Supabase storage
    const fileName = `receipt-${paymentId}-${Date.now()}.pdf`;
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

    // Update payment with PDF URL
    await supabase
      .from('uv_payments')
      .update({ pdf_url: publicUrl })
      .eq('id', paymentId);

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      paymentId,
      paymentNumber: payment.payment_number
    });

  } catch (error) {
    console.error('[generate-receipt] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
