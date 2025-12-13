import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import fs from 'fs';
import path from 'path';

// Helper: Build Lease Agreement HTML with beautiful first page summary
function buildLeaseAgreementHtml(
  data: any,
  logoSrc: string,
  formatDate: (dateString: string) => string,
  formatCurrency: (amount: number) => string
): string {
  const currentDate = formatDate(new Date().toISOString());
  const monthlyMileageLimit = data.monthly_mileage ? `${parseInt(data.monthly_mileage, 10).toLocaleString()} KM` : '2,000 KM';
  const excessMileageRate = data.excess_mileage_charges ? `AED ${parseFloat(data.excess_mileage_charges).toFixed(2)}` : 'AED 2.00';
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Lease Agreement - ${data.customer_name}</title>
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
            background: #000000;
            color: #ffffff;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          
          .page {
            background: #000000;
            width: 210mm;
            min-height: 297mm;
            /* Match page 2 left/right gutters */
            padding: 15mm 12mm 28mm;
            position: relative;
            page-break-after: always;
            box-sizing: border-box;
            overflow: visible;
          }
          
          /* Page 2: fixed A4 layout so terms fill the page and signatures never spill */
          .page.terms-page {
            height: 297mm;
            padding: 10mm 12mm 28mm;
          }
          
          .page:last-child {
            page-break-after: auto;
          }
          
          /* Header */
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          
          /* Header for Terms page (page 2) - same size as page 1 */
          .terms-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }

          .terms-header-left h1 {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1px;
            margin-bottom: 2px;
          }
          
          .terms-header-left .subtitle {
            font-size: 10px;
            color: rgba(255,255,255,0.7);
            font-weight: 500;
            letter-spacing: 0.3px;
          }

          .terms-logo {
            width: 65px;
            height: auto;
          }
          
          /* Signature Section */
          .signature-section {
            position: absolute;
            left: 12mm;
            right: 12mm;
            bottom: 14mm; /* sits above footer */
            margin: 0;
            display: flex;
            justify-content: space-between;
            gap: 12px;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          
          .signature-section.single-left {
            justify-content: flex-start;
          }
          
          .signature-box {
            width: 48%;
            background: rgba(200, 200, 200, 0.9);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(150, 150, 150, 0.8);
            border-radius: 8px;
            padding: 8px;
            color: black;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.3);
          }
          
          .signature-section.single-left .signature-box {
            width: 48%;
          }
          
          .signature-label {
            font-size: 7px;
            color: black;
            margin-bottom: 6px;
            font-weight: 600;
          }
          
          .signature-line {
            border-bottom: 1px solid rgba(0, 0, 0, 0.5);
            height: 18px;
            margin: 6px 0;
          }
          
          .signature-date {
            font-size: 6px;
            color: rgba(0, 0, 0, 0.7);
            margin-top: 8px;
          }
          
          .header-left h1 {
            font-size: 24px;
            font-weight: 800;
            color: #ffffff;
            letter-spacing: 1px;
            margin-bottom: 3px;
          }
          
          .header-left .subtitle {
            font-size: 10px;
            color: rgba(255,255,255,0.7);
            font-weight: 500;
            letter-spacing: 0.3px;
          }
          
          .logo {
            width: 65px;
            height: auto;
          }
          
          /* Hero Section */
          .hero-section {
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
            text-align: center;
          }
          
          .hero-title {
            font-size: 18px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 5px;
            letter-spacing: 0.3px;
          }
          
          .hero-subtitle {
            font-size: 11px;
            color: rgba(255,255,255,0.8);
            margin-bottom: 10px;
          }
          
          .vehicle-display {
            background: rgba(255,255,255,0.08);
            border-radius: 6px;
            padding: 12px;
            margin: 10px 0;
            border: 1px solid rgba(255,255,255,0.15);
          }
          
          .vehicle-name {
            font-size: 16px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
          }
          
          .vehicle-details {
            font-size: 10px;
            color: rgba(255,255,255,0.7);
          }
          
          /* Summary Grid */
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 18px;
          }
          
          .summary-card {
            background: rgba(255,255,255,0.06);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 8px;
            padding: 16px;
            min-height: 180px;
            display: flex;
            flex-direction: column;
            transition: all 0.3s ease;
          }

          .summary-card.full-width {
            grid-column: 1 / -1;
          }
          
          .summary-card h3 {
            font-size: 12px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
            padding-bottom: 8px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          
          .summary-card h3::before {
            content: "";
            width: 3px;
            height: 16px;
            background: linear-gradient(180deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%);
            border-radius: 2px;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding: 6px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          
          .summary-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
          }
          
          .summary-label {
            font-size: 10px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 0.4px;
            font-weight: 500;
          }
          
          .summary-value {
            font-size: 11px;
            color: #ffffff;
            font-weight: 600;
            text-align: right;
          }
          
          .summary-value.highlight {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
          }
          
          /* Financial Highlights */
          .financial-highlights {
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            border: 2px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 15px;
          }
          
          .financial-highlights h3 {
            font-size: 13px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 12px;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 0.8px;
          }
          
          .financial-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
          }
          
          .financial-grid.two-columns {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .financial-item {
            text-align: center;
            padding: 10px;
            background: rgba(255,255,255,0.05);
            border-radius: 6px;
            border: 1px solid rgba(255,255,255,0.1);
          }
          
          .financial-label {
            font-size: 8px;
            color: rgba(255,255,255,0.6);
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 6px;
          }
          
          .financial-value {
            font-size: 14px;
            font-weight: 800;
            color: #ffffff;
          }
          
          /* Footer */
          .footer {
            position: absolute;
            bottom: 6mm;
            left: 12mm;
            right: 12mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 6px;
            border-top: 1px solid rgba(255,255,255,0.15);
            font-size: 7px;
            color: rgba(255,255,255,0.5);
          }
          
          /* Terms Page - Two Column Layout */
          .two-column-terms {
            column-count: 2 !important;
            column-width: auto;
            column-gap: 8px;
            column-fill: balance;
            margin-top: 8px;
            overflow: visible;
            -webkit-column-count: 2 !important;
            -moz-column-count: 2 !important;
            columns: 2 !important;
            min-height: calc(297mm - 60mm);
          }
          
          /* Page 2: give columns a real height so they balance and stop above signatures */
          .page.terms-page .two-column-terms {
            margin-top: 0;
            column-gap: 10px;
            height: calc(100% - 22mm - 58mm); /* header + (signatures + footer reserve) */
            max-height: calc(100% - 22mm - 58mm);
            overflow: hidden; /* prevent text from rendering behind signatures */
          }
          
          /* Allow smaller elements to break, but keep clauses intact */
          .two-column-terms .clause,
          .two-column-terms .important-box,
          .two-column-terms .highlight-box {
            break-inside: avoid;
            page-break-inside: avoid;
            -webkit-column-break-inside: avoid;
          }
          
          .terms-intro {
            font-size: 6.5px;
            color: rgba(255,255,255,0.85);
            line-height: 1.22;
            margin-bottom: 3px;
            text-align: justify;
          }
          
          .important-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 5px;
            padding: 6px;
            margin-bottom: 4px;
          }
          
          .important-box h3 {
            font-size: 7.5px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 2px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .important-box ul {
            list-style: none;
            padding: 0;
          }
          
          .important-box li {
            font-size: 6.5px;
            color: rgba(255,255,255,0.85);
            margin-bottom: 1px;
            padding-left: 8px;
            position: relative;
            line-height: 1.22;
          }
          
          .important-box li::before {
            content: "•";
            position: absolute;
            left: 0;
            color: rgba(255,255,255,0.5);
          }
          
          .warning-text {
            font-size: 6.5px;
            color: rgba(255,255,255,0.8);
            line-height: 1.22;
            margin-bottom: 3px;
            text-align: justify;
          }
          
          .section-title {
            font-size: 7.5px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 3px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .clause {
            margin-bottom: 3px;
            break-inside: avoid;
          }

          /* Allow clause 10 to start in column 1 and flow to column 2 if needed */
          .clause.allow-split {
            break-inside: auto;
            page-break-inside: auto;
            -webkit-column-break-inside: auto;
          }
          
          .clause-number {
            font-weight: 700;
            color: #ffffff;
          }
          
          .clause-title {
            font-weight: 700;
            color: #ffffff;
          }
          
          .clause-text {
            font-size: 6.5px;
            color: rgba(255,255,255,0.85);
            line-height: 1.22;
            text-align: justify;
            margin-bottom: 1px;
          }
          
          .highlight-box {
            background: rgba(255,255,255,0.08);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 3px;
            padding: 3px;
            margin: 3px 0;
            font-size: 6.5px;
            color: #ffffff;
            font-weight: 600;
          }
        </style>
    </head>
    <body>
        <!-- PAGE 1: COMPREHENSIVE CONTRACT SUMMARY -->
        <div class="page">
            <div class="header">
                <div class="header-left">
                    <h1>LEASE AGREEMENT</h1>
                    <div class="subtitle">Vehicle Lease Contract Summary</div>
                </div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
            </div>

            <!-- Hero Section -->
            <div class="hero-section">
                <div class="vehicle-display">
                    <div class="vehicle-name">${(data.vehicle_make || 'Mercedes-Benz')} ${(data.vehicle_model || 'Vehicle')}</div>
                    <div class="vehicle-details">${data.vehicle_model_year || '—'} • Stock #${data.vehicle_stock_number || '—'} • Exterior: ${data.vehicle_exterior_colour || '—'} • Interior: ${data.vehicle_interior_colour || '—'}</div>
                </div>
            </div>

            <!-- Summary Grid -->
            <div class="summary-grid">
                <!-- Customer Information -->
                <div class="summary-card">
                    <h3>Customer Information</h3>
                    <div class="summary-row">
                        <span class="summary-label">Full Name</span>
                        <span class="summary-value">${data.customer_name || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Email Address</span>
                        <span class="summary-value">${data.customer_email || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Phone Number</span>
                        <span class="summary-value">${data.customer_phone || 'N/A'}</span>
                </div>
                    <div class="summary-row">
                        <span class="summary-label">Emirates ID</span>
                        <span class="summary-value">${data.emirates_id_number || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Address</span>
                        <span class="summary-value">${data.address_line_1 || ''}${data.city ? ', ' + data.city : ''}${data.emirate ? ', ' + data.emirate : ''}</span>
                    </div>
                </div>
                
                <!-- Vehicle Details -->
                <div class="summary-card">
                    <h3>Vehicle Details</h3>
                    <div class="summary-row">
                        <span class="summary-label">Make & Model</span>
                        <span class="summary-value">${data.vehicle_make || 'N/A'} ${data.vehicle_model || ''}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Model Year</span>
                        <span class="summary-value">${data.vehicle_model_year || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Stock Number</span>
                        <span class="summary-value">${data.vehicle_stock_number || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Exterior Color</span>
                        <span class="summary-value">${data.vehicle_exterior_colour || 'N/A'}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Interior Color</span>
                        <span class="summary-value">${data.vehicle_interior_colour || 'N/A'}</span>
                    </div>
                </div>
                
                <!-- Lease Terms -->
                <div class="summary-card full-width">
                    <h3>Lease Terms</h3>
                    <div class="summary-row">
                        <span class="summary-label">Lease Duration</span>
                        <span class="summary-value highlight">${data.lease_term_months || 'N/A'} Months</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Start Date</span>
                        <span class="summary-value">${formatDate(data.lease_start_date || '')}</span>
            </div>
                    <div class="summary-row">
                        <span class="summary-label">End Date</span>
                        <span class="summary-value">${formatDate(data.lease_end_date || '')}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Monthly KM Limit</span>
                        <span class="summary-value">${monthlyMileageLimit}</span>
                    </div>
                    <div class="summary-row">
                        <span class="summary-label">Excess Mileage Rate</span>
                        <span class="summary-value">${excessMileageRate} / KM</span>
                    </div>
                </div>
            </div>

            <!-- Financial Highlights -->
            <div class="financial-highlights">
                <h3>Financial Summary</h3>
                <div class="financial-grid ${data.lease_to_own_option && data.buyout_price ? '' : 'two-columns'}">
                    <div class="financial-item">
                        <div class="financial-label">Monthly Payment</div>
                        <div class="financial-value">${formatCurrency(data.monthly_payment || 0)}</div>
                    </div>
                    <div class="financial-item">
                        <div class="financial-label">Security Deposit (Refundable)</div>
                        <div class="financial-value">${formatCurrency(data.security_deposit || 0)}</div>
                    </div>
                    ${data.lease_to_own_option && data.buyout_price ? `
                    <div class="financial-item">
                        <div class="financial-label">Lease-to-Own Buyout</div>
                        <div class="financial-value">${formatCurrency(data.buyout_price || 0)}</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${data.notes ? `
            <div class="summary-card" style="margin-bottom: 12px;">
                <h3>Additional Notes</h3>
                <p style="font-size: 9px; color: rgba(255,255,255,0.9); line-height: 1.4; margin-top: 8px;">${data.notes}</p>
            </div>
            ` : ''}

            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-label">LESSOR</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">Silber Arrows 1934 Auto Leasing LLC</div>
                    <div class="signature-date" style="margin-top: 8px;">Authorized Signatory</div>
                </div>
                <div class="signature-box">
                    <div class="signature-label">LESSEE</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">${data.customer_name || '_________________'}</div>
                    <div class="signature-date" style="margin-top: 8px;">Signature</div>
                </div>
            </div>

            <div class="footer">
                <div>Silber Arrows 1934 Auto Leasing LLC | Phone: +971 (0)4 380 5515</div>
                <div>Monthly | Version 1.5 | 07/25 | Page 1</div>
            </div>
        </div>
        
        <!-- PAGE 2: TERMS AND CONDITIONS -->
        <div class="page terms-page">
            <div class="terms-header">
                <div class="terms-header-left">
                    <h1>LEASE AGREEMENT</h1>
                    <div class="subtitle">Terms and Conditions of Lease</div>
                </div>
                <img src="${logoSrc}" alt="SilberArrows Logo" class="terms-logo">
            </div>
            <div class="two-column-terms">
                <p class="terms-intro">You are responsible for reading the herein terms and conditions of this Lease Agreement and if you are not sure of the meaning of any such terms and conditions telephone us at Silber Arrows 1934 Auto Leasing LLC on +971 (0)4 380 5515 for an explanation.</p>
                
                <p class="terms-intro">The Terms and Conditions of this Lease Agreement will apply to the lease of the vehicle by you from we/us at Silber Arrows 1934 Auto Leasing LLC.</p>
                
                <p class="terms-intro">Lease Agreement (hereinafter referred to as "Agreement") means the legally binding agreement for the lease of the vehicle between you as "Lessee" and us as "Lessor", collectively referred to as the "Parties" to the Agreement.</p>
                
                <div class="important-box">
                    <h3>IMPORTANT:</h3>
                    <ul>
                        <li>Your signature hereunder signifies that you have been provided a copy of this Agreement, you have read and understand the herein Agreement, and further, that you agree to be bound by the terms and conditions stated herein.</li>
                        <li>You are entitled to a fully executed copy of this Agreement.</li>
                    </ul>
                </div>
                
                <p class="warning-text">Failure to renew this Agreement or return the vehicle on the due date will result in the automatic renewal of the lease without prejudice to us reporting the vehicle as stolen. If so, you may be convicted of a felony, be fined and/or imprisoned. You are responsible for all costs incurred by reason(s) of your default.</p>
                
                <h3 class="section-title">YOU HEREBY AGREE AS FOLLOWS:</h3>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">1. VEHICLE AND LEASE DETAILS.</span> By signing hereunder, you confirm the receipt of the expected vehicle, the good condition of the vehicle, and the lease details stated in the Invoice and Vehicle Inspection Report.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">2. PAYMENTS.</span> You agree to make all payments via a credit card payment link that we will send to you on the due date. The payment link will remain valid for seventy-two (72) hours. Failure to complete the payment within this period will result in a late payment fee of 5% on the outstanding amount.</p>
                    <p class="clause-text">The late payment fee will be automatically added to the following month's payment or deducted from the security deposit, at our discretion.</p>
                    <p class="clause-text">Maximum monthly kilometre allowances is ${monthlyMileageLimit}.</p>
                    <p class="clause-text">Excess kilometres will be charged at ${excessMileageRate} / KM.</p>
                    <p class="clause-text">Salik/toll charges and traffic fines and other penalties will be charged at actuals plus a 25% handling fee, billed monthly.</p>
                    <p class="clause-text">A refundable security deposit equivalent to one month's rent is required prior to the release of the vehicle. This deposit ensures the protection of the vehicle under the terms of the lease and will be returned at the end of the lease period, subject to the terms and conditions outlined in the Agreement.</p>
                    <p class="clause-text">The security deposit shall not be applied to any payment due during the lease period and will be maintained by us in an interest-bearing account. The security deposit shall be refunded within twenty-eight (28) days from the termination of the Agreement, without cause and/or fault of the Lessee, less any amounts due to us.</p>
                    <p class="clause-text">Black Points: In the event that any traffic violation associated with the leased vehicle results in the issuance of Black Points, the Lessee shall be fully responsible for accepting such Black Points onto their driving licence. The Lessee must do so within forty-eight (48) hours of being notified by us. Failure to comply will result in a penalty of AED 3,000, which will be invoiced to the Lessee and payable immediately.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">3. INSURANCE.</span> You must inform us immediately in the event of an accident and obtain a police report and repair slip acceptable to the insurance company to process the insurance claim, and to bear the insurance excess of AED 2,500.00 out of the total indemnity. The insurance excess is payable in all cases where the accident is due to the fault of the driver or where the third party is not identified, such as in the event of a hit and run. If for any reason the insurance claim cannot be processed, you shall be solely responsible for all costs of repair to the vehicle, third party damages including but not limited to the loss of use. You must not remove the vehicle from the place of accident unless cleared by the police. You are responsible for the cost of transporting the vehicle to the workshop or impounding area.</p>
                </div>
                
                <div class="highlight-box">
                    PHYSICAL DAMAGE OR LIABILITY INSURANCE COVERAGE FOR BODILY INJURY OR PROPERTY DAMAGE CAUSED BY OTHERS IS NOT INCLUDED IN THIS AGREEMENT.
                </div>
                
                <p class="clause-text">We are not responsible for any physical damages or liability insurance coverage for bodily injury or property damage caused by others. We maintain the right to seek additional compensation from the Lessee, as well as any third parties, to cover any operational losses as a result of damages to the leased vehicle.</p>
                
                <p class="clause-text">Note that our maximum liability in respect to any one claim or series of claims related to one accident is AED 2,000,000.00.</p>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">4. DAMAGE, DESTRUCTION, OR LOSS OF VEHICLE.</span> You assume the entire risk of loss or damage to the vehicle from any cause whatsoever and your financial obligations to us shall not be affected in any manner regardless of any damage, loss, or destruction to the leased vehicle. If, during the term of this Agreement and until the return of the vehicle, it is damaged, destroyed, stolen, abandoned, or taken by any judicial or governmental authority, you will remain financially responsible for the replacement cost of the same. To the extent any of the foregoing occurrences take place, you shall notify us of the same within twenty-four (24) hours of any such event. In addition to seeking and being entitled to compensation for actual damages to the leased vehicle, we reserve the right to charge a liquidated damages penalty of AED 25,000.00 for damages that are deemed, in our sole discretion, to be intentional or resulting from negligence, violation of traffic regulations or driving while under the influence of alcohol or any other controlled dangerous substances.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">5. NO ABATEMENT OR SETOFF.</span> You agree and acknowledge that the sums payable to us shall not be subject to any abatement whatsoever, nor subject to any defence, set-off, counter-claim, or recoupment by reason of any damage to or loss or destruction of the vehicle.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">6. ALL FEES AND FIXED RENTAL PAID UNDER THIS AGREEMENT ARE NON-REFUNDABLE UNLESS OTHERWISE STATED BY US IN WRITING. UNLESS OTHERWISE STATED, ALL PRICES ARE EXCLUSIVE OF VAT.</span></p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">7. NO AGENT OR EMPLOYEE OF THE COMPANY SHALL HAVE THE POWER TO WAIVE ANY OF THE TERMS OR PROVISIONS HEREOF,</span> or to incur additional obligations on our behalf unless such waiver or additional obligations are evidenced by an express agreement in writing signed by authorised officers or agents of both Parties.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">8. USE OF VEHICLE.</span> You agree to use the vehicle for lawful purposes only, and to follow all applicable driving and safety regulations. The vehicle shall not leave the United Arab Emirates without our express written permission. The vehicle is for road use only. You agree to defend, indemnify and/or hold us harmless from any fines, penalties and/or related suits or actions naming us as a third party, that in any way stem from your violation of any laws and/or the illegal and/or prohibited use of the vehicle as set forth herein.</p>
                    <p class="clause-text">You hereby agree to use the vehicle with reasonable care and shall refrain entirely from using the vehicle for any activities other than routine driving from point A to point B, including, without limitation, towing objects, car racing, off-roading, desert safaris, submerging or flooding the vehicle in water.</p>
                    <p class="clause-text">You recognize, understand, and acknowledge your obligation/responsibility to ensure that the vehicle is always parked in a legal, safe, and secure location with the doors locked while the vehicle is unattended.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">9. ASSIGNMENT/SUBLEASING.</span> You agree that you shall not assign, transfer, sublet, or in any way rent or lease your rights hereunder to any third-party, and will not cause any lien to the vehicle. You are expressly prohibited from using the vehicle to carry passengers for hire, such as a taxi or carpool service i.e., Uber, Lift, etc.</p>
                </div>
                
                <div class="clause allow-split">
                    <p class="clause-text"><span class="clause-number">10. MAINTENANCE & REPAIRS.</span> In the event any system and/or maintenance warnings appear in your vehicle, you are obligated to notify us by the next business day so we may take immediate corrective action. Continued operation of the vehicle following such warning(s) shall subject you to sole liability for any damage(s) resulting, including all related repair expenses.</p>
                    <p class="clause-text">You shall take your vehicle to a Silber Arrows dealership for service and inspection every twelve (12) months or fifteen thousand (15,000) kilometres, whichever occurs first (this routine service is included at no additional cost as a term of this Agreement and shall be booked upon receipt of the service/inspection warning in your vehicle).</p>
                    <p class="clause-text">Replacement vehicles will be made available to you, subject to availability of the same, when such appointments are made in advance.</p>
                    <p class="clause-text">Routine wear and tear, related to consumable parts, are not covered under this Agreement, and must be fixed/replaced, at your cost, at a Silber Arrows dealership. If the vehicle is serviced by a non-authorised technician, you shall be liable for damages and replacement costs of "non-genuine parts" installed in the vehicle, as well as any damages resulting from same.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">11. INDEMNITY.</span> We shall not be liable, under any circumstances, for any damages or injuries to persons (yourself or third-party) or property suffered or sustained in the use, condition, or operation of the vehicle and all such claims are specifically waived by you. Moreover, to the extent any third party makes such a claim against us, you hereby agree to defend, indemnify and/or hold us harmless for the same.</p>
                </div>
                
                <p class="clause-text">We make no warranties, express or implied, as to the condition of the vehicle or its fitness for any particular purpose. You agree to and do hereby hold us, our agents, and employees, free and harmless from any and all losses, costs, demands or liability of any kind whatsoever, including legal costs and attorneys' fees.</p>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">12. UNDERTAKING.</span> You hereby acknowledge as your sole responsibility and agree to do the following:</p>
                    <p class="clause-text">• Ensure proper oil and water levels, tyre air pressure.</p>
                    <p class="clause-text">• Refrain from allowing unauthorised drivers of the vehicle without our express prior written permission, including them being registered to operate the vehicle. You and any additional drivers sought to be approved by you, and ultimately approved, shall be solely liable for all obligations under the terms set forth in this Agreement.</p>
                    <p class="clause-text">• Refrain from performing repairs and/or modifications to the vehicle without our prior written consent.</p>
                    <p class="clause-text">• Compensate us, in addition to actual loss, up to 20% of the purchase price of the vehicle if you cause destruction or loss of the vehicle.</p>
                    <p class="clause-text">• Obtain a police report in case of an accident. Otherwise, you will be held accountable for all damage and repair costs.</p>
                    <p class="clause-text">• Pay the lease rate while vehicle is under repair for damages caused by you.</p>
                    <p class="clause-text">• Refrain from smoking inside the vehicle.</p>
                    <p class="clause-text">• Maintain the condition of the vehicle in a similar state as to that which the vehicle was received in, with the exception of normal wear and tear.</p>
                    <p class="clause-text">• Pay a cleaning fee of AED 900.00 if vehicle is returned unreasonably dirty or with a foul odour.</p>
                    <p class="clause-text">• Pay for replacement of loss/damaged key(s).</p>
                    <p class="clause-text">• Pay for all the impounding charges, damages and loss of any lease charges/income in the event of the vehicle being impounded by authorities; and</p>
                    <p class="clause-text">• Return the vehicle with a full tank of fuel or otherwise pay a refuelling surcharge of AED 200.00. We are not responsible for any refund for unused fuel.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">13. PRETERMINATION.</span> Early termination of the lease is considered a violation of the terms of the Agreement. The following surcharges will apply, which are calculated based on the lease duration:</p>
                    <p class="clause-text">• monthly contract - no refund will be issued</p>
                    <p class="clause-text">• 6-month contract - a surcharge equivalent to one month's rent</p>
                    <p class="clause-text">• 12-month contract - a surcharge equivalent to one month's rent</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">14. TERMINATION OR DEFAULT.</span> In the event you terminate this Agreement for any reason, we shall have the right to take immediate possession of the vehicle. Other than the normal wear and tear, you undertake to pay for the cost of repair of all technical and body damages in the vehicle that are not included in the scope of the normal depreciation as a result of the normal utilisation of the vehicle.</p>
                    <p class="clause-text">You understand and acknowledge that any default in payment, or violation of the terms and conditions of this Agreement, constitutes a breach of Agreement on your behalf. In the event of such a breach, we reserve the right to take possession of the vehicle immediately, without further notice to you. We reserve the right to recover the vehicle from your possession at any location where the vehicle may be found. You hereby agree to cooperate fully with us throughout the repossession process.</p>
                    <p class="clause-text">You shall be responsible for all costs and expenses associated with the recovery of the vehicle, including but not limited to towing, legal fees, key replacement, and any damages incurred during repossession. We shall not be responsible for any personal belongings left in the vehicle.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">15. ATTORNEY'S FEES/LEGAL COSTS.</span> In the event of any breach of the herein Agreement, we shall be entitled to recover from you, in addition to all other damages, all costs and expenses, including court costs and reasonable attorney's fees to enforce our rights under this Agreement.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">16. TITLE.</span> We hold the title of the vehicle for the duration of this Agreement and the title is not transferable to you, or any third party, under any circumstances. Any attempt on your behalf to transfer the title is expressly prohibited and shall be considered a criminal act, in addition to a violation of the herein Agreement.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">17. SEVERABILITY, WAIVER, ENTIRE AGREEMENT.</span> Any provisions of this Agreement which shall prove to be invalid, void, or illegal will in no way affect, impair, or invalidate any other provision hereof and such remaining provisions shall remain in full force and effect. The Parties hereto have read this entire Agreement and do hereby acknowledge that they are familiar with all of the terms and conditions set forth herein and that there are no other representations, warranties, or agreements concerning this Agreement which do not appear in writing herein. There shall be no alterations, change, or modification of any of the terms and conditions of this Agreement except in writing and signed by all Parties hereto (or by authorised officers or agents of the Parties).</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">18. DATA PROTECTION AND PRIVACY.</span> You agree that as a result of the nature of this Agreement, we will collect and process related information about you, the drivers, and the vehicle. We will retain the collected data for the duration of the lease period and for a reasonable period, thereafter, as required by applicable laws. We shall take appropriate technical and organisational measures to ensure the security and confidentiality of the collected data. We may share the collected data with relevant authorities and third parties when required by law or to protect our legitimate interest, such as in the case of vehicle theft or misuse.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">19. LOSS AND/OR DAMAGE.</span> To the fullest extent permitted by applicable law, you are liable: (a) for the loss of, and all damage to, the vehicle; and, (b) for all damage to the property of any person; (i) which is caused or contributed to by you; or (ii) which arises from the use of the vehicle by you.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">20. GOVERNING LAW AND JURISDICTION.</span> This Agreement is governed and construed under the laws of United Arab Emirates. Any dispute shall be submitted to the exclusive jurisdiction of the courts of Abu Dhabi.</p>
                </div>
                
                <div class="clause">
                    <p class="clause-text"><span class="clause-number">21. PRESUMPTIONS AND INTERPRETATION.</span> Unless the context otherwise requires:</p>
                    <p class="clause-text">(a) A word which denotes the singular denotes the plural and vice versa.</p>
                    <p class="clause-text">(b) Any gender denotes the other genders; and</p>
                    <p class="clause-text">(c) A person includes an individual, a body corporate and a government body.</p>
                    <p class="clause-text">Unless the context otherwise requires, a reference to:</p>
                    <p class="clause-text">(a) Any legislation includes any regulation or instrument made under it and where amended, re-enacted, or replaced means that amended, re-enacted, or replaced legislation; and</p>
                    <p class="clause-text">(b) Any other agreement or instrument, which amends or replaces the herein Agreement, and is in writing and duly executed, means that agreement or instrument as amended or replaced controls.</p>
                </div>
            </div>
            
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-label">LESSOR</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">Silber Arrows 1934 Auto Leasing LLC</div>
                    <div class="signature-date" style="margin-top: 8px;">Authorized Signatory</div>
                </div>
                <div class="signature-box">
                    <div class="signature-label">LESSEE</div>
                    <div class="signature-line"></div>
                    <div class="signature-date">${data.customer_name || '_________________'}</div>
                    <div class="signature-date" style="margin-top: 8px;">Signature</div>
                </div>
            </div>

            <div class="footer">
                <div>Silber Arrows 1934 Auto Leasing LLC | Phone: +971 (0)4 380 5515</div>
                <div>Monthly | Version 1.5 | 07/25 | Page 2</div>
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

  // Build HTML using template
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
