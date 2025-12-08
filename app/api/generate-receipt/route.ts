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
          border-bottom: 2px solid #1a1a1a;
        }

        .title-section {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .title {
          font-size: 28px;
          font-weight: 900;
          color: #1a1a1a;
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
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 12px;
          padding-bottom: 5px;
          border-bottom: 1px solid #ddd;
        }

        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px 40px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          border-bottom: 1px solid #eee;
        }

        .info-label {
          color: #666;
          font-weight: 500;
        }

        .info-value {
          color: #1a1a1a;
          font-weight: 600;
          text-align: right;
        }

        .amount-box {
          background: #f8f8f8;
          border: 2px solid #1a1a1a;
          border-radius: 8px;
          padding: 25px;
          text-align: center;
          margin: 30px 0;
        }

        .amount-label {
          font-size: 14px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 10px;
        }

        .amount-value {
          font-size: 36px;
          font-weight: 900;
          color: #1a1a1a;
        }

        .allocations-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 15px;
        }

        .allocations-table th,
        .allocations-table td {
          padding: 10px 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        .allocations-table th {
          background: #f5f5f5;
          font-weight: 600;
          color: #1a1a1a;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .allocations-table td {
          font-size: 11px;
        }

        .allocations-table .amount-col {
          text-align: right;
        }

        .footer {
          position: absolute;
          bottom: 30px;
          left: 40px;
          right: 40px;
          text-align: center;
          font-size: 9px;
          color: #999;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .signature-section {
          display: flex;
          justify-content: space-between;
          margin-top: 50px;
          gap: 60px;
        }

        .signature-box {
          flex: 1;
        }

        .signature-label {
          font-size: 10px;
          color: #666;
          margin-bottom: 8px;
        }

        .signature-line {
          border-bottom: 1px solid #1a1a1a;
          height: 50px;
        }

        .stamp {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(-15deg);
          font-size: 80px;
          font-weight: bold;
          color: rgba(34, 197, 94, 0.15);
          text-transform: uppercase;
          letter-spacing: 10px;
          pointer-events: none;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="stamp">RECEIVED</div>
        
        <div class="header">
          <div class="title-section">
            <div class="title">Receipt</div>
            <div class="subtitle">Payment Confirmation</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="section">
          <div class="info-grid">
            <div>
              <div class="info-row">
                <span class="info-label">Receipt No.</span>
                <span class="info-value">${data.paymentNumber}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date</span>
                <span class="info-value">${formatDate(data.paymentDate)}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Payment Method</span>
                <span class="info-value">${getPaymentMethodLabel(data.paymentMethod)}</span>
              </div>
              ${data.reference ? `
              <div class="info-row">
                <span class="info-label">Reference</span>
                <span class="info-value">${data.reference}</span>
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
              ${data.customerPhone ? `
              <div class="info-row">
                <span class="info-label">Contact</span>
                <span class="info-value">${data.customerPhone}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="amount-box">
          <div class="amount-label">Amount Received</div>
          <div class="amount-value">${formatCurrency(data.amount)}</div>
        </div>

        ${data.allocations && data.allocations.length > 0 ? `
        <div class="section">
          <div class="section-title">Payment Allocation</div>
          <table class="allocations-table">
            <thead>
              <tr>
                <th>Invoice No.</th>
                <th class="amount-col">Amount Applied</th>
              </tr>
            </thead>
            <tbody>
              ${data.allocations.map((alloc: any) => `
                <tr>
                  <td>${alloc.invoice_number}</td>
                  <td class="amount-col">${formatCurrency(alloc.amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ` : ''}

        ${data.unallocatedAmount > 0 ? `
        <div class="section">
          <div class="info-row" style="background: #fff3cd; padding: 12px; border-radius: 6px; border: none;">
            <span class="info-label">Unallocated Balance</span>
            <span class="info-value" style="color: #856404;">${formatCurrency(data.unallocatedAmount)}</span>
          </div>
        </div>
        ` : ''}

        <div class="signature-section">
          <div class="signature-box">
            <div class="signature-label">Received By (SilberArrows)</div>
            <div class="signature-line"></div>
          </div>
          <div class="signature-box">
            <div class="signature-label">Customer Acknowledgement</div>
            <div class="signature-line"></div>
          </div>
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
      .select('full_name, customer_number, phone_number, email')
      .eq('id', payment.lead_id)
      .single();

    // Fetch allocations
    const { data: allocations } = await supabase
      .from('uv_payment_allocations')
      .select(`
        id,
        amount,
        invoice_id,
        uv_invoices!inner(invoice_number)
      `)
      .eq('payment_id', paymentId);

    const formattedAllocations = allocations?.map((a: any) => ({
      invoice_number: a.uv_invoices?.invoice_number,
      amount: a.amount
    })) || [];

    const allocatedAmount = formattedAllocations.reduce((sum: number, a: any) => sum + a.amount, 0);
    const unallocatedAmount = payment.amount - allocatedAmount;

    // Prepare data for template
    const templateData = {
      paymentNumber: payment.payment_number,
      paymentDate: payment.payment_date,
      paymentMethod: payment.payment_method,
      reference: payment.reference,
      amount: payment.amount,
      customerName: lead?.full_name || 'Customer',
      customerId: lead?.customer_number,
      customerPhone: lead?.phone_number,
      allocations: formattedAllocations,
      unallocatedAmount
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
