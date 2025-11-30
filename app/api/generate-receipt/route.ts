import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Generate HTML content for payment receipt
function generateReceiptHTML(data: {
  receiptNumber: string;
  paymentDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  paymentMethod: string;
  amount: number;
  referenceNumber?: string;
  vehicleInfo?: string;
  reservationNumber?: string;
  notes?: string;
}, logoSrc: string) {
  
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

  // Inline SVG dirham icon for PDF
  const dirhamIcon = `<svg style="width: 14px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 2px;" viewBox="0 0 344.84 299.91" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>`;
  
  // Larger version for the main amount
  const dirhamIconLarge = `<svg style="width: 22px; height: 19px; display: inline-block; vertical-align: middle; margin-right: 4px;" viewBox="0 0 344.84 299.91" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M342.14,140.96l2.7,2.54v-7.72c0-17-11.92-30.84-26.56-30.84h-23.41C278.49,36.7,222.69,0,139.68,0c-52.86,0-59.65,0-109.71,0,0,0,15.03,12.63,15.03,52.4v52.58h-27.68c-5.38,0-10.43-2.08-14.61-6.01l-2.7-2.54v7.72c0,17.01,11.92,30.84,26.56,30.84h18.44s0,29.99,0,29.99h-27.68c-5.38,0-10.43-2.07-14.61-6.01l-2.7-2.54v7.71c0,17,11.92,30.82,26.56,30.82h18.44s0,54.89,0,54.89c0,38.65-15.03,50.06-15.03,50.06h109.71c85.62,0,139.64-36.96,155.38-104.98h32.46c5.38,0,10.43,2.07,14.61,6l2.7,2.54v-7.71c0-17-11.92-30.83-26.56-30.83h-18.9c.32-4.88.49-9.87.49-15s-.18-10.11-.51-14.99h28.17c5.37,0,10.43,2.07,14.61,6.01ZM89.96,15.01h45.86c61.7,0,97.44,27.33,108.1,89.94l-153.96.02V15.01ZM136.21,284.93h-46.26v-89.98l153.87-.02c-9.97,56.66-42.07,88.38-107.61,90ZM247.34,149.96c0,5.13-.11,10.13-.34,14.99l-157.04.02v-29.99l157.05-.02c.22,4.84.33,9.83.33,15Z"/></svg>`;

  const formatPaymentMethod = (method: string) => {
    const methods: Record<string, string> = {
      'cash': 'Cash',
      'bank_transfer': 'Bank Transfer',
      'credit_card': 'Credit Card',
      'cheque': 'Cheque',
      'part_exchange': 'Part Exchange',
      'finance': 'Finance'
    };
    return methods[method] || method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Convert number to words
  const numberToWords = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    if (num === 0) return 'Zero';
    if (num < 0) return 'Negative ' + numberToWords(Math.abs(num));
    
    let words = '';
    
    if (Math.floor(num / 1000000) > 0) {
      words += numberToWords(Math.floor(num / 1000000)) + ' Million ';
      num %= 1000000;
    }
    if (Math.floor(num / 1000) > 0) {
      words += numberToWords(Math.floor(num / 1000)) + ' Thousand ';
      num %= 1000;
    }
    if (Math.floor(num / 100) > 0) {
      words += numberToWords(Math.floor(num / 100)) + ' Hundred ';
      num %= 100;
    }
    if (num > 0) {
      if (num < 20) {
        words += ones[num];
      } else {
        words += tens[Math.floor(num / 10)];
        if (num % 10 > 0) words += '-' + ones[num % 10];
      }
    }
    return words.trim();
  };

  const amountInWords = (amount: number): string => {
    const wholePart = Math.floor(amount);
    const decimalPart = Math.round((amount - wholePart) * 100);
    let result = numberToWords(wholePart) + ' Dirhams';
    if (decimalPart > 0) {
      result += ' and ' + numberToWords(decimalPart) + ' Fils';
    }
    return result + ' Only';
  };

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt - ${data.receiptNumber}</title>
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

        .receipt {
          padding: 25px 35px;
          max-width: 210mm;
          margin: 0 auto;
        }

        /* Header */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 15px;
          padding-bottom: 12px;
          border-bottom: 2px solid #1a1a1a;
        }

        .company-info {
          flex: 1;
        }

        .company-name {
          font-size: 20px;
          font-weight: 700;
          color: #1a1a1a;
          margin-bottom: 3px;
          letter-spacing: 1px;
        }

        .company-details {
          font-size: 9px;
          color: #666;
          line-height: 1.4;
        }

        .logo {
          width: 60px;
          height: auto;
        }

        /* Receipt Title */
        .receipt-title {
          text-align: center;
          margin-bottom: 15px;
        }

        .receipt-title h1 {
          font-size: 22px;
          font-weight: 700;
          color: #1a1a1a;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin-bottom: 5px;
        }

        .receipt-number {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        /* Info Grid */
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .info-section {
          background: #f8f8f8;
          padding: 12px;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .info-section h3 {
          font-size: 9px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
          padding-bottom: 5px;
          border-bottom: 1px solid #e0e0e0;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 10px;
        }

        .info-row:last-child {
          margin-bottom: 0;
        }

        .info-label {
          color: #666;
        }

        .info-value {
          font-weight: 600;
          color: #1a1a1a;
          text-align: right;
        }

        /* Amount Section */
        .amount-section {
          background: #f0f0f0;
          border: 2px solid #ccc;
          color: #1a1a1a;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 15px;
          text-align: center;
        }

        .amount-label {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 2px;
          color: #666;
          margin-bottom: 5px;
        }

        .amount-value {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 1px;
          color: #1a1a1a;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .amount-words {
          font-size: 9px;
          color: #666;
          margin-top: 5px;
          font-style: italic;
        }

        /* Notes */
        .notes-section {
          margin-bottom: 15px;
          padding: 10px;
          background: #fffef0;
          border: 1px solid #f0e68c;
          border-radius: 6px;
        }

        .notes-section h3 {
          font-size: 9px;
          font-weight: 700;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 5px;
        }

        .notes-text {
          font-size: 10px;
          color: #666;
          font-style: italic;
        }

        /* Footer */
        .footer {
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid #e0e0e0;
          text-align: center;
        }

        .footer-text {
          font-size: 8px;
          color: #999;
          margin-bottom: 3px;
        }

        .thank-you {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a1a;
          margin-bottom: 10px;
        }

        .signature-area {
          display: flex;
          justify-content: space-between;
          margin-top: 20px;
          gap: 30px;
        }

        .signature-box {
          flex: 1;
          text-align: center;
        }

        .signature-line {
          border-top: 1px solid #1a1a1a;
          padding-top: 8px;
          margin-top: 35px;
          font-size: 9px;
          color: #666;
        }

        /* Payment Summary */
        .payment-summary {
          background: #fafafa;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .summary-row {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px dashed #e0e0e0;
          font-size: 10px;
        }

        .summary-row:last-child {
          border-bottom: none;
          font-weight: 700;
          font-size: 12px;
          padding-top: 8px;
          margin-top: 5px;
          border-top: 2px solid #ccc;
        }

        .summary-label {
          color: #666;
        }

        .summary-value {
          color: #1a1a1a;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          <div class="company-info">
            <div class="company-name">SILBERARROWS</div>
            <div class="company-details">
              Silber Arrows 1934 Used Car Trading LLC<br>
              Al Manara St., Al Quoz 1, Dubai, UAE<br>
              P.O. Box 185095<br>
              TRN: 100281137800003<br>
              Tel: +971 4 380 5515<br>
              sales@silberarrows.com | www.silberarrows.com
            </div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <!-- Receipt Title -->
        <div class="receipt-title">
          <h1>Payment Receipt</h1>
          <div class="receipt-number">${data.receiptNumber}</div>
        </div>

        <!-- Info Grid -->
        <div class="info-grid">
          <div class="info-section">
            <h3>Receipt Details</h3>
            <div class="info-row">
              <span class="info-label">Date:</span>
              <span class="info-value">${formatDate(data.paymentDate)}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method:</span>
              <span class="info-value">${formatPaymentMethod(data.paymentMethod)}</span>
            </div>
            ${data.referenceNumber ? `
            <div class="info-row">
              <span class="info-label">Reference:</span>
              <span class="info-value">${data.referenceNumber}</span>
            </div>
            ` : ''}
            ${data.reservationNumber ? `
            <div class="info-row">
              <span class="info-label">Reservation:</span>
              <span class="info-value">${data.reservationNumber}</span>
            </div>
            ` : ''}
          </div>

          <div class="info-section">
            <h3>Customer Details</h3>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${data.customerName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone:</span>
              <span class="info-value">${data.customerPhone}</span>
            </div>
            ${data.customerEmail ? `
            <div class="info-row">
              <span class="info-label">Email:</span>
              <span class="info-value">${data.customerEmail}</span>
            </div>
            ` : ''}
          </div>
        </div>

        <!-- Amount Section -->
        <div class="amount-section">
          <div class="amount-label">Amount Received</div>
          <div class="amount-value">
            ${dirhamIconLarge}${formatCurrency(data.amount)}
          </div>
          <div class="amount-words">${amountInWords(data.amount)}</div>
        </div>

        <!-- Payment Summary -->
        <div class="payment-summary">
          <div class="summary-row">
            <span class="summary-label">Payment Date</span>
            <span class="summary-value">${formatDate(data.paymentDate)}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">Payment Method</span>
            <span class="summary-value">${formatPaymentMethod(data.paymentMethod)}</span>
          </div>
          ${data.referenceNumber ? `
          <div class="summary-row">
            <span class="summary-label">Reference Number</span>
            <span class="summary-value">${data.referenceNumber}</span>
          </div>
          ` : ''}
          ${data.reservationNumber ? `
          <div class="summary-row">
            <span class="summary-label">Reservation / Invoice</span>
            <span class="summary-value">${data.reservationNumber}</span>
          </div>
          ` : ''}
          ${data.vehicleInfo ? `
          <div class="summary-row">
            <span class="summary-label">Vehicle</span>
            <span class="summary-value">${data.vehicleInfo}</span>
          </div>
          ` : ''}
          <div class="summary-row">
            <span class="summary-label">Total Amount Received</span>
            <span class="summary-value">${dirhamIcon}${formatCurrency(data.amount)}</span>
          </div>
        </div>

        ${data.notes ? `
        <!-- Notes -->
        <div class="notes-section">
          <h3>Notes</h3>
          <div class="notes-text">${data.notes}</div>
        </div>
        ` : ''}

        <!-- Signature Area -->
        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line">Received By (SilberArrows)</div>
          </div>
          <div class="signature-box">
            <div class="signature-line">Customer Acknowledgment</div>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="thank-you">Thank you for your payment!</div>
          <div class="footer-text">This is a computer-generated receipt and is valid without signature.</div>
          <div class="footer-text">For any queries, please contact us at +971 4 380 5515 or sales@silberarrows.com</div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const { paymentId, customerName, customerPhone, customerEmail, vehicleInfo, reservationNumber, notes } = await request.json();

    // Validate required data
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
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

    // Fetch payment details
    const { data: payment, error: paymentError } = await supabase
      .from('uv_payments')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
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
        // continue to next candidate
      }
    }

    // Generate HTML content
    const htmlContent = generateReceiptHTML({
      receiptNumber: payment.receipt_number || `RCP-${Date.now()}`,
      paymentDate: payment.payment_date,
      customerName: customerName || 'Customer',
      customerPhone: customerPhone || '',
      customerEmail: customerEmail || '',
      paymentMethod: payment.payment_method,
      amount: payment.amount,
      referenceNumber: payment.reference_number,
      vehicleInfo: vehicleInfo,
      reservationNumber: reservationNumber,
      notes: notes || payment.notes
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
    const fileName = `receipt-${paymentId}-${Date.now()}.pdf`;
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

    // Update payment with receipt URL
    const { error: updateError } = await supabase
      .from('uv_payments')
      .update({ receipt_url: publicUrl })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Failed to update payment with receipt URL:', updateError);
    }

    return NextResponse.json({
      success: true,
      receiptUrl: publicUrl,
      receiptNumber: payment.receipt_number,
      message: 'Receipt generated successfully'
    });

  } catch (error) {
    console.error('Receipt generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate receipt',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

