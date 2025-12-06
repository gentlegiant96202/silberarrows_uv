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

function buildCreditNoteHtml(data: {
  creditNoteNumber: string;
  dealNumber: string;
  creditNoteDate: string;
  customerName: string;
  customerPhone: string;
  vehicleInfo: string;
  chassisNumber?: string;
  amount: number;
  reason: string;
  invoiceTotal: number;
  balanceAfter: number;
}): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Credit Note - ${data.creditNoteNumber}</title>
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
          .title { font-size: 28px; font-weight: bold; color: #f59e0b; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: rgba(255,255,255,0.7); }
          
          .document-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
          }
          .meta-box {
            background: rgba(245, 158, 11, 0.1);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 10px;
            padding: 15px 20px;
          }
          .meta-label { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .meta-value { font-size: 16px; font-weight: bold; color: #f59e0b; }
          
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
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(245, 158, 11, 0.05) 100%);
            border: 2px solid rgba(245, 158, 11, 0.4);
            border-radius: 12px;
            padding: 25px;
            text-align: center;
            margin-bottom: 25px;
          }
          .amount-label { font-size: 12px; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 1px; }
          .amount-value { font-size: 40px; font-weight: bold; margin: 10px 0; color: #f59e0b; }
          
          .reason-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 25px;
          }
          .reason-text { font-size: 12px; line-height: 1.6; }
          
          .summary-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 25px;
          }
          .summary-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .summary-row:last-child { border-bottom: none; }
          .summary-row.highlight { font-weight: bold; font-size: 13px; }
          
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
                <div class="title">CREDIT NOTE</div>
                <div class="subtitle">SilberArrows Used Vehicles</div>
            </div>
        </div>

        <div class="document-meta">
            <div class="meta-box">
                <div class="meta-label">Credit Note Number</div>
                <div class="meta-value">${data.creditNoteNumber}</div>
            </div>
            <div class="meta-box">
                <div class="meta-label">Date Issued</div>
                <div class="meta-value">${formatDate(data.creditNoteDate)}</div>
            </div>
            <div class="meta-box">
                <div class="meta-label">Invoice Reference</div>
                <div class="meta-value">${data.dealNumber}</div>
            </div>
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
            </div>
        </div>

        <div class="amount-box">
            <div class="amount-label">Credit Amount</div>
            <div class="amount-value">${formatCurrency(data.amount)} AED</div>
        </div>

        <div class="reason-box">
            <div class="info-title">Reason for Credit Note</div>
            <div class="reason-text">${data.reason}</div>
        </div>

        <div class="summary-box">
            <div class="info-title">Account Impact</div>
            <div class="summary-row">
                <span>Original Invoice Total:</span>
                <span>${formatCurrency(data.invoiceTotal)} AED</span>
            </div>
            <div class="summary-row">
                <span>This Credit Note:</span>
                <span>- ${formatCurrency(data.amount)} AED</span>
            </div>
            <div class="summary-row highlight">
                <span>Revised Balance Due:</span>
                <span>${formatCurrency(Math.max(data.balanceAfter, 0))} AED</span>
            </div>
        </div>

        <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
            TRN: 100281137800003 | Tel: +971 4 380 5515<br>
            sales@silberarrows.com | www.silberarrows.com<br><br>
            This credit note reduces the amount owed on the referenced invoice.
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

    if (transaction.transaction_type !== 'credit_note') {
      return NextResponse.json({ error: 'Transaction is not a credit note' }, { status: 400 });
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
    const htmlContent = buildCreditNoteHtml({
      creditNoteNumber: transaction.document_number,
      dealNumber: deal.deal_number,
      creditNoteDate: transaction.created_at,
      customerName: deal.customer_name,
      customerPhone: deal.customer_phone,
      vehicleInfo: `${deal.vehicle_year || ''} ${deal.vehicle_model || 'Vehicle'}`.trim(),
      chassisNumber: deal.vehicle_chassis,
      amount: transaction.amount,
      reason: transaction.reason || 'Credit adjustment',
      invoiceTotal: deal.invoice_total || 0,
      balanceAfter: deal.balance_due || 0
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
    const filePath = `uv-credit-notes/${fileName}`;
    
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
    console.error('Error generating credit note:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

