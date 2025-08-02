import { NextRequest, NextResponse } from 'next/server';

// 1. Add a helper for comma formatting
function formatPrice(num: number | string | null | undefined) {
  if (num === null || num === undefined || num === '') return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 2. Get today's date in dd/mm/yyyy
const today = new Date();
const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Generating consignment agreement PDF...');

    const { car } = await request.json();

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vehicle Consignment Agreement</title>
        <style>
          @page {
            margin: 0;
            size: A4;
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
            font-size: 11px;
            line-height: 1.4;
            width: 210mm;
            height: 297mm;
            margin: 0;
            padding: 0;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          .page {
            background: rgba(255, 255, 255, 0.02);
            backdrop-filter: blur(30px);
            border: none;
            padding: 20px;
            width: 210mm;
            height: 297mm;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 
                        inset 0 -1px 0 rgba(255, 255, 255, 0.05),
                        0 0 50px rgba(255, 255, 255, 0.02);
            position: relative;
            overflow: hidden;
            box-sizing: border-box;
          }
          
          .page::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, 
              rgba(255, 255, 255, 0.03) 0%, 
              rgba(255, 255, 255, 0.01) 50%, 
              rgba(255, 255, 255, 0.03) 100%);
            pointer-events: none;
          }
          
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin: 0 0 12px 0;
            padding: 18px 25px 15px 25px;
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 15px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.05),
                        0 8px 32px rgba(0, 0, 0, 0.3),
                        0 0 0 1px rgba(255, 255, 255, 0.05);
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
            font-size: 18px;
            font-weight: bold;
            color: white;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
            margin-bottom: 8px;
            letter-spacing: 0.5px;
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
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) brightness(1.1);
            position: relative;
            z-index: 3;
          }

          .content-container {
            position: relative;
            z-index: 1;
            width: 100%;
            height: calc(297mm - 140px);
            overflow: visible;
            box-sizing: border-box;
          }

          .section {
            margin: 0 0 4px 0;
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(20px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 12px;
            padding: 8px 10px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08),
                        inset 0 -1px 0 rgba(255, 255, 255, 0.02),
                        0 4px 16px rgba(0, 0, 0, 0.2);
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
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
            text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
            position: relative;
            z-index: 2;
            padding-bottom: 4px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
          }

          .subsection-title {
            font-size: 10px;
            font-weight: bold;
            margin: 8px 0 5px 0;
            color: rgba(255, 255, 255, 0.95);
            position: relative;
            z-index: 2;
          }

          .form-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 0 0 4px 0;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(15px);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
            position: relative;
            z-index: 2;
            box-sizing: border-box;
          }

          .form-table td {
            border: 1px solid rgba(255, 255, 255, 0.15);
            padding: 5px 8px;
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
            backdrop-filter: blur(10px);
            font-weight: bold;
            width: 14%;
            color: rgba(255, 255, 255, 0.95);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
          }

          .form-table .data {
            width: 19.33%;
          }

          .form-table .data-large {
            width: 24%;
          }

          .checkbox-line {
            display: flex;
            align-items: center;
            margin: 6px 0;
            color: white;
            font-size: 11px;
            position: relative;
            z-index: 2;
          }

          .checkbox {
            width: 9px;
            height: 9px;
            border: 1px solid rgba(255, 255, 255, 0.7);
            background: rgba(255, 255, 255, 0.08);
            backdrop-filter: blur(5px);
            margin: 0 3px;
            display: inline-block;
            border-radius: 2px;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }

          .underline {
            border-bottom: 1px solid rgba(255, 255, 255, 0.7);
            margin: 0 6px;
            min-width: 60px;
            display: inline-block;
            color: white;
          }

          .input-field {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 4px 8px;
            margin: 0 4px;
            color: white;
            font-size: 10px;
            min-width: 60px;
            display: inline-block;
            backdrop-filter: blur(10px);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }

          .input-field-medium {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 4px 8px;
            margin: 0 4px;
            color: white;
            font-size: 10px;
            width: 100px;
            display: inline-block;
            backdrop-filter: blur(10px);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }

          .input-field-large {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            padding: 4px 8px;
            margin: 0 4px;
            color: white;
            font-size: 10px;
            width: 120px;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(10px);
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
            height: 28px;
            line-height: 28px;
            vertical-align: middle;
            text-align: center;
          }

          .fee-structure {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 12px;
            margin: 8px 0;
            backdrop-filter: blur(15px);
          }

          .fee-option {
            margin: 6px 0;
            padding: 6px 0;
            display: flex;
            align-items: center;
          }

          .checkbox-option {
            margin-right: 8px;
          }

          .long-underline {
            border-bottom: 1px solid rgba(255, 255, 255, 0.7);
            width: 180px;
            display: inline-block;
            margin: 3px 0;
            color: white;
          }

          .page-break {
            page-break-before: always;
          }

          .text-content {
            line-height: 1.2;
            margin-bottom: 4px;
            color: white;
            font-size: 10px;
            position: relative;
            z-index: 2;
          }

          .numbered-list {
            margin-left: 12px;
            color: white;
            position: relative;
            z-index: 2;
          }

          .numbered-list li {
            margin-bottom: 14px;
            line-height: 1.55;
            color: white;
            font-size: 10px;
          }

          .bullet-list {
            margin-left: 16px;
            color: white;
            position: relative;
            z-index: 2;
          }

          .bullet-list li {
            margin-bottom: 5px;
            color: white;
            font-size: 11px;
          }

          .signature-section {
            margin-top: 15px;
            display: flex;
            justify-content: space-between;
            gap: 15px;
            position: relative;
            z-index: 2;
            width: 100%;
            box-sizing: border-box;
          }

          .signature-box {
            width: 48%;
            background: rgba(255, 255, 255, 0.06);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 8px;
            padding: 12px;
            color: white;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }

          .footer {
            margin: 15px 0 0 0;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.25);
            padding: 12px 8px;
            color: rgba(255, 255, 255, 0.9);
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border-radius: 6px;
            position: relative;
            z-index: 2;
            width: 100%;
            box-sizing: border-box;
            line-height: 1.4;
            letter-spacing: 0.5px;
          }

          strong {
            color: white;
            font-weight: bold;
          }

          .compact-section {
            margin: 0 0 2px 0;
            width: 100%;
            box-sizing: border-box;
          }

          .vehicle-history {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.12);
            border-radius: 10px;
            padding: 8px;
            margin: 0 0 4px 0;
            box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
            position: relative;
            z-index: 2;
            width: 100%;
            box-sizing: border-box;
          }

          .premium-divider {
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, 
              rgba(255, 255, 255, 0) 0%, 
              rgba(255, 255, 255, 0.3) 50%, 
              rgba(255, 255, 255, 0) 100%);
            margin: 8px 0;
          }
        </style>
      </head>
      <body>
        <!-- PAGE 1 -->
        <div class="page">
          <div class="header">
            <div class="title-section">
              <div class="title">VEHICLE CONSIGNMENT AGREEMENT</div>
              <div class="date-line">Date: ${todayStr}</div>
            </div>
            <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="logo">
          </div>

          <div class="content-container">
            <!-- OWNER INFORMATION -->
            <div class="section compact-section">
              <div class="section-title">OWNER INFORMATION</div>
              <table class="form-table">
                <tr>
                  <td class="label">Full Name:</td>
                  <td class="data">${car.customer_name || ''}</td>
                  <td class="label">Contact No.:</td>
                  <td class="data">${car.customer_phone || ''}</td>
                  <td class="label">Email Address:</td>
                  <td class="data-large">${car.customer_email || ''}</td>
                </tr>
              </table>
            </div>

            <!-- VEHICLE DETAILS -->
            <div class="section compact-section">
              <div class="section-title">VEHICLE DETAILS</div>
              <table class="form-table">
                <tr>
                  <td class="label">Year, Make & Model:</td>
                  <td class="data">${car.model_year || ''} ${car.vehicle_model || ''}</td>
                  <td class="label">Odometer Reading:</td>
                  <td class="data">${car.current_mileage_km ? car.current_mileage_km + ' km' : ''}</td>
                  <td class="label">Chassis No.:</td>
                  <td class="data-large">${car.chassis_number || ''}</td>
                </tr>
              </table>
            </div>

            <!-- VEHICLE HISTORY -->
            <div class="vehicle-history">
              <div class="text-content">
                <strong>To your knowledge as the Owner, has the vehicle:</strong>
              </div>
              <table style="width: 100%; margin-top: 6px; border-collapse: collapse;">
                <tr>
                  <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Ever been involved in an accident or collision?</td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">Yes <span class="checkbox"></span></td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">No <span class="checkbox"></span></td>
                </tr>
                <tr>
                  <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Sustained damage or been affected by flooding/water exposure?</td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">Yes <span class="checkbox"></span></td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">No <span class="checkbox"></span></td>
                </tr>
              </table>
              <div class="text-content" style="margin-top: 12px;">
                <strong>If you answered "Yes" to any of the above, please provide details:</strong>
              </div>
              <div style="margin-top: 6px; padding: 8px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 6px; min-height: 40px;">
                <div style="color: rgba(255, 255, 255, 0.5); font-size: 9px; font-style: italic;">Details:</div>
              </div>
            </div>

            <!-- MAIN AGREEMENT -->
            <div class="section">
              <div class="section-title">MAIN AGREEMENT</div>
              
              <div class="text-content">
                <strong>Consignment Period:</strong> The Owner agrees to consign the vehicle to Silber Arrows 1934 Used Car Trading LLC, also referred to as SilberArrows, for a 90-day period starting from the date of signing this agreement. If the vehicle remains unsold at the end of the consignment period, the Owner may collect the vehicle without any additional fees.
              </div>

              <div class="text-content">
                <strong>Selling Fee:</strong> SilberArrows' fee for selling the vehicle is based on one of the following structures, to be agreed upon and documented at the time of signing:
              </div>
              <table style="width: 100%; margin: 10px 0 0 0; border-collapse: separate; border-spacing: 0 8px;">
                <tr>
                  <td style="width: 5%; text-align: center;"><span class="checkbox checkbox-option"></span></td>
                  <td style="width: 45%;">A percentage of the final selling price:</td>
                  <td style="width: 30%;"><span class="input-field-large" style="text-align: center;"></span></td>
                  <td style="width: 10%"></td>
                </tr>
                <tr>
                  <td style="text-align: center;"><span class="checkbox checkbox-option"></span></td>
                  <td>A fixed fee: AED</td>
                  <td><span class="input-field-large" style="text-align: center;"></span></td>
                  <td></td>
                </tr>
                <tr>
                  <td style="text-align: center;"><span class="checkbox checkbox-option"></span></td>
                  <td>A guaranteed return amount to the Owner: AED</td>
                  <td><span class="input-field-large" style="text-align: center;">${formatPrice(car.cost_price_aed)}</span></td>
                  <td></td>
                </tr>
                <tr>
                  <td></td>
                  <td style="font-weight: bold;">The agreed selling price of the vehicle: AED</td>
                  <td><span class="input-field-large" style="text-align: center;">${formatPrice(car.advertised_price_aed)}</span></td>
                  <td></td>
                </tr>
              </table>
              <div class="text-content">
                This fee will be deducted from the final sale price upon successful completion of the sale.
              </div>

              <div class="text-content">
                <strong>Fees Payable for Early Termination:</strong> If the Owner requests to terminate the agreement before the end of the 90-calendar day consignment period, the following fees become payable to SilberArrows prior to the release of the vehicle:
                <ol class="numbered-list">
                  <li>Technical Inspection Fee: AED 1,050.00</li>
                  <li>Professional Detailing Fee: AED 1,000.00</li>
                  <li>Marketing & Advertising Fee: AED 950.00</li>
                </ol>
              </div>

              <div class="text-content">
                <strong>Insurance and Registration Details:</strong> The Owner must ensure that the vehicle remains fully registered and insured during the consignment period.
              </div>
              
              <div style="display: flex; gap: 20px; margin: 8px 0; align-items: center; flex-wrap: wrap;">
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 8px;"><strong>Registration Expiry Date:</strong></span>
                  <span class="input-field-large" style="text-align: center;">${car.registration_expiry_date ?? ''}</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="margin-right: 8px;"><strong>Insurance Expiry Date:</strong></span>
                  <span class="input-field-large" style="text-align: center;">${car.insurance_expiry_date ?? ''}</span>
                </div>
              </div>

              <div class="text-content">
                <strong>Condition of Vehicle:</strong> Before the vehicle is listed for sale, it must be free of any major mechanical issues that could affect its safety or performance. SilberArrows will initially inspect the vehicle using a Pre-UVC (Pre-Used Vehicle Check) form, which forms part of this Consignment Agreement. Once the vehicle has been handed over, SilberArrows will conduct a UVC (Used Vehicle Check) to perform a thorough inspection.
              </div>

              <div class="text-content">
                <strong>Handover Checklist:</strong> Upon vehicle handover, the following items will be confirmed and documented:
                <table style="width: 100%; margin-top: 6px; border-collapse: collapse;">
                  <tr>
                    <td></td>
                    <td style="width: 15%; text-align: center; color: white; font-size: 10px; font-weight: bold;">Yes</td>
                    <td style="width: 15%; text-align: center; color: white; font-size: 10px; font-weight: bold;">No</td>
                  </tr>
                  <tr>
                    <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Service records</td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.service_records_acquired ? '■' : '□'}</span></td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.service_records_acquired === false ? '■' : '□'}</span></td>
                  </tr>
                  <tr>
                    <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Owner's manual</td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.owners_manual_acquired ? '■' : '□'}</span></td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.owners_manual_acquired === false ? '■' : '□'}</span></td>
                  </tr>
                  <tr>
                    <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Spare tyre and tools</td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.spare_tyre_tools_acquired ? '■' : '□'}</span></td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.spare_tyre_tools_acquired === false ? '■' : '□'}</span></td>
                  </tr>
                  <tr>
                    <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Fire extinguisher</td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.fire_extinguisher_acquired ? '■' : '□'}</span></td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;">${car.fire_extinguisher_acquired === false ? '■' : '□'}</span></td>
                  </tr>
                  <tr>
                    <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">• Other accessories: ___________</td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;"></span></td>
                    <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;"><span style="display: inline-block; width: 18px; text-align: center;"></span></td>
                  </tr>
                </table>
              </div>

              <div class="text-content">
                <strong>Marketing and Sales Efforts:</strong> SilberArrows agrees to: (1) Conduct a professional photo and video shoot of the vehicle. (2) List the vehicle on SilberArrows' website and other appropriate platforms within 5 business days of agreement signing. (3) Market the vehicle effectively to attract potential buyers. (4) Perform an exit inspection and detailing of the vehicle post-sale. <strong>Note:</strong> The vehicle may be road-tested during the consignment period to ensure it meets buyer expectations.
              </div>
            </div>
          </div>
        </div>

        <!-- PAGE 2 -->
        <div class="page page-break">
          <div class="content-container" style="height: calc(297mm - 40px); margin-top: 20px;">
            <!-- VEHICLE FINANCE SETTLEMENT -->
            <div class="section compact-section">
              <div class="section-title">VEHICLE FINANCE SETTLEMENT</div>
              
              <div class="text-content">
                If the vehicle is under finance, the Owner must disclose this at the time of consignment. The outstanding balance must be cleared before ownership transfer.
              </div>
              
              <table style="width: 100%; margin-top: 6px; border-collapse: collapse;">
                <tr>
                  <td style="width: 70%; padding: 2px 0; color: white; font-size: 10px;">Is the vehicle under finance?</td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">Yes <span class="checkbox"></span></td>
                  <td style="width: 15%; padding: 2px 0; text-align: center; color: white; font-size: 10px;">No <span class="checkbox"></span></td>
                </tr>
              </table>

              <div class="subsection-title">Finance Clearance Options:</div>
              
              <div class="text-content">
                <strong>Option 1 – Owner Settles the Finance:</strong> The Owner will settle the finance directly and provide a Clearance Letter confirming full settlement.
              </div>

              <div class="text-content">
                <strong>Option 2 – SilberArrows Advances the Finance Amount:</strong> The Owner must provide a Liability Letter from the finance company showing the exact outstanding balance, and sign a separate Consignment Vehicle Finance Settlement Agreement with SilberArrows.
              </div>

              <div class="text-content">
                <strong>General Conditions:</strong> The entire finance settlement process must be completed within five (5) business days of SilberArrows confirming the sale. SilberArrows is not liable for any delays, penalties, or interest charged by the finance company.
              </div>
            </div>

            <!-- TERMS & CONDITIONS -->
            <div class="section">
              <div class="section-title">TERMS & CONDITIONS</div>
              
              <ol class="numbered-list">
                <li><strong>FEE DISCLOSURE CONFIRMATION</strong> The Owner confirms they have been informed of all applicable fees related to the consignment process.</li>
                
                <li><strong>EXCLUSIVE LISTING</strong> The Owner agrees that this is an exclusive listing, and the vehicle will not be advertised or offered for sale through any other channels during the consignment period.</li>
                
                <li><strong>PAYMENT TERMS FOR SALE</strong> If the vehicle is purchased by a buyer under bank finance, the funds will be transferred to the Owner 14 calendar days after the ownership change has taken place. If the vehicle is purchased with cash, the funds will be transferred to the Owner 7 calendar days after the ownership change has taken place.</li>
                
                <li><strong>REPRESENTATIVE OF THE OWNER</strong> If the Owner authorises a representative to act on their behalf for the consignment process, the Owner must provide written consent authorising the representative and a copy of the representative's Emirates ID must be submitted.</li>
                
                <li><strong>FINANCE AGREEMENT TERMS</strong>
                  <ul class="bullet-list">
                    <li>If the vehicle is purchased through a finance agreement, the terms of the finance agreement will apply.</li>
                    <li>SilberArrows is not responsible for the finance company's terms and conditions.</li>
                  </ul>
                </li>
                
                <li><strong>TERMINATION OF AGREEMENT</strong> Either the Owner or SilberArrows may terminate this agreement by providing 7 days' written notice, provided there is no ongoing or pending sale of the vehicle at the time of termination. If the Owner requests to terminate the agreement before the end of the 90-calendar day consignment period, any applicable fees outlined in the "Fees Payable for Early Termination" section must be paid to SilberArrows prior to the release of the vehicle.</li>
                
                <li><strong>OWNER'S RESPONSIBILITIES</strong> The Owner authorises SilberArrows to act on their behalf to market and sell the vehicle, including handling all necessary documentation related to the sale. The Owner confirms that they have full legal ownership of the vehicle, and that all information provided to SilberArrows is accurate to the best of their knowledge. The Owner agrees to provide the following documents:
                  <ul class="bullet-list">
                    <li>A copy of their Emirates ID (with the original required at the time of sale).</li>
                    <li>A copy of their driving license.</li>
                    <li>The vehicle registration card.</li>
                  </ul>
                  Additionally, the Owner is responsible for ensuring that:
                  <ul class="bullet-list">
                    <li>The vehicle remains fully registered and insured throughout the consignment period.</li>
                    <li>The vehicle is delivered in a clean condition.</li>
                    <li>The vehicle is free of any major mechanical or safety issues prior to consignment.</li>
                  </ul>
                </li>
                
                <li><strong>LIABILITY LIMITATIONS</strong> SilberArrows' liability is strictly limited to the fees actually paid to SilberArrows by the Owner. SilberArrows is not liable for any indirect, incidental, or consequential damages.</li>
                
                <li><strong>GENERAL PROVISIONS</strong> If any term of this agreement is found unenforceable, the remaining terms remain valid. This agreement is binding on the heirs, legal representatives, and assigns of both parties. This document constitutes the entire agreement between SilberArrows and the Owner and supersedes all prior communications.</li>
              </ol>
            </div>

            <!-- SIGNATURE SECTION -->
            <div class="section">
              <div class="text-content">
                By signing below, both parties confirm that they have read, understood, and agreed to the terms and conditions set out in this Vehicle Consignment Agreement.
              </div>
              
              <div class="signature-section">
                <div class="signature-box">
                  <div>SilberArrows Signature:</div>
                  <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.7); height: 35px; margin: 8px 0;"></div>
                  <div style="margin-top: 12px;">Date:</div>
                </div>
                <div class="signature-box">
                  <div>Owner/Representative Signature:</div>
                  <div style="border-bottom: 1px solid rgba(255, 255, 255, 0.7); height: 35px; margin: 8px 0;"></div>
                  <div style="margin-top: 12px;">Date:</div>
                </div>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="footer">
              +971 4 380 5515 &nbsp;&nbsp;•&nbsp;&nbsp; info@silberarrows.com &nbsp;&nbsp;•&nbsp;&nbsp; www.silberarrows.com
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log('📄 Generating complete consignment agreement PDF...');

    const pdfShiftResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source: htmlContent,
        landscape: false,
        format: 'A4',
        margin: '0mm'
      })
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('PDFShift API Error:', errorText);
      throw new Error(`PDFShift API Error: ${errorText}`);
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    const fileSizeMB = (pdfBuffer.byteLength / (1024 * 1024)).toFixed(2);
    
    console.log(`📄 Consignment Agreement PDF Generated: ${fileSizeMB}MB`);

    // Sanitize filename
    const sanitizedStockNumber = (car.stock_number || 'draft')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    return NextResponse.json({
      pdfData: Buffer.from(pdfBuffer).toString('base64'),
      fileName: `consignment-agreement-${sanitizedStockNumber}.pdf`,
      pdfStats: {
        fileSizeMB,
        pageCount: 2
      }
    });

  } catch (error) {
    console.error('Error generating consignment agreement:', error);
    return NextResponse.json(
      { error: 'Failed to generate consignment agreement' },
      { status: 500 }
    );
  }
} 