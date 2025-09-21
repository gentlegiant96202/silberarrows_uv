import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Helper: Generate Service Agreement PDF and return as Buffer  
export async function generateServiceAgreementPdf(data: any): Promise<Buffer> {
  // Format dates to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formattedStartDate = formatDate(data.startDate);
  const formattedEndDate = formatDate(data.endDate);

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

  // Build HTML (trimmed to rely on existing template structure)
  const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>ServiceCare Agreement Form - ${data.referenceNo}</title><style>@page{margin:0;background:#000}*{margin:0;padding:0;box-sizing:border-box}body{background:#000;color:#fff;font-family:'Arial',sans-serif;font-size:10px;line-height:1.25;width:210mm;height:297mm;margin:0;padding:0;overflow:hidden}.page{background:rgba(255,255,255,.02);padding:8px 10px 18px 10px;width:210mm;height:297mm;position:relative;display:flex;flex-direction:column}.content-container{display:flex;flex-direction:column;gap:10px;flex:1}.signatures-bottom{margin-top:auto}.header{display:flex;justify-content:space-between;align-items:flex-start;margin:0 0 20px 0;padding:10px 15px 8px 15px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:15px}.title{font-size:21px;font-weight:900}.date-line{font-size:21px;font-weight:900}.logo{width:55px;height:auto}.section{margin:0 0 12px 0;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:10px 12px}.section-title{font-size:12px;font-weight:700;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px}.form-table{width:100%;border-collapse:separate;border-spacing:0;margin:0 0 4px 0}.form-table td{border:1px solid rgba(255,255,255,.15);padding:6px 10px;font-size:10px;background:rgba(255,255,255,.02)}.form-table .label{background:rgba(255,255,255,0.08);font-weight:bold;width:25%;color:rgba(255,255,255,0.95)}.form-table .data{width:25%}.signature-section{display:flex;justify-content:space-between;gap:30px}.signature-box{flex:1}.signature-area{border:1px solid #ccc;background:#f5f5f5;height:80px;width:100%;margin:5px 0;border-radius:4px;position:relative;padding:5px}.signature-date{font-size:9px;color:#666;position:absolute;bottom:5px;left:5px}.text-content{color:rgba(255,255,255,.9);font-size:10px;line-height:1.4;margin:8px 0;text-align:justify}.footer{text-align:center;margin-top:8px;padding-top:8px;font-size:8px;color:rgba(255,255,255,.7);border-top:1px solid rgba(255,255,255,.25)}</style></head><body><div class="page"><div class="header"><div class="title-section"><div class="title">SERVICECARE</div><div class="date-line">AGREEMENT FORM</div></div><img src="${logoSrc}" alt="SilberArrows Logo" class="logo"></div><div class="content-container"><div class="section"><table class="form-table"><tr><td class="label">Date:</td><td class="data">${formatDate(new Date().toISOString())}</td><td class="label">Reference No.:</td><td class="data">${data.referenceNo}</td></tr><tr><td class="label">Sales Executive:</td><td class="data">N/A</td><td class="label">Status:</td><td class="data">ACTIVE</td></tr></table></div><div class="section"><div class="section-title">Customer Information</div><table class="form-table"><tr><td class="label">Owner's Name:</td><td class="data">${data.ownerName}</td><td class="label">ID Number:</td><td class="data">${data.customerIdNumber || ''}</td></tr><tr><td class="label">Mobile No.:</td><td class="data">${data.mobileNo}</td><td class="label">Email:</td><td class="data">${data.email}</td></tr></table></div><div class="section"><div class="section-title">Dealer Information</div><table class="form-table"><tr><td class="label">Dealer Name:</td><td class="data">${data.dealerName}</td><td class="label">Phone No.:</td><td class="data">${data.dealerPhone}</td></tr></table></div><div class="section"><div class="section-title">Vehicle Information</div><table class="form-table"><tr><td class="label">VIN:</td><td class="data">${data.vin}</td><td class="label">Model year & Make:</td><td class="data">${data.modelYear} ${data.make}</td></tr><tr><td class="label">Model:</td><td class="data">${data.model}</td><td class="label">Kilometers:</td><td class="data">${data.currentOdometer || ''}</td></tr><tr><td class="label">Exterior Colour:</td><td class="data">${data.exteriorColour || ''}</td><td class="label">Interior Colour:</td><td class="data">${data.interiorColour || ''}</td></tr></table></div><div class="section"><div class="section-title">Duration of the Agreement</div><table class="form-table"><tr><td class="label">ServiceCare Start Date:</td><td class="data">${formattedStartDate}</td><td class="label">ServiceCare End Date:</td><td class="data">${formattedEndDate}</td></tr><tr><td class="label">ServiceCare cut off KM:</td><td class="data">${data.cutOffKm}</td><td class="label"></td><td class="data"></td></tr></table><div class="text-content" style="font-style: italic; margin-top: 4px;"><strong>IMPORTANT:</strong> Agreement expires whichever comes first, date or kilometers.</div></div><div class="section"><div class="section-title">Customer Declaration</div><div class="text-content">By my signature below, I confirm that I have thoroughly read & understood the terms & conditions of this Agreement as stated in the attached ServiceCare Information Booklet, that I have received a completed copy of this Agreement & the associated Information Booklet. I agree to be bound by the terms & conditions noted in this Booklet.</div></div><div class="section"><div class="section-title">Dealer Declaration</div><div class="text-content">We hereby declare that all the details set out in this Agreement are accurate & correct. The terms & conditions of this ServiceCare are explained in the attached Information Booklet.</div></div></div><div class="signatures-bottom"><div class="signature-section"><div class="signature-box"><div>SilberArrows Signature:</div><div class="signature-area"><div class="signature-date">Date:</div></div></div><div class="signature-box"><div>Customer Signature:</div><div class="signature-area"><div class="signature-date">Date:</div></div></div></div><div class="footer">Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095 | TRN: 100281137800003 | Tel: +971 4 380 5515 | service@silberarrows.com | www.silberarrows.com</div></div></div></body></html>`;

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
      landscape: false,
      use_print: true,
      delay: 1000
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`PDFShift API error: ${resp.status} - ${errText}`);
  }
  const arrayBuf = await resp.arrayBuffer();
  return Buffer.from(arrayBuf);
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const skipDatabase = data.skipDatabase || false; // New flag to skip database operations
    
    console.log('📝 Generating service agreement:', { referenceNo: data.referenceNo, ownerName: data.ownerName, skipDatabase });
    console.log('📝 Form data received:', JSON.stringify(data, null, 2));
    
    // Format dates to DD/MM/YYYY
    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const formattedStartDate = formatDate(data.startDate);
    const formattedEndDate = formatDate(data.endDate);
    const currentDate = formatDate(new Date().toISOString());

    // Get service type display text and amount
    const serviceTypeDisplay = (data.serviceType === 'premium') ? 'PREMIUM' : 'STANDARD';
    const amount = data.invoiceAmount || '0.00';

    // Resolve logo data URL from local PNG (fallback to cloud if missing)
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

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ServiceCare Agreement Form - ${data.referenceNo}</title>
        <style>
          @page {
            margin: 0;
            background: radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%, #000000 100%);
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            background: radial-gradient(ellipse at center, #1a1a1a 0%, #000000 70%, #000000 100%);
            color: white;
            font-family: 'Arial', sans-serif;
            font-size: 10px;
            line-height: 1.25;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            box-sizing: border-box;
          }

          .page {
            background: rgba(255, 255, 255, 0.02);
            border: none;
            padding: 15px 10px 15px 10px;
            width: 210mm;
            height: 297mm;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .page.first-page {
            padding: 8px 10px 18px 10px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 0 0 25px 0;
            padding: 10px 15px 8px 15px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 15px;
            position: relative;
            z-index: 2;
            width: 100%;
            box-sizing: border-box;
          }

          .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.1) 0%, 
              rgba(255, 255, 255, 0.02) 50%, 
              rgba(255, 255, 255, 0.08) 100%);
            border-radius: 15px;
            pointer-events: none;
          }

          .title-section {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            position: relative;
            z-index: 3;
          }

          .title {
            font-size: 21px;
            font-weight: 900;
            color: white;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
            line-height: 1.1;
          }

          .date-line {
            font-size: 12px;
            font-weight: 400;
            color: white;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          }

          .logo {
            width: 55px;
            height: auto;
            position: relative;
            z-index: 3;
          }

          .content-container {
            position: relative;
            z-index: 1;
            width: 100%;
            flex: 1 1 auto;
            overflow: visible;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .signatures-bottom { 
            margin-top: auto; 
          }

          .section {
            margin: 0 0 8px 0;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 10px 12px;
            position: relative;
            width: 100%;
            box-sizing: border-box;
          }

          .section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.06) 0%, 
              rgba(255, 255, 255, 0.01) 50%, 
              rgba(255, 255, 255, 0.04) 100%);
            border-radius: 12px;
            pointer-events: none;
          }

          .section-title {
            font-size: 12px;
            font-weight: bold;
            margin-bottom: 4px;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
            position: relative;
            z-index: 2;
            padding-bottom: 2px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          }

          .form-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 0 0 4px 0;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 8px;
            overflow: hidden;
            position: relative;
            z-index: 2;
            box-sizing: border-box;
          }

          .form-table td {
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 6px 10px;
            vertical-align: middle;
            color: white;
            font-size: 10px;
            background: rgba(255, 255, 255, 0.02);
            position: relative;
          }

          .form-table td:first-child {
            border-left: none;
          }

          .form-table td:last-child {
            border-right: none;
          }

          .form-table tr:first-child td {
            border-top: none;
          }

          .form-table tr:last-child td {
            border-bottom: none;
          }

          .form-table .label {
            background: rgba(255, 255, 255, 0.08);
            font-weight: bold;
            width: 25%;
            color: rgba(255, 255, 255, 0.95);
          }

          .form-table .data {
            width: 25%;
          }

          .signature-section {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
            gap: 30px;
            position: relative;
            z-index: 2;
          }

          .signature-box {
            flex: 1;
            font-size: 10px;
            color: white;
          }

          .signature-area {
            border: 1px solid #cccccc;
            background-color: #f5f5f5;
            height: 60px;
            width: 100%;
            margin: 5px 0;
            border-radius: 4px;
            position: relative;
            display: flex;
            align-items: flex-end;
            padding: 5px;
          }

          .signature-date {
            font-size: 9px;
            color: #666;
          }

          .text-content {
            color: white;
            font-size: 9px;
            line-height: 1.3;
            margin: 4px 0;
            position: relative;
            z-index: 2;
            text-align: justify;
            white-space: pre-line;
          }

          .footer {
            text-align: center;
            margin-top: 8px;
            padding-top: 8px;
            font-size: 8px;
            color: rgba(255, 255, 255, 0.7);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 2;
          }
        </style>
    </head>
    <body>
        <div class="page first-page">
            <!-- Header -->
            <div class="header">
                <div class="title-section">
                    <div class="title">SERVICECARE</div>
                    <div class="date-line">AGREEMENT FORM</div>
                </div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
            </div>

            <div class="content-container">
                <!-- Document Information -->
                <div class="section">
                    <table class="form-table">
                        <tr>
                            <td class="label">Date:</td>
                            <td class="data">${formatDate(new Date().toISOString())}</td>
                            <td class="label">Reference No.:</td>
                            <td class="data">${data.referenceNo}</td>
                        </tr>
                        <tr>
                            <td class="label">Sales Executive:</td>
                            <td class="data">${data.salesExecutive || 'N/A'}</td>
                            <td class="label">Status:</td>
                            <td class="data">ACTIVE</td>
                        </tr>
                    </table>
                </div>

                <!-- Customer Information -->
                <div class="section">
                    <div class="section-title">Customer Information</div>
                    <table class="form-table">
                        <tr>
                            <td class="label">Owner's Name:</td>
                            <td class="data">${data.ownerName}</td>
                            <td class="label">ID Number:</td>
                            <td class="data">${data.customerIdNumber || ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Mobile No.:</td>
                            <td class="data">${data.mobileNo}</td>
                            <td class="label">Email:</td>
                            <td class="data">${data.email}</td>
                        </tr>
                    </table>
                </div>

                <!-- Dealer Information -->
                <div class="section">
                    <div class="section-title">Dealer Information</div>
                    <table class="form-table">
                        <tr>
                            <td class="label">Dealer Name:</td>
                            <td class="data">${data.dealerName}</td>
                            <td class="label">Phone No.:</td>
                            <td class="data">${data.dealerPhone}</td>
                        </tr>
                        <tr>
                            <td class="label">Dealer Email:</td>
                            <td class="data">${data.dealerEmail || 'service@silberarrows.com'}</td>
                            <td class="label"></td>
                            <td class="data"></td>
                        </tr>
                    </table>
                </div>

                <!-- Vehicle Information -->
                <div class="section">
                    <div class="section-title">Vehicle Information</div>
                    <table class="form-table">
                        <tr>
                            <td class="label">VIN:</td>
                            <td class="data">${data.vin}</td>
                            <td class="label">Model year & Make:</td>
                            <td class="data">${data.modelYear} ${data.make}</td>
                        </tr>
                        <tr>
                            <td class="label">Model:</td>
                            <td class="data">${data.model}</td>
                            <td class="label">Kilometers:</td>
                            <td class="data">${data.currentOdometer || ''}</td>
                        </tr>
                        <tr>
                            <td class="label">Exterior Colour:</td>
                            <td class="data">${data.exteriorColour || ''}</td>
                            <td class="label">Interior Colour:</td>
                            <td class="data">${data.interiorColour || ''}</td>
                        </tr>
                    </table>
                </div>

                <!-- Duration of the Agreement -->
                <div class="section">
                    <div class="section-title">Duration of the Agreement</div>
                    <table class="form-table">
                        <tr>
                            <td class="label">ServiceCare Start Date:</td>
                            <td class="data">${formattedStartDate}</td>
                            <td class="label">ServiceCare End Date:</td>
                            <td class="data">${formattedEndDate}</td>
                        </tr>
                        <tr>
                            <td class="label">ServiceCare cut off KM:</td>
                            <td class="data">${data.cutOffKm}</td>
                            <td class="label"></td>
                            <td class="data"></td>
                        </tr>
                    </table>
                    <div class="text-content" style="font-style: italic; margin-top: 4px;">
                        <strong>IMPORTANT:</strong> Agreement expires whichever comes first, date or kilometers.
                    </div>
                </div>

                <!-- Customer Declaration -->
                <div class="section">
                    <div class="section-title">Customer Declaration</div>
                    <div class="text-content">
                        By my signature below, I confirm that I have thoroughly read & understood the terms & conditions of this Agreement as stated in the attached ServiceCare Information Booklet, that I have received a completed copy of this Agreement & the associated Information Booklet. I agree to be bound by the terms & conditions noted in this Booklet.
                    </div>
                </div>

                <!-- Dealer Declaration -->
                <div class="section">
                    <div class="section-title">Dealer Declaration</div>
                    <div class="text-content">
                        We hereby declare that all the details set out in this Agreement are accurate & correct. The terms & conditions of this ServiceCare are explained in the attached Information Booklet.
                    </div>
                </div>

            </div>

            <!-- Signatures at bottom (anchored for DocuSign) -->
            <div class="signatures-bottom">
                <div class="signature-section">
                    <div class="signature-box">
                        <div>SilberArrows Signature:</div>
                        <div class="signature-area">
                            <div class="signature-date">Date:</div>
                        </div>
                    </div>
                    <div class="signature-box">
                        <div>Customer Signature:</div>
                        <div class="signature-area">
                            <div class="signature-date">Date:</div>
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="footer">
                    Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095 | TRN: 100281137800003 | Tel: +971 4 380 5515 | service@silberarrows.com | www.silberarrows.com
                </div>
            </div>
        </div>
    </body>
    </html>
    `;

    // Validate required data
    if (!data.referenceNo || !data.ownerName) {
      console.error('❌ Missing required parameters:', { 
        referenceNo: !!data.referenceNo, 
        ownerName: !!data.ownerName,
        receivedData: Object.keys(data)
      });
      return NextResponse.json(
        { error: 'Missing required parameters: referenceNo and ownerName are required' },
        { status: 400 }
      );
    }

    // Additional validation for database operations
    if (!skipDatabase && (!data.startDate || !data.endDate)) {
      console.error('❌ Missing required date parameters for database operations:', { 
        startDate: !!data.startDate, 
        endDate: !!data.endDate 
      });
      return NextResponse.json(
        { error: 'Missing required parameters: startDate and endDate are required for database operations' },
        { status: 400 }
      );
    }

    // Validate PDFShift API key
    if (!process.env.PDFSHIFT_API_KEY) {
      console.error('❌ PDFShift API key not configured');
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }

    console.log('📄 HTML content generated, length:', htmlContent.length);
    
    // Debug: Check if signature strings are in HTML
    const hasSilberArrowsSignature = htmlContent.includes('SilberArrows Signature:');
    const hasCustomerSignature = htmlContent.includes('Customer Signature:');
    console.log('🔍 Signature strings in HTML:', { 
      hasSilberArrowsSignature, 
      hasCustomerSignature,
      signatureSection: htmlContent.includes('signature-section')
    });
    
    console.log('📄 Generating service agreement PDF using PDFShift...');

    // Call PDFShift API
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
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
        delay: 1000
      }),
    });

    console.log('📊 PDFShift API response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('❌ PDFShift API error:', errorText);
      throw new Error(`PDFShift API error: ${pdfResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('✅ PDF generated successfully:', { sizeBytes: pdfBuffer.byteLength, sizeMB: (pdfBuffer.byteLength / 1024 / 1024).toFixed(2) });

    // Handle database operations (skip if this is PDF-only generation)
    let contractData = null;
    if (!skipDatabase) {
      try {
        // Check if contract already exists by reference number
        console.log('🔍 Checking if contract already exists...');
        const { data: existingContract, error: checkError } = await supabase
          .from('service_contracts')
          .select('*')
          .eq('reference_no', data.referenceNo)
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          // PGRST116 is "not found" error, which is expected for new contracts
          console.error('❌ Error checking existing contract:', checkError);
          throw new Error('Failed to check existing contract');
        }

        if (existingContract) {
          // Contract exists, update it
          console.log('📝 Updating existing contract...');
          const { data: dbData, error: dbError } = await supabase
            .from('service_contracts')
            .update({
              owner_name: data.ownerName,
              mobile_no: data.mobileNo,
              email: data.email,
              dealer_name: data.dealerName,
              dealer_phone: data.dealerPhone,
              dealer_email: data.dealerEmail,
              vin: data.vin,
              make: data.make,
              model: data.model,
              model_year: data.modelYear,
              current_odometer: data.currentOdometer,
              start_date: data.startDate,
              end_date: data.endDate,
              cut_off_km: data.cutOffKm,
              updated_at: new Date().toISOString()
            })
            .eq('reference_no', data.referenceNo)
            .select()
            .single();

          if (dbError) {
            console.error('❌ Database update error:', dbError);
            throw new Error('Failed to update contract in database');
          }

          contractData = dbData;
          console.log('✅ Contract updated successfully, ID:', contractData.id);
        } else {
          // Contract doesn't exist, create new one
          console.log('💾 Creating new contract...');
          const { data: dbData, error: dbError } = await supabase
            .from('service_contracts')
            .insert({
              reference_no: data.referenceNo,
              owner_name: data.ownerName,
              mobile_no: data.mobileNo,
              email: data.email,
              dealer_name: data.dealerName,
              dealer_phone: data.dealerPhone,
              dealer_email: data.dealerEmail,
              vin: data.vin,
              make: data.make,
              model: data.model,
              model_year: data.modelYear,
              current_odometer: data.currentOdometer,
              start_date: data.startDate,
              end_date: data.endDate,
              cut_off_km: data.cutOffKm,
              status: 'active'
            })
            .select()
            .single();

          if (dbError) {
            console.error('❌ Database insert error:', dbError);
            throw new Error('Failed to save contract to database');
          }

          contractData = dbData;
          console.log('✅ Contract created successfully, ID:', contractData.id);
        }

      } catch (dbError) {
        console.error('❌ Failed to handle contract database operations:', dbError);
        console.error('❌ Contract data that failed:', {
          referenceNo: data.referenceNo,
          ownerName: data.ownerName,
          email: data.email
        });
        throw new Error('Failed to handle contract database operations');
      }
    } else {
      console.log('⏭️ Skipping database operations (PDF-only generation)');
    }

    // Upload PDF to Supabase storage (skip if this is PDF-only generation)
    let pdfUrl = null;
    if (!skipDatabase && contractData) {
      try {
        const fileName = `ServiceCare_Agreement_${data.referenceNo}_${Date.now()}.pdf`;
        const filePath = `service-contracts/${fileName}`;

        console.log('☁️ Uploading PDF to storage bucket: service-documents');
        console.log('📁 File path:', filePath);
        console.log('📄 PDF size:', pdfBuffer.byteLength, 'bytes');

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('service-documents')
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          console.error('🔍 Error details:', JSON.stringify(uploadError, null, 2));
          
          // Continue without failing - PDF will still download
          console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
        } else {
          console.log('✅ PDF uploaded successfully:', uploadData);
          
          // Get public URL for the uploaded file
          const { data: urlData } = supabase.storage
            .from('service-documents')
            .getPublicUrl(filePath);
          
          pdfUrl = urlData.publicUrl;
          console.log('📄 PDF generated and uploaded:', pdfUrl);

          // Update contract record with PDF URL
          console.log('💾 Updating contract with PDF URL...');
          const { error: updateError } = await supabase
            .from('service_contracts')
            .update({ pdf_url: pdfUrl })
            .eq('id', contractData.id);

          if (updateError) {
            console.error('❌ Failed to update contract with PDF URL:', updateError);
          } else {
            console.log('✅ Contract updated with PDF URL successfully');
          }
        }
      } catch (storageError) {
        console.error('❌ Failed to upload PDF to storage:', storageError);
        console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
      }
    } else {
      console.log('⏭️ Skipping storage upload (PDF-only generation)');
    }

    // Log contract creation activity (skip if this is PDF-only generation)
    if (!skipDatabase && contractData) {
      try {
        console.log('📝 Logging contract activity...');
        await supabase
          .from('contract_activities')
          .insert({
            contract_id: contractData.id,
            contract_type: 'service',
            activity_type: 'created',
            activity_description: `ServiceCare agreement ${data.referenceNo} created for ${data.ownerName}`,
            activity_data: {
              reference_no: data.referenceNo,
              vehicle: `${data.make} ${data.model} (${data.modelYear})`,
              vin: data.vin,
              pdf_url: pdfUrl
            }
          });
        console.log('✅ Activity logged successfully');
      } catch (activityError) {
        console.error('❌ Failed to log activity:', activityError);
        // Continue without failing
      }
    } else {
      console.log('⏭️ Skipping activity logging (PDF-only generation)');
    }

    console.log('🎉 SERVICE AGREEMENT PROCESS COMPLETED');
    console.log('📊 Final status: PDF URL =', pdfUrl ? 'SAVED TO CLOUD' : 'LOCAL DOWNLOAD ONLY');

    // Return JSON response with PDF URL for local state updates
    const response: any = {
      success: true,
      pdfUrl: pdfUrl,
      referenceNo: data.referenceNo,
      message: 'Service agreement generated successfully',
      timestamp: new Date().toISOString() // Add timestamp to help identify new PDFs
    };

    // Add contract ID if database operations were performed
    if (!skipDatabase && contractData) {
      response.contractId = contractData.id;
    }

    console.log('📤 Returning response with PDF URL:', pdfUrl);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error generating service agreement:', error);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method to retrieve existing service contracts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractId = searchParams.get('contractId');
    const referenceNo = searchParams.get('referenceNo');

    if (!contractId && !referenceNo) {
      return NextResponse.json(
        { error: 'Either contractId or referenceNo is required' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('service_contracts')
      .select('*');

    if (contractId) {
      query = query.eq('id', contractId);
    } else if (referenceNo) {
      query = query.eq('reference_no', referenceNo);
    }

    const { data: contracts, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching service contracts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch service contracts' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      contracts
    });

  } catch (error) {
    console.error('Error fetching service contracts:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 