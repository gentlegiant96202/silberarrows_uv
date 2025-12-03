import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

interface Transaction {
  date: string;
  createdAt: string; // For sorting same-day transactions
  type: 'charge' | 'payment';
  description: string;
  reference: string;
  chargeAmount?: number;
  paymentAmount?: number;
  balance: number;
}

interface SOAData {
  customerName: string;
  customerNumber?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerIdType?: string;
  customerIdNumber?: string;
  vehicleInfo?: string;
  chassisNo?: string;
  documentNumber?: string;
  documentDate?: string;
  documentStatus?: string;
  transactions: Transaction[];
  totalCharges: number;
  totalPayments: number;
  balanceDue: number;
}

// Generate HTML content for Statement of Account
function generateSOAHTML(data: SOAData, logoSrc: string) {
  
  const formatDate = (dateString: string) => {
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

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Currency prefix for SOA
  const currencyPrefix = 'AED ';

  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const getStatusColor = () => {
    if (data.documentStatus === 'reversed') return '#ef4444'; // red for reversed
    if (data.balanceDue <= 0) return '#10b981'; // emerald
    if (data.totalPayments > 0) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getStatusText = () => {
    if (data.documentStatus === 'reversed') return 'REVERSED';
    if (data.balanceDue <= 0) return 'PAID IN FULL';
    if (data.totalPayments > 0) return 'PARTIAL PAYMENT';
    return 'UNPAID';
  };

  // Generate transaction rows
  const transactionRows = data.transactions.map(txn => `
    <tr>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; color: #666;">${formatDate(txn.date)}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; color: #1a1a1a;">${txn.description}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; color: #666; font-family: monospace;">${txn.reference}</td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; text-align: right; color: #1a1a1a;">
        ${txn.type === 'charge' ? currencyPrefix + formatCurrency(txn.chargeAmount || 0) : '-'}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; text-align: right; color: ${(txn.paymentAmount || 0) < 0 ? '#ef4444' : '#10b981'};">
        ${txn.type === 'payment' ? ((txn.paymentAmount || 0) < 0 ? '-' : '') + currencyPrefix + formatCurrency(Math.abs(txn.paymentAmount || 0)) : '-'}
      </td>
      <td style="padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 10px; text-align: right; font-weight: 600; color: ${txn.balance > 0 ? '#ef4444' : '#10b981'};">
        ${currencyPrefix}${formatCurrency(Math.abs(txn.balance))}${txn.balance < 0 ? ' CR' : ''}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Statement of Account - ${data.customerName}</title>
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
          font-size: 12px;
          line-height: 1.4;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 0;
        }

        .document {
          padding: 25px 35px;
          max-width: 210mm;
          margin: 0 auto;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <!-- Header -->
        <table style="width: 100%; border-bottom: 2px solid #1a1a1a; padding-bottom: 12px; margin-bottom: 15px;">
          <tr>
            <td style="vertical-align: top;">
              <div style="font-size: 20px; font-weight: 700; color: #1a1a1a; margin-bottom: 3px; letter-spacing: 1px;">SILBERARROWS</div>
              <div style="font-size: 9px; color: #666; line-height: 1.4;">
                Silber Arrows 1934 Used Car Trading LLC<br>
                Al Manara St., Al Quoz 1, Dubai, UAE<br>
                P.O. Box 185095<br>
                TRN: 100281137800003<br>
                Tel: +971 4 380 5515<br>
                sales@silberarrows.com | www.silberarrows.com
              </div>
            </td>
            <td style="text-align: right; vertical-align: top;">
              <img src="${logoSrc}" alt="SilberArrows Logo" style="width: 60px; height: auto;">
            </td>
          </tr>
        </table>

        <!-- Document Title -->
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 5px;">Statement of Account</h1>
          <div style="font-size: 11px; color: #666;">As of ${currentDate}</div>
        </div>

        <!-- Customer & Vehicle Info -->
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 10px;">
              <div style="background: #f8f8f8; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <div style="font-size: 9px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0;">Customer Details</div>
                <table style="width: 100%; font-size: 10px;">
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Name:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right;">${data.customerName}</td>
                  </tr>
                  ${data.customerNumber ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Customer ID:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right; font-family: monospace;">${data.customerNumber}</td>
                  </tr>
                  ` : ''}
                  ${data.customerPhone ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Phone:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right;">${data.customerPhone}</td>
                  </tr>
                  ` : ''}
                  ${data.customerEmail ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Email:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right;">${data.customerEmail}</td>
                  </tr>
                  ` : ''}
                  ${data.customerIdType && data.customerIdNumber ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">${data.customerIdType}:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right; font-family: monospace;">${data.customerIdNumber}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 10px;">
              <div style="background: #f8f8f8; padding: 12px; border-radius: 6px; border: 1px solid #e0e0e0;">
                <div style="font-size: 9px; font-weight: 700; color: #999; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0;">Document Reference</div>
                <table style="width: 100%; font-size: 10px;">
                  ${data.vehicleInfo ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Vehicle:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right;">${data.vehicleInfo}</td>
                  </tr>
                  ` : ''}
                  ${data.chassisNo ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Chassis:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right; font-family: monospace;">${data.chassisNo}</td>
                  </tr>
                  ` : ''}
                  ${data.documentNumber ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">${data.documentNumber.startsWith('RES') ? 'Reservation' : 'Invoice'} #:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right; font-family: monospace;">${data.documentNumber}</td>
                  </tr>
                  ` : ''}
                  ${data.documentDate ? `
                  <tr>
                    <td style="color: #666; padding: 3px 0;">Date:</td>
                    <td style="font-weight: 600; color: #1a1a1a; text-align: right;">${formatDate(data.documentDate)}</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            </td>
          </tr>
        </table>

        <!-- Summary Section -->
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td style="width: 25%; padding: 0 5px;">
              <div style="background: #f0f0f0; padding: 12px; border-radius: 6px; border: 1px solid #ccc; text-align: center;">
                <div style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Total Charges</div>
                <div style="font-size: 16px; font-weight: 700; color: #1a1a1a;">${currencyPrefix}${formatCurrency(data.totalCharges)}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 5px;">
              <div style="background: #f0f0f0; padding: 12px; border-radius: 6px; border: 1px solid #ccc; text-align: center;">
                <div style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Total Payments</div>
                <div style="font-size: 16px; font-weight: 700; color: #10b981;">${currencyPrefix}${formatCurrency(data.totalPayments)}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 5px;">
              <div style="background: #f0f0f0; padding: 12px; border-radius: 6px; border: 1px solid #ccc; text-align: center;">
                <div style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Balance Due</div>
                <div style="font-size: 16px; font-weight: 700; color: ${data.balanceDue > 0 ? '#ef4444' : '#10b981'};">${currencyPrefix}${formatCurrency(Math.abs(data.balanceDue))}${data.balanceDue < 0 ? ' CR' : ''}</div>
              </div>
            </td>
            <td style="width: 25%; padding: 0 5px;">
              <div style="background: ${getStatusColor()}15; padding: 12px; border-radius: 6px; border: 1px solid ${getStatusColor()}40; text-align: center;">
                <div style="font-size: 9px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">Status</div>
                <div style="font-size: 14px; font-weight: 700; color: ${getStatusColor()};">${getStatusText()}</div>
              </div>
            </td>
          </tr>
        </table>

        <!-- Transaction History Table -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 11px; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px;">Transaction History</div>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; border-radius: 6px;">
            <thead>
              <tr style="background: #f0f0f0;">
                <th style="padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Date</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Description</th>
                <th style="padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Reference</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Charges</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Payments</th>
                <th style="padding: 10px 12px; text-align: right; font-size: 9px; font-weight: 600; color: #666; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #ccc;">Balance</th>
              </tr>
            </thead>
            <tbody>
              ${transactionRows || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #999; font-size: 10px;">No transactions recorded</td></tr>'}
            </tbody>
            <tfoot>
              <tr style="background: #f8f8f8; border-top: 2px solid #ccc;">
                <td colspan="3" style="padding: 12px; text-align: right; font-size: 10px; font-weight: 700; color: #1a1a1a; text-transform: uppercase;">Totals</td>
                <td style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #1a1a1a;">${currencyPrefix}${formatCurrency(data.totalCharges)}</td>
                <td style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: #10b981;">${currencyPrefix}${formatCurrency(data.totalPayments)}</td>
                <td style="padding: 12px; text-align: right; font-size: 11px; font-weight: 700; color: ${data.balanceDue > 0 ? '#ef4444' : '#10b981'};">${currencyPrefix}${formatCurrency(Math.abs(data.balanceDue))}${data.balanceDue < 0 ? ' CR' : ''}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e0e0e0; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 5px;">This is a computer-generated statement and is valid without signature.</div>
          <div style="font-size: 9px; color: #999;">For any queries, please contact us at +971 4 380 5515 or sales@silberarrows.com</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      leadId,
      reservationId,
      customerName,
      customerNumber,
      customerPhone,
      customerEmail,
      customerIdType,
      customerIdNumber,
      vehicleInfo,
      chassisNo,
      documentNumber,
      documentDate,
      documentStatus,
      charges,
      payments
    } = body;

    // Validate required data
    if (!leadId && !reservationId) {
      return NextResponse.json(
        { error: 'Lead ID or Reservation ID is required' },
        { status: 400 }
      );
    }

    // Validate PDFShift API key
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }

    // Build transactions list
    const transactions: Transaction[] = [];

    // Add charges
    if (charges && Array.isArray(charges)) {
      charges.forEach((charge: any) => {
        const amount = charge.unit_price * (charge.quantity || 1);
        transactions.push({
          date: charge.created_at || documentDate || new Date().toISOString(),
          createdAt: charge.created_at || documentDate || new Date().toISOString(),
          type: 'charge',
          description: charge.description || charge.charge_type?.replace('_', ' ') || 'Charge',
          reference: documentNumber || '-',
          chargeAmount: amount,
          balance: 0 // Will be recalculated
        });
      });
    }

    // Add payments (including refunds which have negative amounts)
    if (payments && Array.isArray(payments)) {
      payments.forEach((payment: any) => {
        const isRefund = payment.payment_method === 'refund' || payment.amount < 0;
        transactions.push({
          date: payment.payment_date || payment.created_at,
          createdAt: payment.created_at || payment.payment_date || new Date().toISOString(),
          type: 'payment',
          description: isRefund ? `Refund - ${payment.payment_method === 'refund' ? 'Refund' : payment.payment_method?.replace('_', ' ')}` : `Payment - ${payment.payment_method?.replace('_', ' ') || 'Payment'}`,
          reference: payment.reference_number || payment.receipt_number || '-',
          paymentAmount: payment.amount,
          balance: 0 // Will be recalculated
        });
      });
    }

    // Sort by created_at timestamp (true chronological order)
    transactions.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    // Calculate running balance after sorting
    let balance = 0;
    transactions.forEach(txn => {
      if (txn.type === 'charge') {
        balance += txn.chargeAmount || 0;
      } else {
        balance -= txn.paymentAmount || 0;
      }
      txn.balance = balance;
    });

    // Calculate totals
    const totalCharges = transactions
      .filter(t => t.type === 'charge')
      .reduce((sum, t) => sum + (t.chargeAmount || 0), 0);
    const totalPayments = transactions
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + (t.paymentAmount || 0), 0);
    const balanceDue = totalCharges - totalPayments;

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
        // continue to next candidate
      }
    }

    // Generate HTML content
    const htmlContent = generateSOAHTML({
      customerName: customerName || 'Customer',
      customerNumber,
      customerPhone,
      customerEmail,
      customerIdType,
      customerIdNumber,
      vehicleInfo,
      chassisNo,
      documentNumber,
      documentDate,
      documentStatus,
      transactions,
      totalCharges,
      totalPayments,
      balanceDue
    }, logoSrc);

    // Call PDFShift API
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
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    
    // Upload to Supabase storage
    const fileName = `soa-${leadId || reservationId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      throw new Error('Failed to upload PDF: ' + uploadError.message);
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      message: 'Statement of Account generated successfully'
    });

  } catch (error) {
    console.error('SOA generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate Statement of Account',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

