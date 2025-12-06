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
  }).format(Math.abs(amount));
};

function buildSOAHtml(data: {
  dealNumber: string;
  statementDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  vehicleInfo: string;
  chassisNumber?: string;
  charges: Array<{ charge_type: string; description?: string; amount: number; created_at: string }>;
  transactions: Array<{ 
    transaction_type: string; 
    amount: number; 
    document_number: string; 
    payment_method?: string;
    reason?: string;
    created_at: string 
  }>;
  invoiceTotal: number;
  totalPaid: number;
  totalCredits: number;
  totalRefunds: number;
  balanceDue: number;
  status: string;
}): string {
  // Build transaction rows with running balance
  let runningBalance = 0;
  const allItems: Array<{date: string; description: string; debit: number; credit: number; balance: number}> = [];

  // Add invoice as first item
  if (data.invoiceTotal > 0) {
    runningBalance = data.invoiceTotal;
    allItems.push({
      date: data.charges[0]?.created_at || data.statementDate,
      description: `Invoice ${data.dealNumber}`,
      debit: data.invoiceTotal,
      credit: 0,
      balance: runningBalance
    });
  }

  // Add transactions in chronological order
  const sortedTransactions = [...data.transactions].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  for (const tx of sortedTransactions) {
    let description = '';
    let debit = 0;
    let credit = 0;

    switch (tx.transaction_type) {
      case 'deposit':
        description = `Deposit ${tx.document_number}${tx.payment_method ? ` (${tx.payment_method})` : ''}`;
        credit = tx.amount;
        runningBalance -= tx.amount;
        break;
      case 'payment':
        description = `Payment ${tx.document_number}${tx.payment_method ? ` (${tx.payment_method})` : ''}`;
        credit = tx.amount;
        runningBalance -= tx.amount;
        break;
      case 'credit_note':
        description = `Credit Note ${tx.document_number}`;
        credit = tx.amount;
        runningBalance -= tx.amount;
        break;
      case 'refund':
        description = `Refund ${tx.document_number}`;
        debit = tx.amount;
        runningBalance += tx.amount;
        break;
    }

    allItems.push({
      date: tx.created_at,
      description,
      debit,
      credit,
      balance: runningBalance
    });
  }

  const transactionRows = allItems.map(item => `
    <tr>
      <td>${formatDate(item.date)}</td>
      <td>${item.description}</td>
      <td class="amount">${item.debit > 0 ? formatCurrency(item.debit) : '-'}</td>
      <td class="amount">${item.credit > 0 ? formatCurrency(item.credit) : '-'}</td>
      <td class="amount balance">${formatCurrency(item.balance)}</td>
    </tr>
  `).join('');

  const statusColors: Record<string, string> = {
    'pending': '#f59e0b',
    'partial': '#3b82f6',
    'paid': '#10b981',
    'cancelled': '#ef4444'
  };
  const statusColor = statusColors[data.status] || '#9ca3af';

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Statement of Account - ${data.dealNumber}</title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            color: white; 
            font-family: 'Arial', sans-serif; 
            font-size: 10px; 
            line-height: 1.4; 
            width: 210mm; 
            min-height: 297mm;
            padding: 20px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          .logo { width: 100px; }
          .title-section { text-align: right; }
          .title { font-size: 24px; font-weight: bold; }
          .subtitle { font-size: 11px; color: rgba(255,255,255,0.7); }
          
          .info-bar {
            display: flex;
            justify-content: space-between;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 12px 15px;
            margin-bottom: 15px;
          }
          .info-item { }
          .info-label { font-size: 9px; color: rgba(255,255,255,0.5); text-transform: uppercase; }
          .info-value { font-size: 12px; font-weight: bold; margin-top: 2px; }
          
          .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
          .detail-box {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px;
          }
          .detail-title { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.1); }
          .detail-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 9px; }
          .detail-label { color: rgba(255,255,255,0.6); }
          
          .statement-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
            font-size: 9px;
          }
          .statement-table th {
            background: rgba(255,255,255,0.1);
            padding: 10px 8px;
            text-align: left;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
          }
          .statement-table th.amount { text-align: right; }
          .statement-table td {
            padding: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.08);
          }
          .statement-table td.amount { text-align: right; font-family: monospace; }
          .statement-table td.balance { font-weight: bold; }
          .statement-table tr:last-child td { border-bottom: 2px solid rgba(255,255,255,0.2); }
          
          .totals-bar {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 20px;
          }
          .totals-box {
            width: 250px;
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 12px 15px;
          }
          .totals-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 10px; }
          .totals-row.final { 
            border-top: 1px solid rgba(255,255,255,0.2); 
            margin-top: 8px; 
            padding-top: 10px;
            font-size: 14px;
            font-weight: bold;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            background: ${statusColor}20;
            color: ${statusColor};
            border: 1px solid ${statusColor}40;
            border-radius: 20px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .footer {
            margin-top: auto;
            padding-top: 15px;
            border-top: 1px solid rgba(255,255,255,0.2);
            text-align: center;
            font-size: 8px;
            color: rgba(255,255,255,0.5);
          }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" class="logo" alt="SilberArrows">
            <div class="title-section">
                <div class="title">STATEMENT OF ACCOUNT</div>
                <div class="subtitle">SilberArrows Used Vehicles</div>
            </div>
        </div>

        <div class="info-bar">
            <div class="info-item">
                <div class="info-label">Deal Reference</div>
                <div class="info-value">${data.dealNumber}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Statement Date</div>
                <div class="info-value">${formatDate(data.statementDate)}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value"><span class="status-badge">${data.status.toUpperCase()}</span></div>
            </div>
        </div>

        <div class="details-grid">
            <div class="detail-box">
                <div class="detail-title">Customer</div>
                <div class="detail-row">
                    <span class="detail-label">Name:</span>
                    <span>${data.customerName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Phone:</span>
                    <span>${data.customerPhone}</span>
                </div>
                ${data.customerEmail ? `
                <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span>${data.customerEmail}</span>
                </div>` : ''}
            </div>
            <div class="detail-box">
                <div class="detail-title">Vehicle</div>
                <div class="detail-row">
                    <span class="detail-label">Description:</span>
                    <span>${data.vehicleInfo}</span>
                </div>
                ${data.chassisNumber ? `
                <div class="detail-row">
                    <span class="detail-label">Chassis:</span>
                    <span>${data.chassisNumber}</span>
                </div>` : ''}
            </div>
        </div>

        <table class="statement-table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th class="amount">Debit</th>
                    <th class="amount">Credit</th>
                    <th class="amount">Balance</th>
                </tr>
            </thead>
            <tbody>
                ${transactionRows}
            </tbody>
        </table>

        <div class="totals-bar">
            <div class="totals-box">
                <div class="totals-row">
                    <span>Invoice Total:</span>
                    <span>${formatCurrency(data.invoiceTotal)} AED</span>
                </div>
                <div class="totals-row">
                    <span>Total Paid:</span>
                    <span>${formatCurrency(data.totalPaid)} AED</span>
                </div>
                ${data.totalCredits > 0 ? `
                <div class="totals-row">
                    <span>Credit Notes:</span>
                    <span>${formatCurrency(data.totalCredits)} AED</span>
                </div>` : ''}
                ${data.totalRefunds > 0 ? `
                <div class="totals-row">
                    <span>Refunds:</span>
                    <span>${formatCurrency(data.totalRefunds)} AED</span>
                </div>` : ''}
                <div class="totals-row final">
                    <span>Balance Due:</span>
                    <span>${formatCurrency(Math.max(data.balanceDue, 0))} AED</span>
                </div>
            </div>
        </div>

        <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
            TRN: 100281137800003 | Tel: +971 4 380 5515<br>
            sales@silberarrows.com | www.silberarrows.com<br><br>
            This statement reflects all transactions as of the statement date.
        </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deal_id } = body;

    if (!deal_id) {
      return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Get deal summary
    const { data: deal, error: dealError } = await supabase
      .from('uv_deal_summary')
      .select('*')
      .eq('id', deal_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get charges
    const { data: charges, error: chargesError } = await supabase
      .from('uv_charges')
      .select('*')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: true });

    if (chargesError) throw chargesError;

    // Get transactions
    const { data: transactions, error: txError } = await supabase
      .from('uv_transactions')
      .select('*')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: true });

    if (txError) throw txError;

    // Build HTML
    const htmlContent = buildSOAHtml({
      dealNumber: deal.deal_number,
      statementDate: new Date().toISOString(),
      customerName: deal.customer_name,
      customerPhone: deal.customer_phone,
      customerEmail: deal.customer_email,
      vehicleInfo: `${deal.vehicle_year || ''} ${deal.vehicle_model || 'Vehicle'}`.trim(),
      chassisNumber: deal.vehicle_chassis,
      charges: charges || [],
      transactions: transactions || [],
      invoiceTotal: deal.invoice_total || 0,
      totalPaid: deal.total_paid || 0,
      totalCredits: deal.total_credits || 0,
      totalRefunds: deal.total_refunds || 0,
      balanceDue: deal.balance_due || 0,
      status: deal.status
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
    const fileName = `SOA_${deal.deal_number}_${Date.now()}.pdf`;
    const filePath = `uv-statements/${fileName}`;
    
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

    return NextResponse.json({ 
      success: true, 
      pdfUrl: urlData.publicUrl,
      dealNumber: deal.deal_number 
    });

  } catch (error: any) {
    console.error('Error generating SOA:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

