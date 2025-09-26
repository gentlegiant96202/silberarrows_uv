import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
// Dynamic import for pdf-lib to avoid module resolution issues
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Helper: Merge Warranty Agreement with Warranty Booklet
async function mergeWithWarrantyBooklet(agreementPdfBuffer: Buffer): Promise<Buffer> {
  try {
    console.log('🔄 Starting warranty PDF merge process...');
    
    // Dynamic import for pdf-lib
    const { PDFDocument } = await import('pdf-lib');
    
    // Load the generated warranty agreement PDF
    const mergedPdf = await PDFDocument.create();
    const agreementPdf = await PDFDocument.load(agreementPdfBuffer);
    
    // Copy warranty agreement pages (portrait) - should be 1 page
    const agreementPages = await mergedPdf.copyPages(agreementPdf, agreementPdf.getPageIndices());
    agreementPages.forEach(page => mergedPdf.addPage(page));
    console.log(`✅ Added ${agreementPages.length} warranty agreement page(s)`);
    
    // Load Warranty booklet from public folder
    const bookletPath = path.join(process.cwd(), 'public', 'extendedwarrantyinformationbooklet_23_9_25 compressed by Phil.pdf');
    
    if (!fs.existsSync(bookletPath)) {
      console.warn('⚠️ Warranty booklet not found at:', bookletPath);
      console.log('📄 Returning warranty agreement without booklet merge');
      // Return just the agreement if booklet doesn't exist yet
      return agreementPdfBuffer;
    }
    
    const bookletBuffer = fs.readFileSync(bookletPath);
    const bookletPdf = await PDFDocument.load(bookletBuffer);
    
    // Copy all booklet pages
    const bookletPages = await mergedPdf.copyPages(bookletPdf, bookletPdf.getPageIndices());
    bookletPages.forEach(page => mergedPdf.addPage(page));
    console.log(`✅ Added ${bookletPages.length} warranty booklet page(s)`);
    
    // Generate final merged PDF
    const finalPdfBuffer = await mergedPdf.save();
    console.log(`✅ Warranty PDF merge completed - Total pages: ${agreementPages.length + bookletPages.length}`);
    
    return Buffer.from(finalPdfBuffer);
    
  } catch (error) {
    console.error('❌ Error merging warranty PDFs:', error);
    throw error;
  }
}

// Export the PDF generation function for use by the API endpoint
export async function generateWarrantyAgreementPdf(data: any): Promise<Buffer> {
  console.log('🚀 Starting warranty agreement PDF generation...');
  
  // Format dates to DD/MM/YYYY (same as service contract)
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

  // Get warranty type display text
  const warrantyTypeDisplay = (data.warrantyType === 'premium') ? 'PREMIUM' : 'STANDARD';
  const amount = data.invoiceAmount || '0.00';

  // Resolve logo data URL from local PNG (same as service contract)
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
    } catch (e) {
      // continue to next candidate
    }
  }

  // Generate HTML content - EXACT REPLICA of service contract template with warranty-specific content
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Extended Warranty Agreement Form - ${data.referenceNo}</title>
        <style>
          @page {
            margin: 0;
            background: #000000;
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
            font-size: 8px;
            line-height: 1.2;
            width: 297mm; /* Landscape width */
            height: 210mm; /* Landscape height */
            margin: 0;
            padding: 0;
            overflow: hidden;
            box-sizing: border-box;
          }

          .page {
            background: rgba(255, 255, 255, 0.02);
            border: none;
            padding: 10px 15px;
            width: 297mm;
            height: 210mm;
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }

          .two-column-container {
            display: flex;
            gap: 15px;
            flex: 1;
            margin-bottom: 10px;
          }

          .column {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 0 0 15px 0;
            padding: 8px 12px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 12px;
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
            background: rgba(255, 255, 255, 0.08);
            border-radius: 12px;
            pointer-events: none;
          }

          .title-section {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            z-index: 3;
            text-align: center;
          }

          .title {
            font-size: 18px;
            font-weight: 900;
            color: white;
            margin: 0;
            letter-spacing: 0.5px;
            line-height: 1.1;
          }

          .logo {
            width: 45px;
            height: auto;
            position: relative;
            z-index: 3;
          }

          .section {
            margin: 0;
            background: rgba(255, 255, 255, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 8px;
            padding: 8px 10px;
            position: relative;
            width: 100%;
            box-sizing: border-box;
            flex: 1;
          }

          .section::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255, 255, 255, 0.04);
            border-radius: 8px;
            pointer-events: none;
          }

          .section-title {
            font-size: 9px;
            font-weight: bold;
            margin-bottom: 4px;
            color: white;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: relative;
            z-index: 2;
            padding-bottom: 2px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          }

          .form-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 0;
            background: rgba(255, 255, 255, 0.03);
            border-radius: 6px;
            overflow: hidden;
            position: relative;
            z-index: 2;
            box-sizing: border-box;
          }

          .form-table td {
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 4px 6px;
            vertical-align: middle;
            color: white;
            font-size: 8px;
            background: rgba(255, 255, 255, 0.02);
            position: relative;
            height: 20px;
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
            margin-top: 8px;
            gap: 20px;
            position: relative;
            z-index: 2;
          }

          .signature-box {
            flex: 1;
            font-size: 8px;
            color: white;
          }

          .signature-area {
            border: 1px solid #cccccc;
            background-color: #f5f5f5;
            height: 60px;
            width: 100%;
            margin: 3px 0;
            border-radius: 3px;
            position: relative;
            display: flex;
            align-items: flex-end;
            padding: 3px;
          }

          .signature-date {
            font-size: 7px;
            color: #666;
          }

          .text-content {
            color: white;
            font-size: 8px;
            line-height: 1.2;
            margin: 3px 0;
            position: relative;
            z-index: 2;
            text-align: justify;
            white-space: pre-line;
          }

          .footer {
            text-align: center;
            margin-top: 6px;
            padding-top: 4px;
            font-size: 7px;
            color: rgba(255, 255, 255, 0.7);
            border-top: 1px solid rgba(255, 255, 255, 0.2);
            position: relative;
            z-index: 2;
          }

          .full-width-section {
            grid-column: 1 / -1;
          }

          .notes-section {
            min-height: 60px;
            display: flex;
            flex-direction: column;
          }

          .notes-content {
            flex: 1;
            padding-top: 4px;
            line-height: 1.2;
          }
        </style>
    </head>
    <body>
        <div class="page">
            <!-- Header -->
            <div class="header">
                <div class="title-section">
                    <div class="title">EXTENDED WARRANTY AGREEMENT FORM</div>
                </div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
            </div>

            <!-- Welcome to Extended Warranty -->
            <div class="section full-width-section" style="margin-bottom: 10px;">
                <div class="section-title">Welcome to Extended Warranty</div>
                <div class="text-content" style="font-size: 10px; text-align: justify; line-height: 1.2;">
                    Thank you for purchasing the SilberArrows Extended Warranty. You've made a smart decision; your Mercedes-Benz is now protected against unexpected repair costs, with coverage tailored to suit your vehicle's needs and age.<br>
                    This protection not only brings peace of mind, but also helps safeguard the long-term performance, value, and reliability of your car.<br>
                    The Extended Warranty Information Booklet is included in this document and forms part of your agreement. Please review the details before signing, including the coverage summary, exclusions, and transfer and claims process.<br>
                    Once activated, you'll receive your Extended Warranty card with a QR code, allowing you to access the latest version of the booklet at any time.<br>
                    We appreciate your trust in SilberArrows and look forward to supporting you with expert care and honest service.<br><br>~ SilberArrows
                </div>
            </div>

            <!-- Two Column Layout -->
            <div class="two-column-container">
                <!-- Left Column -->
                <div class="column">
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
                                <td class="label">Type:</td>
                                <td class="data">${(data.warrantyType === 'premium') ? 'PREMIUM' : 'STANDARD'}</td>
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
                </div>

                <!-- Right Column -->
                <div class="column">
                    <!-- Vehicle Information -->
                    <div class="section">
                        <div class="section-title">Vehicle Information</div>
                        <table class="form-table">
                            <tr>
                                <td class="label">VIN:</td>
                                <td class="data">${data.vin}</td>
                                <td class="label">Make & Model:</td>
                                <td class="data">${data.make && data.model ? (data.make.toLowerCase().includes('mercedes') && data.model.toLowerCase().includes('mercedes') ? data.model : `${data.make} ${data.model}`) : (data.make || data.model || '')}</td>
                            </tr>
                            <tr>
                                <td class="label">Model Year:</td>
                                <td class="data">${data.modelYear}</td>
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
                                <td class="label">Warranty Start Date:</td>
                                <td class="data">${formattedStartDate}</td>
                                <td class="label">Warranty End Date:</td>
                                <td class="data">${formattedEndDate}</td>
                            </tr>
                        <tr>
                            <td class="label">Warranty cut off KM:</td>
                            <td class="data">${data.cutOffKm}</td>
                            <td class="label">Invoice Amount:</td>
                            <td class="data">${data.invoiceAmount || ''}</td>
                        </tr>
                        </table>
                        <div class="text-content" style="font-style: italic; margin-top: 3px;">
                            <strong>IMPORTANT:</strong> Agreement expires whichever comes first, date or kilometers.
                        </div>
                    </div>

                </div>
            </div>

            <!-- Additional Notes -->
            <div class="section full-width-section" style="margin-bottom: 8px; min-height: 50px; display: flex; flex-direction: column;">
                <div class="section-title">Additional Notes</div>
                <div class="text-content" style="flex: 1; padding-top: 4px;">
                    ${data.notes || 'No additional notes'}
                </div>
            </div>

            <!-- Full width sections at bottom -->
            <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 8px; padding: 6px 8px; margin-bottom: 8px;">
                <div style="font-size: 9px; font-weight: bold; margin-bottom: 2px; color: white; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid rgba(255, 255, 255, 0.15); padding-bottom: 2px;">Joint Acknowledgment</div>
                <div style="margin: 0; line-height: 1.2; font-size: 10px; padding: 2px 0; color: white;">
                    The Customer accepts the Extended Warranty terms in the Information Booklet (incorporated into this Agreement) and confirms the above details are correct and they are authorised to sign; SilberArrows confirms the details are correct and that the Extended Warranty terms were explained. Coverage ends on the earlier of the End Date or the cut-off kilometres.
                </div>
            </div>

            <!-- Signatures -->
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
    </body>
    </html>
    `;

  console.log('📄 Generating warranty agreement PDF using PDFShift...');

  // Call PDFShift API with LANDSCAPE format (same as service contracts)
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
      landscape: true, // Same as service contracts
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

  const agreementPdfBuffer = await pdfResponse.arrayBuffer();
  console.log('✅ Warranty Agreement PDF generated successfully:', { sizeBytes: agreementPdfBuffer.byteLength, sizeMB: (agreementPdfBuffer.byteLength / 1024 / 1024).toFixed(2) });

  // Merge with Warranty booklet
  console.log('🔄 Merging with warranty booklet...');
  const pdfBuffer = await mergeWithWarrantyBooklet(Buffer.from(agreementPdfBuffer));
  console.log('✅ Merged warranty PDF created successfully:', { sizeBytes: pdfBuffer.byteLength, sizeMB: (pdfBuffer.byteLength / 1024 / 1024).toFixed(2) });

  return pdfBuffer;
}

// Main POST handler (for direct API calls if needed)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('🚀 Warranty Agreement PDF generation API called');
    
    const pdfBuffer = await generateWarrantyAgreementPdf(data);
    
    // Return the PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Warranty_Agreement_${data.referenceNo || 'document'}.pdf"`,
      },
    });
    
  } catch (error) {
    console.error('Error in warranty PDF generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate warranty PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
