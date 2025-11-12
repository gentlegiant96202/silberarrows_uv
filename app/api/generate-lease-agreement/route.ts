import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

// Helper: Build Lease Agreement HTML with creative first page
function buildLeaseAgreementHtml(
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
        <title>Lease Agreement - ${data.customer_name}</title>
        <style>
          @page { margin: 0; background: #000000; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { background: #000000; color: white; font-family: 'Arial', sans-serif; font-size: 10px; line-height: 1.4; width: 210mm; height: 297mm; margin: 0; padding: 0; box-sizing: border-box; }
          .page { background: rgba(255, 255, 255, 0.02); border: none; padding: 20px; width: 210mm; height: 297mm; position: relative; overflow: hidden; box-sizing: border-box; display: flex; flex-direction: column; }
          
          /* Header Styles */
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
          .logo { width: 50px; height: auto; }
          .company-info { text-align: right; }
          .company-info p { margin: 0; font-size: 8px; color: rgba(255, 255, 255, 0.7); }
          .title { font-size: 20px; font-weight: bold; color: white; margin-bottom: 3px; }
          
          /* Hero Section */
          .hero-section { background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%); border-radius: 12px; padding: 20px; margin-bottom: 18px; text-align: center; border: 1px solid rgba(255, 255, 255, 0.1); }
          .hero-title { font-size: 22px; font-weight: 900; color: white; margin-bottom: 8px; letter-spacing: 0.5px; }
          .hero-subtitle { font-size: 12px; color: rgba(255, 255, 255, 0.8); margin-bottom: 15px; }
          .vehicle-display { background: rgba(255, 255, 255, 0.05); border-radius: 8px; padding: 15px; margin: 15px 0; border: 1px solid rgba(255, 255, 255, 0.1); }
          .vehicle-name { font-size: 16px; font-weight: bold; color: white; margin-bottom: 4px; }
          .vehicle-details { font-size: 10px; color: rgba(255, 255, 255, 0.7); }
          
          /* Info Cards */
          .info-cards { display: flex; gap: 12px; margin-bottom: 18px; }
          .info-card { flex: 1; background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px; border: 1px solid rgba(255, 255, 255, 0.1); text-align: center; }
          .card-icon { font-size: 20px; margin-bottom: 8px; }
          .card-title { font-size: 10px; font-weight: bold; color: rgba(255, 255, 255, 0.8); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.3px; }
          .card-content { font-size: 9px; color: white; line-height: 1.2; }
          
          /* Highlights Section */
          .highlights-section { background: rgba(255, 255, 255, 0.03); border-radius: 10px; padding: 15px; margin-bottom: 18px; border: 1px solid rgba(255, 255, 255, 0.08); }
          .highlights-title { font-size: 12px; font-weight: bold; color: white; margin-bottom: 12px; text-align: center; }
          .highlights-list { display: flex; flex-direction: column; gap: 6px; }
          .highlight-item { display: flex; align-items: center; gap: 8px; font-size: 9px; color: rgba(255, 255, 255, 0.9); }
          .highlight-bullet { width: 4px; height: 4px; background: rgba(255, 255, 255, 0.6); border-radius: 50%; }
          
          /* Contract Details Section */
          .contract-details { background: rgba(255, 255, 255, 0.05); border-radius: 10px; padding: 15px; margin-bottom: 15px; border: 1px solid rgba(255, 255, 255, 0.1); }
          .section-title { font-size: 12px; font-weight: bold; color: white; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid rgba(255, 255, 255, 0.2); padding-bottom: 4px; }
          .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .detail-item { display: flex; flex-direction: column; gap: 2px; }
          .detail-label { font-size: 8px; color: rgba(255, 255, 255, 0.6); text-transform: uppercase; letter-spacing: 0.2px; }
          .detail-value { font-size: 9px; color: white; font-weight: 500; }
          
          /* Footer */
          .footer { text-align: center; margin-top: auto; padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.1); font-size: 8px; color: rgba(255, 255, 255, 0.6); }
          .page-continuation { background: rgba(255, 255, 255, 0.05); border-radius: 6px; padding: 10px; text-align: center; margin-top: 15px; border: 1px solid rgba(255, 255, 255, 0.1); }
          .continuation-text { font-size: 10px; color: rgba(255, 255, 255, 0.8); font-weight: 500; }
        </style>
    </head>
    <body>
        <div class="page">
            <!-- Header -->
            <div class="header">
                <div class="title">VEHICLE LEASE AGREEMENT</div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
            </div>

            <!-- Hero Section -->
            <div class="hero-section">
                <div class="hero-title">Your Premium Driving Experience Awaits</div>
                <div class="vehicle-display">
                    <div class="vehicle-name">${data.vehicle_make || 'Mercedes-Benz'} ${data.vehicle_model || 'Vehicle'}</div>
                    <div class="vehicle-details">${data.vehicle_model_year || '2024'} • Stock: ${data.vehicle_stock_number || 'N/A'}</div>
                </div>
            </div>

            <!-- Info Cards -->
            <div class="info-cards">
                <div class="info-card">
                    <div class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#silverGradient)" stroke-width="2">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <defs>
                            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#808080;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </div>
                    <div class="card-title">Customer</div>
                    <div class="card-content">
                        <strong>${data.customer_name || 'N/A'}</strong><br>
                        ${data.customer_email || 'N/A'}<br>
                        ${data.customer_phone || 'N/A'}
                    </div>
                </div>
                <div class="info-card">
                    <div class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#silverGradient2)" stroke-width="2">
                            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18.7 9.3c-.3-.8-1-1.3-1.9-1.3H7.2c-.9 0-1.6.5-1.9 1.3L3.5 11.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"></path>
                            <circle cx="7" cy="17" r="2"></circle>
                            <circle cx="17" cy="17" r="2"></circle>
                        </svg>
                        <defs>
                            <linearGradient id="silverGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#808080;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </div>
                    <div class="card-title">Vehicle</div>
                    <div class="card-content">
                        <strong>${data.vehicle_make || 'N/A'} ${data.vehicle_model || 'N/A'}</strong><br>
                        ${data.vehicle_model_year || 'N/A'} • ${data.vehicle_exterior_colour || 'N/A'}<br>
                        Interior: ${data.vehicle_interior_colour || 'N/A'}
                    </div>
                </div>
                <div class="info-card">
                    <div class="card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#silverGradient3)" stroke-width="2">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <defs>
                            <linearGradient id="silverGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" style="stop-color:#C0C0C0;stop-opacity:1" />
                                <stop offset="100%" style="stop-color:#808080;stop-opacity:1" />
                            </linearGradient>
                        </defs>
                    </div>
                    <div class="card-title">Terms</div>
                    <div class="card-content">
                        <strong>${data.lease_term_months || 'N/A'} Months</strong><br>
                        ${formatCurrency(data.monthly_payment || 0)}/month<br>
                        Start: ${formatDate(data.lease_start_date || '')}
                    </div>
                </div>
            </div>

            <!-- Agreement Highlights -->
            <div class="highlights-section">
                <div class="highlights-title">✨ Agreement Highlights</div>
                <div class="highlights-list">
                    <div class="highlight-item">
                        <div class="highlight-bullet"></div>
                        <span>Premium vehicle with comprehensive coverage</span>
                    </div>
                    <div class="highlight-item">
                        <div class="highlight-bullet"></div>
                        <span>Flexible lease terms and conditions</span>
                    </div>
                    <div class="highlight-item">
                        <div class="highlight-bullet"></div>
                        <span>Professional maintenance and support</span>
                    </div>
                    <div class="highlight-item">
                        <div class="highlight-bullet"></div>
                        <span>Transparent pricing with no hidden fees</span>
                    </div>
                </div>
            </div>

            <!-- Contract Details -->
            <div class="contract-details">
                <div class="section-title">Contract Summary</div>
                <div class="detail-grid">
                    <div class="detail-item">
                        <div class="detail-label">Monthly Payment</div>
                        <div class="detail-value">${formatCurrency(data.monthly_payment || 0)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Security Deposit</div>
                        <div class="detail-value">${formatCurrency(data.security_deposit || 0)}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Lease Term</div>
                        <div class="detail-value">${data.lease_term_months || 'N/A'} months</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Lease Start Date</div>
                        <div class="detail-value">${formatDate(data.lease_start_date || '')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Lease End Date</div>
                        <div class="detail-value">${formatDate(data.lease_end_date || '')}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Excess Mileage Rate</div>
                        <div class="detail-value">${formatCurrency(data.excess_mileage_charges || 0)}/km</div>
                    </div>
                    ${data.lease_to_own_option ? `
                    <div class="detail-item">
                        <div class="detail-label">Lease-to-Own Option</div>
                        <div class="detail-value">Yes</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Buyout Price</div>
                        <div class="detail-value">${formatCurrency(data.buyout_price || 0)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- Customer Address -->
            <div class="contract-details">
                <div class="section-title">Customer Address</div>
                <div class="detail-value">
                    ${data.address_line_1 || 'N/A'}${data.address_line_2 ? ', ' + data.address_line_2 : ''}<br>
                    ${data.city || 'N/A'}, ${data.emirate || 'N/A'}<br>
                    Emirates ID: ${data.emirates_id_number || 'N/A'}
                </div>
            </div>

            <!-- Additional Notes -->
            ${data.notes ? `
            <div class="contract-details">
                <div class="section-title">Additional Notes</div>
                <div class="detail-value">${data.notes}</div>
            </div>
            ` : ''}

            <!-- Page Continuation -->
            <div class="page-continuation">
                <div class="continuation-text">📋 Terms & Conditions Continue on Page 2...</div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Thank you for choosing SilberArrows for your premium vehicle leasing experience.
            </div>
        </div>
    </body>
    </html>`;
}

// Helper: Generate Lease Agreement PDF and return as Buffer
async function generateLeaseAgreementPdf(data: any): Promise<Buffer> {
  // Format dates to DD/MM/YYYY
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    if (!amount) return 'AED 0';
    return `AED ${amount.toLocaleString()}`;
  };

  // Resolve logo
  const logoFileCandidates = [
    path.join(process.cwd(), 'public', 'MAIN LOGO.png'),
    path.join(process.cwd(), 'public', 'main-logo.png'),
    path.join(process.cwd(), 'renderer', 'public', 'main-logo.png')
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

  // Build HTML using creative template
  const htmlContent = buildLeaseAgreementHtml(data, logoSrc, formatDate, formatCurrency);

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
  
  const pdfBuffer = await resp.arrayBuffer();
  return Buffer.from(pdfBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const contractData = await request.json();
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json({ error: 'PDFShift API key not configured' }, { status: 500 });
    }

    // Generate PDF
    const pdfBuffer = await generateLeaseAgreementPdf(contractData);
    // Upload to Supabase storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const sanitizedCustomerName = (contractData.customer_name || 'customer').replace(/[^a-zA-Z0-9-_]/g, '-');
    const fileName = `lease-agreement-${sanitizedCustomerName}-${timestamp}.pdf`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      throw new Error('Failed to upload PDF');
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('service-documents')
      .getPublicUrl(fileName);
    // Save PDF URL to database if customer_id is provided
    if (contractData.customer_id) {
      try {
        const { error: updateError } = await supabase
          .from('leasing_customers')
          .update({ 
            lease_agreement_pdf_url: publicUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', contractData.customer_id);

        if (updateError) {
          // Don't throw error here, just log it - PDF was generated successfully
        } else {
        }
      } catch (dbError) {
        // Don't throw error here, just log it - PDF was generated successfully
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lease agreement generated successfully',
      pdfUrl: publicUrl,
      fileName: fileName,
      pdfStats: {
        sizeBytes: pdfBuffer.length,
        sizeMB: (pdfBuffer.length / 1024 / 1024).toFixed(2)
      }
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate lease agreement' 
      },
      { status: 500 }
    );
  }
}
