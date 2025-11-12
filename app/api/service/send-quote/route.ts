import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface QuoteData {
  customerName: string;
  countryCode: string;
  mobileNumber: string;
  model: string;
  variant: string;
  year: string;
  tier: 'standard' | 'premium';
  price: number;
  duration: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const COMPANY_INFO = {
  name: 'SilberArrows',
  phone: '+971 4 380 5515',
  email: 'service@silberarrows.com',
  website: 'www.silberarrows.com'
};

const WEBHOOK_URL = 'https://bothook.io/v1/public/triggers/webhooks/9145884c-e0b2-497b-91ef-fac616ca653f';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

// ============================================================================
// HTML TEMPLATE FOR SERVICECARE QUOTE
// ============================================================================

function buildServiceCareQuoteHtml(quoteData: QuoteData): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Load logo from filesystem
  const logoFileCandidates = [
    path.join(process.cwd(), 'public', 'MAIN LOGO.png'),
    path.join(process.cwd(), 'public', 'main-logo.png')
  ];
  
  let logoSrc = 'https://res.cloudinary.com/dw0ciqgwd/image/upload/v1735721054/MAIN_LOGO_krrykw.png';
  
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

  const isStandard = quoteData.tier === 'standard';
  const isPremium = quoteData.tier === 'premium';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ServiceCare Quote - ${COMPANY_INFO.name}</title>
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
            background: #000000;
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
            background: #000000;
            padding: 10mm;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            padding: 10px 0;
            margin-bottom: 20px;
            border-bottom: 2px solid rgba(255, 255, 255, 0.2);
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
            width: 50px;
            height: 50px;
            margin-bottom: 8px;
            filter: brightness(1.2);
        }

        .title {
            font-size: 1.6rem;
            color: #ffffff;
            font-weight: 700;
            margin-bottom: 5px;
            letter-spacing: 0.5px;
            line-height: 1.2;
        }

        .subtitle {
            font-size: 1rem;
            color: #ffffff;
            font-weight: 400;
            margin-bottom: 8px;
        }

        .date {
            font-size: 0.75rem;
            color: rgba(255, 255, 255, 0.6);
        }

        .content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 15px;
        }

        /* Customer & Vehicle Info */
        .info-section {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .info-section h2 {
            font-size: 1.1rem;
            margin-bottom: 12px;
            color: #ffffff;
            font-weight: 600;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            padding-bottom: 6px;
        }

        .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
        }

        .info-item {
            display: flex;
            flex-direction: column;
        }

        .info-label {
            font-size: 0.75rem;
            color: #c0c0c0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .info-value {
            font-size: 0.95rem;
            color: #ffffff;
            font-weight: 500;
        }

        /* Price Card */
        .price-card {
            background: linear-gradient(145deg, #2a2a2a, #1f1f1f);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            position: relative;
            overflow: hidden;
            border: none;
            margin: 10px 0;
            box-shadow: none;
        }

        .price-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: linear-gradient(to right, #ffffff, #c0c0c0);
        }

        .price-label {
            font-size: 0.9rem;
            color: #ffffff;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .price-value {
            font-size: 3rem;
            font-weight: 700;
            color: #ffffff;
            margin: 15px 0;
        }

        .package-badge {
            display: inline-block;
            padding: 8px 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 20px;
            font-size: 0.85rem;
            color: #ffffff;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 10px;
        }

        /* Package Details */
        .package-details {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .package-details h3 {
            font-size: 1rem;
            color: #ffffff;
            margin-bottom: 15px;
            font-weight: 600;
        }

        .coverage-info {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 20px;
        }

        .coverage-item {
            background: rgba(255, 255, 255, 0.05);
            padding: 12px;
            border-radius: 6px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .coverage-label {
            font-size: 0.7rem;
            color: #c0c0c0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 4px;
        }

        .coverage-value {
            font-size: 1.1rem;
            color: #ffffff;
            font-weight: 600;
        }

        .services-list {
            list-style-type: none;
            margin: 0;
            padding: 0;
        }

        .services-list li {
            padding: 8px 0;
            display: flex;
            align-items: start;
            font-size: 0.85rem;
            color: #e0e0e0;
        }

        .services-list li::before {
            content: '✓';
            color: #ffffff;
            font-weight: bold;
            margin-right: 10px;
            font-size: 1rem;
        }

        /* Footer */
        .footer {
            margin-top: auto;
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
    <div class="document">
        <!-- Header -->
        <div class="header">
            <div class="header-left">
                <h1 class="title">ServiceCare<br>Quotation</h1>
                <p class="date">Date: ${currentDate}</p>
            </div>
            <div class="header-right">
                <img src="${logoSrc}" alt="${COMPANY_INFO.name} Logo" class="logo">
            </div>
        </div>
        
        <!-- Content -->
        <div class="content">
            <!-- Customer Information -->
            <div class="info-section">
                <h2>Customer Information</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Customer Name</div>
                        <div class="info-value">${quoteData.customerName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Mobile Number</div>
                        <div class="info-value">${quoteData.countryCode} ${quoteData.mobileNumber}</div>
                    </div>
                </div>
            </div>

            <!-- Vehicle Information -->
            <div class="info-section">
                <h2>Vehicle Details</h2>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Model</div>
                        <div class="info-value">${quoteData.model}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Variant</div>
                        <div class="info-value">${quoteData.variant}</div>
                    </div>
                    ${quoteData.year !== 'N/A' ? `
                    <div class="info-item">
                        <div class="info-label">Year</div>
                        <div class="info-value">${quoteData.year}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Price Card -->
            <div class="price-card">
                <div class="price-label">ServiceCare Package Price</div>
                <div class="price-value">${formatCurrency(quoteData.price)}</div>
                <div class="package-badge">${quoteData.tier.toUpperCase()} PACKAGE</div>
            </div>

            <!-- Package Details -->
            <div class="package-details">
                <h3>Coverage Details</h3>
                <div class="coverage-info">
                    <div class="coverage-item">
                        <div class="coverage-label">Duration</div>
                        <div class="coverage-value">${quoteData.duration}</div>
                    </div>
                    <div class="coverage-item">
                        <div class="coverage-label">Mileage</div>
                        <div class="coverage-value">${isStandard ? '30,000 km' : '60,000 km'}</div>
                    </div>
                </div>
                
                <ul class="services-list">
                    ${isStandard ? `
                    <li>Service A (Minor)</li>
                    <li>Service B (Major)</li>
                    <li>Brake Fluid</li>
                    ` : ''}
                    ${isPremium ? `
                    <li>Service A (Minor) x2</li>
                    <li>Service B (Major) x2</li>
                    <li>Brake Fluid x2</li>
                    <li>Coolant</li>
                    <li>Spark Plug</li>
                    <li>Transmission Oil & Filter</li>
                    ` : ''}
                </ul>
            </div>
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
            <div class="validity">This quote is valid for 7 days from the date of issuance</div>
        </div>
    </div>
</body>
</html>`;
}

// ============================================================================
// PDF GENERATION
// ============================================================================

async function generateServiceCarePdf(quoteData: QuoteData): Promise<string> {
  const htmlContent = buildServiceCareQuoteHtml(quoteData);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  
  // Request metadata (JSON) instead of binary PDF to get the URL
  const resp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
    method: 'POST',
    headers: {
      'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
      'Content-Type': 'application/json',
      'Accept': 'application/json', // Request JSON response with metadata
    },
    body: JSON.stringify({
      source: htmlContent,
      format: 'A4',
      margin: '0',
      landscape: false,
      use_print: true,
      delay: 500,
      filename: `ServiceCare_Quote_${quoteData.model}_${quoteData.variant}_${Date.now()}.pdf`
    }),
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`PDFShift API error: ${resp.status} - ${errText}`);
  }
  
  // Parse JSON response to get the PDF URL
  const responseData = await resp.json();
  if (responseData.url) {
    return responseData.url;
  }
  
  // Fallback
  throw new Error('PDFShift did not return a PDF URL');
}

// ============================================================================
// WEBHOOK SENDING
// ============================================================================

async function sendToWhatsAppWebhook(quoteData: QuoteData, pdfUrl: string): Promise<void> {
  // Define package inclusions based on tier
  const packageInclusionsArray = quoteData.tier === 'standard' 
    ? [
        'Service A (Minor Service)',
        'Service B (Major Service) + Brake Fluid'
      ]
    : [
        'Service A (Minor Service)',
        'Service B (Major Service) + Brake Fluid',
        'Service A (Minor Service) - Second',
        'Service B + Brake Fluid + Coolant + Spark Plug + Transmission Oil & Filter'
      ];
  
  // Format inclusions as a single string without bullet points
  const packageInclusionsFormatted = packageInclusionsArray.join(' | ');
  
  const webhookPayload = {
    customerName: quoteData.customerName,
    mobileNumber: `${quoteData.countryCode}${quoteData.mobileNumber}`,
    model: quoteData.model,
    variant: quoteData.variant,
    year: quoteData.year,
    tier: quoteData.tier.charAt(0).toUpperCase() + quoteData.tier.slice(1), // Title case: Premium/Standard
    price: quoteData.price.toLocaleString('en-US'), // Format with commas: 10,000
    duration: quoteData.duration,
    mileage: quoteData.tier === 'standard' ? '30,000 km' : '60,000 km',
    packageInclusions: packageInclusionsFormatted,
    pdfUrl: pdfUrl,
    timestamp: new Date().toISOString()
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Webhook failed: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// ============================================================================
// API ROUTE HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const quoteData: QuoteData = {
      customerName: body.customerName,
      countryCode: body.countryCode,
      mobileNumber: body.mobileNumber,
      model: body.model,
      variant: body.variant,
      year: body.year,
      tier: body.tier,
      price: body.price,
      duration: body.duration
    };
    // Validation
    if (!quoteData.customerName || !quoteData.mobileNumber) {
      return NextResponse.json(
        { error: 'Customer name and mobile number are required' },
        { status: 400 }
      );
    }

    if (!quoteData.model || !quoteData.variant || !quoteData.tier) {
      return NextResponse.json(
        { error: 'Model, variant, and tier are required' },
        { status: 400 }
      );
    }

    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDF generation service not configured' },
        { status: 500 }
      );
    }

    // Generate PDF
    let pdfUrl: string;
    try {
      pdfUrl = await generateServiceCarePdf(quoteData);
    } catch (pdfError) {
      throw new Error(`PDF generation failed: ${pdfError instanceof Error ? pdfError.message : 'Unknown error'}`);
    }

    // Send to webhook
    try {
      await sendToWhatsAppWebhook(quoteData, pdfUrl);
    } catch (webhookError) {
      throw new Error(`Webhook send failed: ${webhookError instanceof Error ? webhookError.message : 'Unknown error'}`);
    }
    return NextResponse.json({
      success: true,
      message: 'Quote sent successfully via WhatsApp',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to send quote',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

