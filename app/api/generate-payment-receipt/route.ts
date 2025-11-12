import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Helper: Build the Payment Receipt HTML (PORTRAIT, modern black and silver design)
function buildPaymentReceiptHtml(
  data: any,
  logoSrc: string,
  formatDate: (dateString: string) => string,
  formatCurrency: (amount: number) => string
): string {
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
            background: #000000; 
            size: A4 portrait;
          }
          
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          
          body { 
            background: #000000; 
            color: white; 
            font-family: 'Arial', sans-serif; 
            font-size: 10px; 
            line-height: 1.4; 
            width: 210mm; 
            height: 297mm; 
            margin: 0; 
            padding: 0; 
            overflow: hidden; 
            box-sizing: border-box; 
          }
          
          .page { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, rgba(255, 255, 255, 0.01) 100%); 
            border: none; 
            padding: 20px; 
            width: 210mm; 
            height: 297mm; 
            position: relative; 
            overflow: hidden; 
            box-sizing: border-box; 
            display: flex; 
            flex-direction: column; 
          }
          
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 30px; 
            padding: 20px; 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%); 
            border: 1px solid rgba(255, 255, 255, 0.15); 
            border-radius: 16px; 
            position: relative; 
            z-index: 2; 
            width: 100%; 
            box-sizing: border-box; 
          }
          
          .title-section { 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            position: relative; 
            z-index: 3; 
            text-align: center; 
            flex: 1; 
          }
          
          .title { 
            font-size: 24px; 
            font-weight: 900; 
            color: white; 
            margin: 0 0 8px 0; 
            letter-spacing: 1px; 
            line-height: 1.1; 
            text-transform: uppercase; 
          }
          
          .subtitle { 
            font-size: 12px; 
            color: rgba(255, 255, 255, 0.7); 
            margin: 0; 
            letter-spacing: 0.5px; 
          }
          
          .logo { 
            width: 60px; 
            height: auto; 
            position: relative; 
            z-index: 3; 
          }
          
          .receipt-number { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%); 
            border: 1px solid rgba(255, 255, 255, 0.2); 
            border-radius: 8px; 
            padding: 12px 16px; 
            text-align: center; 
            margin-bottom: 25px; 
          }
          
          .receipt-number-label { 
            font-size: 10px; 
            color: rgba(255, 255, 255, 0.7); 
            margin-bottom: 4px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          
          .receipt-number-value { 
            font-size: 16px; 
            font-weight: bold; 
            color: white; 
            letter-spacing: 1px; 
          }
          
          .content-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr; 
            gap: 20px; 
            flex: 1; 
            margin-bottom: 25px; 
          }
          
          .section { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%); 
            border: 1px solid rgba(255, 255, 255, 0.12); 
            border-radius: 12px; 
            padding: 16px; 
            position: relative; 
            width: 100%; 
            box-sizing: border-box; 
          }
          
          .section-title { 
            font-size: 11px; 
            font-weight: bold; 
            margin-bottom: 12px; 
            color: white; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            position: relative; 
            z-index: 2; 
            padding-bottom: 6px; 
            border-bottom: 1px solid rgba(255, 255, 255, 0.15); 
          }
          
          .info-table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0; 
            margin: 0; 
            background: rgba(255, 255, 255, 0.03); 
            border-radius: 8px; 
            overflow: hidden; 
            position: relative; 
            z-index: 2; 
            box-sizing: border-box; 
          }
          
          .info-table td { 
            border: 1px solid rgba(255, 255, 255, 0.15); 
            padding: 8px 12px; 
            vertical-align: middle; 
            color: white; 
            font-size: 10px; 
            background: rgba(255, 255, 255, 0.02); 
            position: relative; 
            height: 28px; 
          }
          
          .info-table .label { 
            background: rgba(255, 255, 255, 0.08); 
            font-weight: bold; 
            width: 40%; 
            color: rgba(255, 255, 255, 0.95); 
          }
          
          .info-table .data { 
            width: 60%; 
            font-weight: 500; 
          }
          
          .payment-details { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%); 
            border: 1px solid rgba(255, 255, 255, 0.15); 
            border-radius: 12px; 
            padding: 20px; 
            margin-bottom: 25px; 
            position: relative; 
          }
          
          .payment-amount { 
            text-align: center; 
            margin-bottom: 20px; 
          }
          
          .amount-label { 
            font-size: 12px; 
            color: rgba(255, 255, 255, 0.7); 
            margin-bottom: 8px; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          
          .amount-value { 
            font-size: 32px; 
            font-weight: 900; 
            color: white; 
            letter-spacing: 1px; 
            text-shadow: 0 0 10px rgba(255, 255, 255, 0.1); 
          }
          
          .payment-method { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 12px 16px; 
            background: rgba(255, 255, 255, 0.05); 
            border-radius: 8px; 
            border: 1px solid rgba(255, 255, 255, 0.1); 
          }
          
          .method-label { 
            font-size: 11px; 
            color: rgba(255, 255, 255, 0.8); 
            font-weight: 500; 
          }
          
          .method-value { 
            font-size: 12px; 
            color: white; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
          }
          
          .notes-section { 
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.02) 100%); 
            border: 1px solid rgba(255, 255, 255, 0.12); 
            border-radius: 12px; 
            padding: 16px; 
            margin-bottom: 25px; 
          }
          
          .notes-content { 
            color: white; 
            font-size: 10px; 
            line-height: 1.4; 
            margin: 0; 
            position: relative; 
            z-index: 2; 
            text-align: justify; 
            white-space: pre-line; 
          }
          
          .footer { 
            text-align: center; 
            margin-top: auto; 
            padding-top: 20px; 
            font-size: 8px; 
            color: rgba(255, 255, 255, 0.6); 
            border-top: 1px solid rgba(255, 255, 255, 0.2); 
            position: relative; 
            z-index: 2; 
            line-height: 1.3; 
          }
          
          .status-badge { 
            display: inline-block; 
            padding: 6px 12px; 
            background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
            color: white; 
            border-radius: 20px; 
            font-size: 9px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px; 
            margin-top: 8px; 
          }
        </style>
    </head>
    <body>
        <div class="page">
            <!-- Header -->
            <div class="header">
                <div class="title-section">
                    <div class="title">Payment Receipt</div>
                    <div class="subtitle">SilberArrows Leasing</div>
                </div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
            </div>

            <!-- Receipt Number -->
            <div class="receipt-number">
                <div class="receipt-number-label">Receipt Number</div>
                <div class="receipt-number-value">${data.receiptNumber}</div>
            </div>

            <!-- Content Grid -->
            <div class="content-grid">
                <!-- Customer Information -->
                <div class="section">
                    <div class="section-title">Customer Information</div>
                    <table class="info-table">
                        <tr>
                            <td class="label">Customer Name:</td>
                            <td class="data">${data.customerName}</td>
                        </tr>
                        <tr>
                            <td class="label">Lease ID:</td>
                            <td class="data">${data.leaseId}</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Date:</td>
                            <td class="data">${formatDate(data.paymentDate)}</td>
                        </tr>
                        <tr>
                            <td class="label">Reference:</td>
                            <td class="data">${data.referenceNumber || 'N/A'}</td>
                        </tr>
                    </table>
                </div>

                <!-- Payment Information -->
                <div class="section">
                    <div class="section-title">Payment Information</div>
                    <table class="info-table">
                        <tr>
                            <td class="label">Payment ID:</td>
                            <td class="data">${data.paymentId}</td>
                        </tr>
                        <tr>
                            <td class="label">Status:</td>
                            <td class="data">
                                <span class="status-badge">${data.status}</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">Processed By:</td>
                            <td class="data">${data.processedBy || 'System'}</td>
                        </tr>
                        <tr>
                            <td class="label">Transaction Time:</td>
                            <td class="data">${formatDate(data.createdAt)}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <!-- Payment Details -->
            <div class="payment-details">
                <div class="payment-amount">
                    <div class="amount-label">Amount Received</div>
                    <div class="amount-value">${formatCurrency(data.amount)}</div>
                </div>
                <div class="payment-method">
                    <div class="method-label">Payment Method:</div>
                    <div class="method-value">${data.paymentMethod}</div>
                </div>
            </div>

            <!-- Notes Section -->
            ${data.notes ? `
            <div class="notes-section">
                <div class="section-title">Notes</div>
                <div class="notes-content">${data.notes}</div>
            </div>
            ` : ''}

            <!-- Footer -->
            <div class="footer">
                Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
                TRN: 100281137800003 | Tel: +971 4 380 5515<br>
                service@silberarrows.com | www.silberarrows.com<br><br>
                This receipt is generated automatically and serves as proof of payment.
            </div>
        </div>
    </body>
    </html>`;
}

// Helper: Generate Payment Receipt PDF and return as Buffer
async function generatePaymentReceiptPdf(data: any): Promise<Buffer> {
  // Format dates to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AE', {
      style: 'currency',
      currency: 'AED',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Resolve logo
  const logoFileCandidates = [
    path.join(process.cwd(), 'public', 'main-logo.png'),
    path.join(process.cwd(), 'renderer', 'public', 'main-logo.png')
  ];
  let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png';
  for (const candidate of logoFileCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        const logoData = fs.readFileSync(candidate);
        const b64 = logoData.toString('base64');
        logoSrc = `data:image/png;base64,${b64}`;
        break;
      }
    } catch {}
  }

  // Build HTML using the template
  const htmlContent = buildPaymentReceiptHtml(data, logoSrc, formatDate, formatCurrency);

  const resp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: htmlContent,
      format: 'A4',
      margin: '0',
      landscape: false, // Portrait for receipts
      use_print: true,
      delay: 1000
    }),
  });
  
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`PDFShift API error: ${resp.status} - ${errText}`);
  }
  
  const pdfBuffer = await resp.arrayBuffer();
  return Buffer.from(pdfBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    // Validate required data
    if (!data.receiptNumber || !data.customerName || !data.amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: receiptNumber, customerName, and amount are required' },
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
    // Generate PDF
    const pdfBuffer = await generatePaymentReceiptPdf(data);
    // Upload PDF to Supabase storage
    let pdfUrl = null;
    try {
      const fileName = `Payment_Receipt_${data.receiptNumber}_${Date.now()}.pdf`;
      const filePath = `payment-receipts/${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('service-documents')
        .upload(filePath, pdfBuffer, {
          contentType: 'application/pdf',
          upsert: false
        });

      if (uploadError) {
      } else {
        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from('service-documents')
          .getPublicUrl(filePath);
        
        pdfUrl = urlData.publicUrl;
      }
    } catch (storageError) {
    }
    // Return JSON response with PDF URL
    const response = {
      success: true,
      pdfUrl: pdfUrl,
      receiptNumber: data.receiptNumber,
      message: 'Payment receipt generated successfully',
      timestamp: new Date().toISOString()
    };
    return NextResponse.json(response);

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
