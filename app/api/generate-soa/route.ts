import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PDFSHIFT_API_KEY = process.env.PDFSHIFT_API_KEY;

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function getTransactionTypeLabel(type: string): string {
  switch (type) {
    case 'invoice': return 'Invoice';
    case 'payment': return 'Payment';
    case 'credit_note': return 'Credit Note';
    case 'debit_note': return 'Debit Note';
    case 'refund': return 'Refund';
    default: return type;
  }
}

function generateSoaHTML(data: any, logoSrc: string): string {
  const { customerName, customerNumber, transactions, balance, generatedDate } = data;

  const transactionRows = transactions.map((tx: any) => `
    <tr>
      <td class="date-cell">${formatDate(tx.transaction_date)}</td>
      <td class="type-cell">${getTransactionTypeLabel(tx.transaction_type)}</td>
      <td class="ref-cell">${tx.reference || '-'}</td>
      <td class="desc-cell">${tx.description || '-'}</td>
      <td class="amount-cell debit">${tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
      <td class="amount-cell credit">${tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
      <td class="amount-cell balance">${formatCurrency(tx.running_balance)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Statement of Account - ${customerName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 15mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Helvetica Neue', Arial, sans-serif;
          font-size: 9px;
          line-height: 1.4;
          color: #333;
          background: white;
        }
        
        .container {
          max-width: 100%;
          padding: 0;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #000;
        }
        
        .header-left {
          flex: 1;
        }
        
        .title {
          font-size: 20px;
          font-weight: bold;
          color: #000;
          margin-bottom: 5px;
        }
        
        .subtitle {
          font-size: 11px;
          color: #666;
        }
        
        .logo {
          height: 50px;
          object-fit: contain;
        }
        
        .customer-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 12px;
          background: #f8f8f8;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .customer-details h3 {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .customer-details p {
          font-size: 10px;
          color: #666;
        }
        
        .statement-date {
          text-align: right;
        }
        
        .statement-date p {
          font-size: 10px;
          color: #666;
        }
        
        .summary-box {
          display: flex;
          justify-content: space-between;
          margin-bottom: 20px;
          padding: 12px;
          background: #000;
          color: white;
          border-radius: 4px;
        }
        
        .summary-item {
          text-align: center;
          padding: 0 15px;
          border-right: 1px solid #333;
        }
        
        .summary-item:last-child {
          border-right: none;
        }
        
        .summary-item .label {
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #999;
          margin-bottom: 3px;
        }
        
        .summary-item .value {
          font-size: 12px;
          font-weight: bold;
        }
        
        .summary-item .value.credit {
          color: #4ade80;
        }
        
        .summary-item .value.debit {
          color: #f87171;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8px;
        }
        
        thead {
          background: #000;
          color: white;
        }
        
        th {
          padding: 8px 6px;
          text-align: left;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 7px;
        }
        
        td {
          padding: 6px;
          border-bottom: 1px solid #eee;
        }
        
        tr:nth-child(even) {
          background: #fafafa;
        }
        
        .date-cell {
          width: 10%;
          white-space: nowrap;
        }
        
        .type-cell {
          width: 10%;
        }
        
        .ref-cell {
          width: 12%;
          font-family: monospace;
          font-size: 8px;
        }
        
        .desc-cell {
          width: 28%;
        }
        
        .amount-cell {
          width: 13%;
          text-align: right;
          font-family: monospace;
        }
        
        .amount-cell.debit {
          color: #dc2626;
        }
        
        .amount-cell.credit {
          color: #16a34a;
        }
        
        .amount-cell.balance {
          font-weight: bold;
          color: #000;
        }
        
        .footer {
          margin-top: 30px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: center;
          font-size: 8px;
          color: #666;
        }
        
        .footer p {
          margin-bottom: 3px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-left">
            <div class="title">STATEMENT OF ACCOUNT</div>
            <div class="subtitle">Customer Transaction History</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>
        
        <div class="customer-info">
          <div class="customer-details">
            <h3>${customerName}</h3>
            <p>Customer ID: ${customerNumber || 'N/A'}</p>
          </div>
          <div class="statement-date">
            <p><strong>Statement Date:</strong> ${generatedDate}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleTimeString('en-GB')}</p>
          </div>
        </div>
        
        <div class="summary-box">
          <div class="summary-item">
            <div class="label">Total Invoiced</div>
            <div class="value">AED ${formatCurrency(balance?.total_invoiced || 0)}</div>
          </div>
          ${(balance?.total_debit_notes || 0) > 0 ? `
          <div class="summary-item">
            <div class="label">Debit Notes</div>
            <div class="value debit">+AED ${formatCurrency(balance?.total_debit_notes || 0)}</div>
          </div>
          ` : ''}
          <div class="summary-item">
            <div class="label">Total Paid</div>
            <div class="value credit">AED ${formatCurrency(balance?.total_paid || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Credit Notes</div>
            <div class="value credit">AED ${formatCurrency(balance?.total_credit_notes || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Refunds</div>
            <div class="value debit">AED ${formatCurrency(balance?.total_refunds || 0)}</div>
          </div>
          <div class="summary-item">
            <div class="label">Balance Due</div>
            <div class="value ${(balance?.current_balance || 0) > 0 ? 'debit' : 'credit'}">
              AED ${formatCurrency(Math.abs(balance?.current_balance || 0))}${(balance?.current_balance || 0) < 0 ? ' CR' : ''}
            </div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Reference</th>
              <th>Description</th>
              <th style="text-align: right;">Debit</th>
              <th style="text-align: right;">Credit</th>
              <th style="text-align: right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${transactionRows || '<tr><td colspan="7" style="text-align: center; padding: 20px;">No transactions found</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          <p>Silber Arrows 1934 Used Car Trading LLC | Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095</p>
          <p>TRN: 100281137800003 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com</p>
          <p style="margin-top: 10px; font-style: italic;">This is a computer-generated statement and does not require a signature.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, customerName, customerNumber, transactions, balance } = body;

    if (!leadId) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 });
    }

    // Read logo and convert to base64
    const logoPath = path.join(process.cwd(), 'public', 'silberarrows-logo-white.svg');
    let logoSrc = '';
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      logoSrc = `data:image/svg+xml;base64,${logoBuffer.toString('base64')}`;
    } catch (e) {
      // Fallback to PNG if SVG not found
      try {
        const pngPath = path.join(process.cwd(), 'public', 'silberarrows-logo.png');
        const pngBuffer = fs.readFileSync(pngPath);
        logoSrc = `data:image/png;base64,${pngBuffer.toString('base64')}`;
      } catch (e2) {
        console.error('Logo not found, using placeholder');
        logoSrc = '';
      }
    }

    // Generate HTML
    const html = generateSoaHTML({
      customerName: customerName || 'Unknown Customer',
      customerNumber: customerNumber || '',
      transactions: transactions || [],
      balance: balance || {},
      generatedDate: new Date().toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      })
    }, logoSrc);

    // Generate PDF using PDFShift
    if (!PDFSHIFT_API_KEY) {
      return NextResponse.json({ error: 'PDFShift API key not configured' }, { status: 500 });
    }

    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${PDFSHIFT_API_KEY}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: html,
        landscape: true,
        format: 'A4',
        margin: '10mm',
      }),
    });

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('PDFShift error:', errorText);
      return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const safeCustomerName = (customerNumber || customerName || 'customer').replace(/[^a-zA-Z0-9-_]/g, '_');
    const fileName = `soa/${safeCustomerName}_${timestamp}.pdf`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      pdfUrl: urlData.publicUrl,
      fileName: fileName
    });

  } catch (error: any) {
    console.error('Error generating SOA:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate SOA' },
      { status: 500 }
    );
  }
}

