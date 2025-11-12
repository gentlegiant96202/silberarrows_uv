import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface NegotiationData {
  // Only from negotiation modal
  vehicle_make?: string;
  vehicle_model?: string;
  vehicle_year?: string | number;
  mileage?: number;
  vin?: string;
  direct_purchase_price?: number;
  consignment_price?: number;
  negotiation_notes?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPANY_INFO = {
  name: 'SilberArrows',
  phone: '+971 4 380 5515',
  email: 'sales@silberarrows.com',
  website: 'www.silberarrows.com'
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getVehicleDisplayName(data: NegotiationData): string {
  // Use ONLY vehicle_make from negotiation modal
  const make = data.vehicle_make || '';
  
  if (make) {
    return make;
  }
  return 'Vehicle';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================================================
// HTML TEMPLATE - A4 OPTIMIZED
// ============================================================================

function buildConsignmentQuotationHtml(negotiationData: NegotiationData, logoSrc: string): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

   const vehicleName = getVehicleDisplayName(negotiationData);
   const hasDirectPurchase = negotiationData.direct_purchase_price && negotiationData.direct_purchase_price > 0;
   const consignmentPrice = negotiationData.consignment_price || 0;
   const hasOnlyOneOption = (hasDirectPurchase && consignmentPrice <= 0) || (!hasDirectPurchase && consignmentPrice > 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${COMPANY_INFO.name} Purchase Agreement Quotation</title>
    <style>
           @page {
               margin: 0;
               size: A4;
           }
           
           * {
               margin: 0;
               padding: 0;
               box-sizing: border-box;
               font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
           }

           html, body {
               background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #4a4a4a 100%);
               color: #e0e0e0;
               width: 100vw;
               height: 100vh;
               margin: 0;
               padding: 0;
               overflow: hidden;
               position: fixed;
               top: 0;
               left: 0;
               right: 0;
               bottom: 0;
           }

           .document {
               position: fixed;
               inset: 0;
               width: 100vw;
               height: 100vh;
               background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #4a4a4a 100%);
               padding: 10mm;
               display: flex;
               flex-direction: column;
               overflow: hidden;
           }

           .document.single-option {
               justify-content: flex-start;
           }

           .document.single-option .content {
               flex: 0 0 auto;
           }

           .document.single-option .options-container {
               flex: 0 0 auto;
           }


           .header {
               display: flex;
               justify-content: space-between;
               align-items: flex-start;
               padding: 8px 0;
               margin-bottom: 12px;
               border-bottom: 1px solid rgba(255, 255, 255, 0.2);
               flex-shrink: 0;
           }

           .header-left {
               flex: 1;
           }

           .header-right {
               display: flex;
               flex-direction: column;
               align-items: flex-end;
           }

           .logo {
               width: 45px;
               height: 45px;
               margin-bottom: 5px;
               filter: brightness(1.2);
           }

           .title {
               font-size: 1.4rem;
               color: #ffffff;
               font-weight: 600;
               margin-bottom: 2px;
               letter-spacing: 0.3px;
           }

           .date {
               font-size: 0.75rem;
               color: rgba(255, 255, 255, 0.6);
               margin-bottom: 5px;
           }

           .content {
               flex: 0 0 auto;
               display: flex;
               flex-direction: column;
               gap: 10px;
           }

        .vehicle-details {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .vehicle-details h2 {
            font-size: 1rem;
            margin-bottom: 8px;
            color: #ffffff;
            font-weight: 600;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 4px;
        }

        .details-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }

        .detail-item {
            display: flex;
            flex-direction: column;
        }

        .detail-label {
            font-size: 0.7rem;
            color: #c0c0c0;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 2px;
        }

        .detail-value {
            font-size: 0.85rem;
            color: #ffffff;
            font-weight: 500;
        }

           .options-container {
               display: flex;
               flex-direction: column;
               gap: 12px;
               flex: 0 0 auto;
           }

        .card {
            background: linear-gradient(145deg, #2a2a2a, #1f1f1f);
            border-radius: 8px;
            padding: 15px;
            box-shadow: none;
            position: relative;
            overflow: hidden;
            border: none;
        }

        .card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(to right, #ffffff, #c0c0c0);
        }

        .card-title {
            font-size: 1.1rem;
            margin-bottom: 10px;
            color: #ffffff;
            font-weight: 600;
        }

        .card-content {
            line-height: 1.4;
            margin-bottom: 10px;
        }

        .highlight {
            color: #ffffff;
            font-weight: 600;
        }

        .benefits-list {
            list-style-type: none;
            margin: 8px 0;
        }

        .benefits-list li {
            padding: 3px 0;
            display: flex;
            align-items: center;
            font-size: 0.75rem;
        }

        .benefits-list li::before {
            content: '✓';
            color: #c0c0c0;
            font-weight: bold;
            margin-right: 6px;
            font-size: 0.8rem;
        }

        .quote-section {
            background: transparent !important;
            padding: 12px;
            border-radius: 6px;
            margin: 8px 0;
            text-align: center;
            border: none !important;
            outline: none;
            box-shadow: none !important;
        }

        .quote-value {
            font-size: 1.6rem;
            font-weight: 700;
            color: #ffffff;
            margin: 8px 0;
            background: linear-gradient(to right, #ffffff, #c0c0c0);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .quote-label {
            font-size: 0.8rem;
            color: #c0c0c0;
            margin-bottom: 4px;
        }

        .quote-description {
            font-size: 0.75rem;
            color: #888;
            margin-top: 4px;
        }

        .notes-section {
            background: rgba(255, 255, 255, 0.05);
            padding: 8px;
            border-radius: 6px;
            border-left: 3px solid #c0c0c0;
            margin-top: 8px;
        }

        .notes-title {
            font-size: 0.85rem;
            color: #ffffff;
            margin-bottom: 4px;
            font-weight: 600;
        }

        .notes-content {
            font-size: 0.75rem;
            color: #b0b0b0;
            line-height: 1.3;
        }

        .footer {
            margin-top: 10px;
            text-align: center;
            padding: 8px 0;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: #a0a0a0;
            font-size: 0.75rem;
            flex-shrink: 0;
        }

        .contact-info {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-top: 5px;
        }

           .contact-item {
               display: flex;
               align-items: center;
               font-size: 0.7rem;
           }

           .contact-separator {
               color: rgba(255, 255, 255, 0.4);
               font-size: 0.7rem;
               margin: 0 8px;
           }

        .validity {
            margin-top: 4px;
            color: #666;
            font-size: 0.65rem;
        }
    </style>
</head>
<body>
    <div class="document ${hasOnlyOneOption ? 'single-option' : ''}">
           <!-- Header -->
           <div class="header">
               <div class="header-left">
                    <h2 class="title">Exclusive Vehicle Consignment & Acquisition Specialists</h2>
                   <p class="date">Date: ${currentDate}</p>
               </div>
               <div class="header-right">
                   <img src="${logoSrc}" alt="${COMPANY_INFO.name} Logo" class="logo">
               </div>
           </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Vehicle Details -->
            <div class="vehicle-details">
                <h2>Vehicle Details</h2>
                <div class="details-grid">
                    <div class="detail-item">
                        <div class="detail-label">Make & Model</div>
                        <div class="detail-value">${vehicleName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Year</div>
                        <div class="detail-value">${negotiationData.vehicle_year || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Mileage</div>
                        <div class="detail-value">${negotiationData.mileage ? negotiationData.mileage.toLocaleString() + ' km' : 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">VIN</div>
                        <div class="detail-value">${negotiationData.vin || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <!-- Options Container -->
            <div class="options-container">
                ${hasDirectPurchase ? `
                <!-- Direct Purchase Option -->
                <div class="card">
                    <h2 class="card-title">Direct Purchase Option</h2>
                    <div class="card-content">
                           <p>We offer a <span class="highlight">straightforward, immediate purchase</span> of your ${vehicleName.replace(/MERCEDES\s+BENZ/gi, 'Mercedes-Benz')}. This option provides you with instant liquidity and a hassle-free transaction.</p>
                        
                        <div class="quote-section">
                            <div class="quote-label">Our competitive purchase offer:</div>
                            <div class="quote-value">${formatCurrency(negotiationData.direct_purchase_price!)}</div>
                            <div class="quote-description">Funds available within 24 hours of agreement</div>
                        </div>
                        
                        <ul class="benefits-list">
                            <li>Immediate payment - no waiting</li>
                            <li>No commissions or fees</li>
                            <li>Simple paperwork process</li>
                            <li>We handle all documentation</li>
                            <li>Free vehicle pickup service</li>
                        </ul>
                    </div>
                </div>
                ` : ''}

                ${consignmentPrice > 0 ? `
                <!-- Premium Consignment Program -->
                <div class="card">
                    <h2 class="card-title">Premium Consignment Program</h2>
                    <div class="card-content">
                        <p>Our exclusive consignment program leverages our <span class="highlight">premium buyer network and marketing expertise</span> to maximize your vehicle's selling price.</p>
                        
                        <div class="quote-section">
                            <div class="quote-label">Estimated consignment value range:</div>
                            <div class="quote-value">${formatCurrency(consignmentPrice)}</div>
                            <div class="quote-description">Based on current market analysis and comparable vehicles</div>
                        </div>
                        
                        <ul class="benefits-list">
                            <li>Access to premium buyer network</li>
                            <li>Professional photography & marketing</li>
                            <li>Showroom display in prime location</li>
                            <li>Negotiation handled by our experts</li>
                            <li>Competitive commission rate</li>
                            <li>90-day selling period guarantee</li>
                        </ul>
                    </div>
                </div>
                ` : ''}
            </div>

            ${negotiationData.negotiation_notes ? `
            <!-- Negotiation Notes -->
            <div class="notes-section">
                <div class="notes-title">Additional Notes</div>
                <div class="notes-content">${negotiationData.negotiation_notes}</div>
            </div>
            ` : ''}
        </div>

           <!-- Footer -->
           <div class="footer">
               <div class="contact-info">
                   <div class="contact-item">${COMPANY_INFO.phone}</div>
                   <div class="contact-separator">|</div>
                   <div class="contact-item">${COMPANY_INFO.email}</div>
                   <div class="contact-separator">|</div>
                   <div class="contact-item">${COMPANY_INFO.website}</div>
               </div>
               <div class="validity">This quote is valid for 7 days from issuance date</div>
           </div>
    </div>
</body>
</html>`;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

async function generateConsignmentQuotationPdf(negotiationData: NegotiationData): Promise<Buffer> {
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
  const htmlContent = buildConsignmentQuotationHtml(negotiationData, logoSrc);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
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
      delay: 500
    }),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`PDFShift API error: ${resp.status} - ${errText}`);
  }
  
  const pdfBuffer = await resp.arrayBuffer();
  return Buffer.from(pdfBuffer);
}

// ============================================================================
// STORAGE UTILITIES
// ============================================================================

function sanitizeFilename(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .substring(0, 100);
}

async function uploadPdfToStorage(pdfBuffer: Buffer, negotiationData: NegotiationData): Promise<string> {
  const safeMake = sanitizeFilename(negotiationData.vehicle_make || 'Unknown');
  const safeModel = sanitizeFilename(negotiationData.vehicle_model || 'Unknown');
  const safeYear = negotiationData.vehicle_year || 'Unknown';
  
  const fileName = `Consignment_Quotation_${safeMake}_${safeModel}_${safeYear}_${Date.now()}.pdf`;
  const filePath = `consignment-quotations/${fileName}`;
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('Consignment')
    .upload(filePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false
    });

  if (uploadError) {
    throw new Error('Failed to upload PDF to storage: ' + uploadError.message);
  }
  const { data: urlData } = supabase.storage
    .from('Consignment')
    .getPublicUrl(filePath);
  
  return urlData.publicUrl;
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const { consignmentData } = await request.json();
    
    // Extract ONLY negotiation modal data - this is the key fix!
    const negotiationData: NegotiationData = {
      vehicle_make: consignmentData?.vehicle_make,
      vehicle_model: consignmentData?.vehicle_model,
      vehicle_year: consignmentData?.vehicle_year,
      mileage: consignmentData?.mileage,
      vin: consignmentData?.vin,
      direct_purchase_price: consignmentData?.direct_purchase_price,
      consignment_price: consignmentData?.consignment_price,
      negotiation_notes: consignmentData?.negotiation_notes
    };
    // Validation
    if (!negotiationData) {
      return NextResponse.json(
        { error: 'Missing required parameters: consignmentData is required' },
        { status: 400 }
      );
    }

    if (!negotiationData.vehicle_make || !negotiationData.vehicle_model || !negotiationData.vehicle_year) {
      return NextResponse.json(
        { error: 'Vehicle make, model, and year are required for PDF generation' },
        { status: 400 }
      );
    }

    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }
    // Generate PDF
    const pdfBuffer = await generateConsignmentQuotationPdf(negotiationData);
    // Upload PDF to Supabase storage
    let pdfUrl: string;
    try {
      pdfUrl = await uploadPdfToStorage(pdfBuffer, negotiationData);
    } catch (storageError) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to upload PDF to storage: ' + (storageError as Error).message 
        },
        { status: 500 }
      );
    }
    const response = {
      success: true,
      pdfUrl: pdfUrl,
      fileName: `Consignment_Quotation_${negotiationData.vehicle_make}_${negotiationData.vehicle_model}_${negotiationData.vehicle_year}_${Date.now()}.pdf`,
      message: 'Consignment quotation PDF generated successfully',
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