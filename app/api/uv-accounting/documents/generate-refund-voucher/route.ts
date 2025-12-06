import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

function buildRefundVoucherHtml(data: {
  voucherNumber: string;
  dealNumber: string;
  voucherDate: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  chassisNumber?: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
}): string {
  const paymentMethodLabel = {
    'cash': 'Cash',
    'card': 'Card Refund',
    'bank_transfer': 'Bank Transfer',
    'cheque': 'Cheque'
  }[data.paymentMethod] || data.paymentMethod;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Refund Voucher - ${data.voucherNumber}</title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            color: white; 
            font-family: 'Arial', sans-serif; 
            font-size: 11px; 
            line-height: 1.4; 
            width: 210mm; 
            min-height: 297mm;
            padding: 25px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          .logo { width: 120px; }
          .title-section { text-align: right; }
          .title { font-size: 28px; font-weight: bold; color: #ef4444; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: rgba(255,255,255,0.7); }
          
          .voucher-number-box {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: 8px;
            padding: 15px 20px;
            text-align: center;
            margin-bottom: 25px;
          }
          .voucher-label { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; }
          .voucher-value { font-size: 20px; font-weight: bold; margin-top: 5px; color: #ef4444; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .info-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px;
          }
          .info-title { 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .info-label { color: rgba(255,255,255,0.6); }
          .info-value { font-weight: 500; }
          
          .amount-box {
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.05) 100%);
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin-bottom: 25px;
          }
          .amount-label { font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; }
          .amount-value { font-size: 40px; font-weight: bold; margin: 10px 0; color: #ef4444; }
          .payment-method-badge {
            display: inline-block;
            background: rgba(239, 68, 68, 0.2);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #fca5a5;
          }
          
          .signature-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin: 40px 0;
          }
          .signature-box {
            text-align: center;
          }
          .signature-line {
            border-top: 1px solid rgba(255,255,255,0.3);
            margin-top: 60px;
            padding-top: 10px;
            font-size: 10px;
            color: rgba(255,255,255,0.6);
          }
          
          .footer {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
            text-align: center;
            font-size: 9px;
            color: rgba(255,255,255,0.5);
          }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" class="logo" alt="SilberArrows">
            <div class="title-section">
                <div class="title">REFUND VOUCHER</div>
                <div class="subtitle">SilberArrows Used Vehicles</div>
            </div>
        </div>

        <div class="voucher-number-box">
            <div class="voucher-label">Voucher Number</div>
            <div class="voucher-value">${data.voucherNumber}</div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <div class="info-title">Customer Details</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.customerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${data.customerPhone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Deal Reference:</span>
                    <span class="info-value">${data.dealNumber}</span>
                </div>
            </div>
            <div class="info-box">
                <div class="info-title">Vehicle Details</div>
                <div class="info-row">
                    <span class="info-label">Vehicle:</span>
                    <span class="info-value">${data.vehicleInfo}</span>
                </div>
                ${data.chassisNumber ? `
                <div class="info-row">
                    <span class="info-label">Chassis:</span>
                    <span class="info-value">${data.chassisNumber}</span>
                </div>` : ''}
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${formatDate(data.voucherDate)}</span>
                </div>
            </div>
        </div>

        <div class="amount-box">
            <div class="amount-label">Refund Amount</div>
            <div class="amount-value">${formatCurrency(data.amount)} AED</div>
            <div class="payment-method-badge">${paymentMethodLabel}${data.referenceNumber ? ` • Ref: ${data.referenceNumber}` : ''}</div>
        </div>

        <div class="signature-section">
            <div class="signature-box">
                <div class="signature-line">Authorized Signature</div>
            </div>
            <div class="signature-box">
                <div class="signature-line">Customer Signature</div>
            </div>
        </div>

        <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
            TRN: 100281137800003 | Tel: +971 4 380 5515<br>
            sales@silberarrows.com | www.silberarrows.com<br><br>
            This voucher confirms the refund has been processed as described above.
        </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { transaction_id } = body;

    if (!transaction_id) {
      return NextResponse.json({ error: 'transaction_id is required' }, { status: 400 });
    }

    // Get transaction
    const { data: transaction, error: txError } = await supabase
      .from('uv_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.transaction_type !== 'refund') {
      return NextResponse.json({ error: 'Transaction is not a refund' }, { status: 400 });
    }

    // Get deal summary
    const { data: deal, error: dealError } = await supabase
      .from('uv_deal_summary')
      .select('*')
      .eq('id', transaction.deal_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Build HTML
    const htmlContent = buildRefundVoucherHtml({
      voucherNumber: transaction.document_number,
      dealNumber: deal.deal_number,
      voucherDate: transaction.created_at,
      customerName: deal.customer_name,
      customerPhone: deal.customer_phone,
      vehicleInfo: `${deal.vehicle_year || ''} ${deal.vehicle_model || 'Vehicle'}`.trim(),
      chassisNumber: deal.vehicle_chassis,
      amount: transaction.amount,
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number
    });

    // Generate PDF
    const pdfResp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
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

    if (!pdfResp.ok) {
      const errText = await pdfResp.text();
      throw new Error(`PDFShift error: ${pdfResp.status} - ${errText}`);
    }

    const pdfBuffer = await pdfResp.arrayBuffer();

    // Upload to Supabase
    const fileName = `${transaction.document_number}_${Date.now()}.pdf`;
    const filePath = `uv-refunds/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(filePath, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;

    // Update transaction with document URL
    await supabase
      .from('uv_transactions')
      .update({ document_url: pdfUrl })
      .eq('id', transaction_id);

    return NextResponse.json({ 
      success: true, 
      pdfUrl,
      documentNumber: transaction.document_number 
    });

  } catch (error: any) {
    console.error('Error generating refund voucher:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

