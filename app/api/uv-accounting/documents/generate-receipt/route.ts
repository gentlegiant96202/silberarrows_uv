import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Helper: Format date to DD/MM/YYYY
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Helper: Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount) + ' AED';
};

// Build Receipt HTML
function buildReceiptHtml(data: {
  receiptNumber: string;
  dealNumber: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  chassisNumber: string;
  transactionType: string;
  amount: number;
  paymentMethod: string;
  referenceNumber?: string;
  paymentDate: string;
  invoiceTotal: number;
  totalPaid: number;
  balanceDue: number;
}): string {
  const paymentMethodLabel = {
    'cash': 'Cash',
    'card': 'Card Payment',
    'bank_transfer': 'Bank Transfer',
    'cheque': 'Cheque'
  }[data.paymentMethod] || data.paymentMethod;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Payment Receipt - ${data.receiptNumber}</title>
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
          .title { font-size: 28px; font-weight: bold; color: white; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: rgba(255,255,255,0.7); }
          
          .receipt-number-box {
            background: rgba(255,255,255,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 8px;
            padding: 15px 20px;
            text-align: center;
            margin-bottom: 25px;
          }
          .receipt-label { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; }
          .receipt-value { font-size: 20px; font-weight: bold; margin-top: 5px; }
          
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
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin-bottom: 25px;
          }
          .amount-label { font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; }
          .amount-value { font-size: 36px; font-weight: bold; margin: 10px 0; }
          .payment-method-badge {
            display: inline-block;
            background: rgba(255,255,255,0.15);
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .balance-section {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 25px;
          }
          .balance-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .balance-row:last-child { border-bottom: none; font-weight: bold; font-size: 14px; }
          .balance-row.highlight { background: rgba(16, 185, 129, 0.1); margin: 0 -15px; padding: 12px 15px; border-radius: 0 0 10px 10px; }
          
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
                <div class="title">PAYMENT RECEIPT</div>
                <div class="subtitle">SilberArrows Used Vehicles</div>
            </div>
        </div>

        <div class="receipt-number-box">
            <div class="receipt-label">Receipt Number</div>
            <div class="receipt-value">${data.receiptNumber}</div>
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
                <div class="info-row">
                    <span class="info-label">Chassis:</span>
                    <span class="info-value">${data.chassisNumber || 'N/A'}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${formatDate(data.paymentDate)}</span>
                </div>
            </div>
        </div>

        <div class="amount-box">
            <div class="amount-label">${data.transactionType === 'deposit' ? 'Deposit Received' : 'Payment Received'}</div>
            <div class="amount-value">${formatCurrency(data.amount)}</div>
            <div class="payment-method-badge">${paymentMethodLabel}${data.referenceNumber ? ` • Ref: ${data.referenceNumber}` : ''}</div>
        </div>

        <div class="balance-section">
            <div class="info-title">Account Summary</div>
            <div class="balance-row">
                <span>Invoice Total:</span>
                <span>${formatCurrency(data.invoiceTotal)}</span>
            </div>
            <div class="balance-row">
                <span>Total Paid (including this payment):</span>
                <span>${formatCurrency(data.totalPaid)}</span>
            </div>
            <div class="balance-row highlight">
                <span>Balance Due:</span>
                <span>${formatCurrency(data.balanceDue)}</span>
            </div>
        </div>

        <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
            TRN: 100281137800003 | Tel: +971 4 380 5515<br>
            sales@silberarrows.com | www.silberarrows.com<br><br>
            This is a computer-generated receipt and is valid without signature.
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

    // Get transaction with deal info
    const { data: transaction, error: txError } = await supabase
      .from('uv_transactions')
      .select('*')
      .eq('id', transaction_id)
      .single();

    if (txError || !transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
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
    const htmlContent = buildReceiptHtml({
      receiptNumber: transaction.document_number,
      dealNumber: deal.deal_number,
      customerName: deal.customer_name,
      customerPhone: deal.customer_phone,
      vehicleInfo: `${deal.vehicle_year || ''} ${deal.vehicle_model || 'Vehicle'}`.trim(),
      chassisNumber: deal.vehicle_chassis || '',
      transactionType: transaction.transaction_type,
      amount: transaction.amount,
      paymentMethod: transaction.payment_method,
      referenceNumber: transaction.reference_number,
      paymentDate: transaction.created_at,
      invoiceTotal: deal.invoice_total || 0,
      totalPaid: deal.total_paid || 0,
      balanceDue: deal.balance_due || 0
    });

    // Generate PDF via PDFShift
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
    const filePath = `uv-receipts/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(filePath, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
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
    console.error('Error generating receipt:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

