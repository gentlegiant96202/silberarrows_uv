import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

interface LineItem {
  line_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

// Generate HTML content for Sales Order document
function generateSalesOrderHTML(formData: any, lineItems: LineItem[], logoSrc: string) {
  const documentTitle = 'SALES ORDER';
  
  // Safely handle numeric values
  const safeNumber = (value: any) => {
    const num = Number(value) || 0;
    return num.toLocaleString();
  };
  
  // Safely handle string values
  const safeString = (value: any) => String(value || '');

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: any) => {
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

  // Format currency
  const formatCurrency = (value: any) => {
    const num = Number(value) || 0;
    return `AED ${num.toLocaleString()}`;
  };

  // Generate line items table rows
  const generateLineItemsRows = () => {
    if (!lineItems || lineItems.length === 0) {
      return '<tr><td colspan="4" style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">No line items</td></tr>';
    }

    return lineItems.map((item, index) => {
      const isPartExchange = item.line_type === 'part_exchange';
      const displayTotal = isPartExchange ? -Math.abs(item.line_total) : item.line_total;
      const totalColor = isPartExchange ? '#90EE90' : 'white';
      const prefix = isPartExchange ? '- ' : '';
      
      return `
        <tr>
          <td class="data" style="width: 50%;">${safeString(item.description)}</td>
          <td class="data" style="width: 10%; text-align: center;">${item.quantity}</td>
          <td class="data" style="width: 20%; text-align: right;">${formatCurrency(item.unit_price)}</td>
          <td class="data" style="width: 20%; text-align: right; color: ${totalColor};">${prefix}${formatCurrency(Math.abs(displayTotal))}</td>
        </tr>
      `;
    }).join('');
  };

  // Calculate totals
  const subtotal = lineItems
    .filter(item => item.line_type !== 'part_exchange')
    .reduce((sum, item) => sum + (Number(item.line_total) || 0), 0);
  
  const partExchangeValue = lineItems
    .filter(item => item.line_type === 'part_exchange')
    .reduce((sum, item) => sum + Math.abs(Number(item.line_total) || 0), 0);
  
  const totalAmount = subtotal - partExchangeValue;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${documentTitle}</title>
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
          justify-content: space-between;
        }

        .page.first-page {
          padding: 8px 10px 18px 10px;
        }

        .page-break {
          page-break-before: always;
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
          justify-content: space-between;
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

        .form-table th {
          background: rgba(255, 255, 255, 0.1);
          font-weight: bold;
          padding: 8px 10px;
          text-align: left;
          color: rgba(255, 255, 255, 0.95);
          border: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 10px;
        }

        .form-table th:first-child {
          border-left: none;
        }

        .form-table th:last-child {
          border-right: none;
        }

        .checkbox {
          width: 12px;
          height: 12px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          display: inline-block;
          text-align: center;
          line-height: 10px;
          font-size: 9px;
          margin: 0 3px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 2px;
        }

        .warranty-checkbox-line {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          margin: 4px 0;
          color: white;
          font-size: 10px;
          position: relative;
          z-index: 2;
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

        .terms-cols {
          display: flex;
          gap: 24px;
          height: 100%;
          align-items: stretch;
        }

        .terms-col {
          flex: 1;
          white-space: pre-line;
          font-size: 10px;
          line-height: 1.4;
          color: white;
          position: relative;
          z-index: 2;
          text-align: justify;
        }

        .terms-col strong {
          white-space: normal;
        }

        .notes-content {
          background-color: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 4px;
          padding: 12px;
          font-size: 10px;
          line-height: 1.4;
          color: white;
          position: relative;
          z-index: 2;
          min-height: 40px;
          white-space: pre-wrap;
          text-align: left;
        }

        .totals-table {
          width: 100%;
          margin-top: 8px;
        }

        .totals-table td {
          padding: 4px 10px;
          font-size: 10px;
        }

        .totals-table .label-cell {
          text-align: right;
          width: 70%;
          color: rgba(255, 255, 255, 0.8);
        }

        .totals-table .value-cell {
          text-align: right;
          width: 30%;
          color: white;
        }

        .totals-table .total-row td {
          font-weight: bold;
          font-size: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.3);
          padding-top: 8px;
        }
      </style>
    </head>
    <body>
      <!-- PAGE 1 -->
      <div class="page first-page">
        <div class="header">
          <div class="title-section">
            <div class="title">PRE-OWNED VEHICLE<br>RESERVATION FORM</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="content-container">
          <!-- DOCUMENT INFO -->
          <div class="section">
            <table class="form-table">
              <tr>
                <td class="label">Date:</td>
                <td class="data">${formatDate(formData.orderDate)}</td>
                <td class="label">Sales Order No.:</td>
                <td class="data">${safeString(formData.orderNumber)}</td>
              </tr>
              <tr>
                <td class="label">Sales Executive:</td>
                <td class="data">${safeString(formData.salesExecutive)}</td>
                <td class="label">Status:</td>
                <td class="data">QUOTATION</td>
              </tr>
            </table>
          </div>

          <!-- CUSTOMER SECTION -->
          <div class="section">
            <div class="section-title">CUSTOMER</div>
            <table class="form-table">
              <tr>
                <td class="label">Customer Name:</td>
                <td class="data">${safeString(formData.customerName)}</td>
                <td class="label">Contact No.:</td>
                <td class="data">${safeString(formData.customerPhone)}</td>
              </tr>
              <tr>
                <td class="label">Email Address:</td>
                <td class="data">${safeString(formData.customerEmail)}</td>
                <td class="label">Customer Identification:</td>
                <td class="data">
                  ${formData.customerIdType ? `${formData.customerIdType}: ${safeString(formData.customerIdNumber)}` : '-'}
                </td>
              </tr>
            </table>
          </div>

          <!-- VEHICLE SECTION -->
          <div class="section">
            <div class="section-title">VEHICLE</div>
            <table class="form-table">
              <tr>
                <td class="label">Chassis No.:</td>
                <td class="data">${safeString(formData.chassisNo)}</td>
                <td class="label">Colour:</td>
                <td class="data">${safeString(formData.vehicleColour)}</td>
              </tr>
              <tr>
                <td class="label">Make & Model:</td>
                <td class="data">${safeString(formData.vehicleMakeModel)}</td>
                <td class="label">Model Year:</td>
                <td class="data">${safeString(formData.modelYear)}</td>
              </tr>
              <tr>
                <td class="label">Mileage (Km):</td>
                <td class="data">${safeNumber(formData.vehicleMileage)}</td>
                <td class="label"></td>
                <td class="data"></td>
              </tr>
            </table>
            
            <div class="warranty-checkbox-line" style="margin-top: 15px;">
              <span style="margin-right: 30px; min-width: 200px;">Manufacturer / Dealer Warranty</span>
              <span style="margin-right: 10px;">Yes</span>
              <span class="checkbox" style="margin-right: 20px;">${formData.hasManufacturerWarranty ? '✓' : ''}</span>
              <span style="margin-right: 10px;">No</span>
              <span class="checkbox">${!formData.hasManufacturerWarranty ? '✓' : ''}</span>
            </div>
            ${formData.hasManufacturerWarranty ? `
            <table class="form-table">
              <tr>
                <td class="label">Expiration Date:</td>
                <td class="data">${formatDate(formData.manufacturerWarrantyExpiry)}</td>
                <td class="label">Expiration Mileage:</td>
                <td class="data">${safeNumber(formData.manufacturerWarrantyKm)}</td>
              </tr>
            </table>
            ` : ''}
            
            <div class="warranty-checkbox-line">
              <span style="margin-right: 30px; min-width: 200px;">Dealer Service Package</span>
              <span style="margin-right: 10px;">Yes</span>
              <span class="checkbox" style="margin-right: 20px;">${formData.hasManufacturerService ? '✓' : ''}</span>
              <span style="margin-right: 10px;">No</span>
              <span class="checkbox">${!formData.hasManufacturerService ? '✓' : ''}</span>
            </div>
            ${formData.hasManufacturerService ? `
            <table class="form-table">
              <tr>
                <td class="label">Expiration Date:</td>
                <td class="data">${formatDate(formData.manufacturerServiceExpiry)}</td>
                <td class="label">Expiration Mileage:</td>
                <td class="data">${safeNumber(formData.manufacturerServiceKm)}</td>
              </tr>
            </table>
            ` : ''}
          </div>

          <!-- LINE ITEMS SECTION -->
          <div class="section">
            <div class="section-title">ORDER ITEMS</div>
            <table class="form-table">
              <thead>
                <tr>
                  <th style="width: 50%;">Description</th>
                  <th style="width: 10%; text-align: center;">Qty</th>
                  <th style="width: 20%; text-align: right;">Unit Price</th>
                  <th style="width: 20%; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${generateLineItemsRows()}
              </tbody>
            </table>
            
            <!-- Totals -->
            <table class="totals-table">
              <tr>
                <td class="label-cell">Subtotal:</td>
                <td class="value-cell">${formatCurrency(subtotal)}</td>
              </tr>
              ${partExchangeValue > 0 ? `
              <tr>
                <td class="label-cell">Part Exchange Credit:</td>
                <td class="value-cell" style="color: #90EE90;">- ${formatCurrency(partExchangeValue)}</td>
              </tr>
              ` : ''}
              <tr class="total-row">
                <td class="label-cell">TOTAL AMOUNT:</td>
                <td class="value-cell" style="font-size: 14px;">${formatCurrency(totalAmount)}</td>
              </tr>
            </table>
          </div>

          <!-- NOTES SECTION -->
          ${formData.notes ? `
          <div class="section">
            <div class="section-title">ADDITIONAL NOTES</div>
            <div class="notes-content">${safeString(formData.notes).trim().replace(/\n/g, '<br/>')}</div>
          </div>
          ` : ''}

          <!-- AGREEMENT SECTION -->
          <div class="section">
            <div class="text-content" style="margin: 0 0 8px 0;">
              <strong>Acknowledgement</strong>

I confirm that the above vehicle details, pricing, and terms are correct and agreed. I understand that this Sales Order serves as a binding agreement upon signature.
            </div>
            
            <div class="signature-section" style="margin-top: 8px;">
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
          </div>
        </div>
      </div>

      <!-- PAGE 2 - TERMS & CONDITIONS -->
      <div class="page page-break">
        <div class="header">
          <div class="title-section">
            <div class="title">GENERAL TERMS & CONDITIONS FOR<br>PRE-OWNED VEHICLE SALES</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="content-container" style="flex: 1; display: flex; flex-direction: column; height: calc(100% - 60px);">

          <div class="section" style="flex: 1; display: flex; flex-direction: column;">
            <div class="terms-cols">
              <div class="terms-col">
<strong>Silber Arrows 1934 Used Car Trading LLC</strong> (hereinafter referred to as "SilberArrows")

<strong>1. INTRODUCTION</strong> SilberArrows adheres to Federal Law No. 15 of 2020 on Consumer Protection. These terms and conditions govern the sale of pre-owned vehicles by SilberArrows. By signing this Sales Order, you agree to be bound by these terms and conditions.

<strong>2. VEHICLE INFORMATION</strong> All vehicles are sold as seen and described in the sales order. We ensure that all descriptions and representations of vehicles are accurate to the best of our knowledge.

<strong>3. PRICE AND PAYMENT</strong>
• The price of the vehicle is as stated in the sales order. Prices include VAT unless stated otherwise.
• Payment can be made via bank transfer, credit/debit card (with a 2% surcharge), cash, cheque, or any other method agreed upon in writing.
• Full payment must be received before the vehicle can be released to the buyer.

<strong>4. DEPOSITS</strong> A deposit may be required to secure a vehicle. This deposit is non-refundable unless otherwise stated in the sales order or required by law.

<strong>5. FINANCE</strong>
• If the vehicle is purchased through a finance agreement, the terms of the finance agreement will apply.
• SilberArrows is not responsible for the finance company's terms and conditions.

<strong>6. PART EXCHANGE</strong>
• Part exchange vehicles are accepted at the discretion of SilberArrows.
• The agreed part exchange value will be deducted from the price of the vehicle being purchased.
• Part exchange vehicles must be delivered with all relevant documentation and in the condition described during the valuation.

<strong>7. WARRANTY & DEALER SERVICE PACKAGE</strong>
• Vehicles may come with a manufacturer's warranty and/or dealer service package as specified in the sales order.
• For vehicles without any manufacturer's warranty, SilberArrows offers Extended Warranty and ServiceCare products.
• Any warranty offered does not affect your statutory rights.

<strong>8. VEHICLE CONDITION AND INSPECTION</strong>
• The buyer is responsible for inspecting the vehicle prior to purchase.
• Any defects or issues should be reported to SilberArrows before the completion of the sale.
              </div>
              <div class="terms-col">
<strong>9. RETURNS AND REFUNDS</strong>
• Returns are only accepted if agreed in writing by SilberArrows.
• Refunds will be processed in accordance with the terms specified in this sales order and applicable law.

<strong>10. LIMITATION OF LIABILITY</strong>
• SilberArrows is not liable for any indirect or consequential loss or damage arising out of or in connection with the sale of the vehicle.
• Our liability is limited to the purchase price of the vehicle.

<strong>11. DATA PROTECTION</strong>
• Personal information collected during the sales process will be used in accordance with our Privacy Policy at https://www.silberarrows.com/privacy-policy/.
• We may share your information with third parties involved in the sale and financing of the vehicle.

<strong>12. GOVERNING LAW</strong>
• These terms and conditions are governed by the laws of the Emirate of Dubai.
• Any disputes arising out of or in connection with these terms will be subject to the exclusive jurisdiction of the courts of Dubai.

<strong>13. CHANGES TO TERMS AND CONDITIONS</strong> SilberArrows reserves the right to change these terms and conditions at any time. Changes will apply to sales made after the date of the change.

<strong>14. DISTANCE SELLING</strong> If the sales order is completed without face-to-face contact, you may cancel within 7 days. The cancellation period expires upon the transfer of ownership of the vehicle.

<strong>15. FORCE MAJEURE</strong> SilberArrows shall not be liable for any failure to perform its obligations due to events beyond its control.

<strong>16. INSURANCE GOVERNANCE</strong> It is the customer's responsibility to ensure that their vehicle is adequately insured while it is in the possession of SilberArrows.

<strong>17. TITLE AND RISK</strong> The title to the vehicle will pass to the buyer upon full payment. Risk in the vehicle will pass to the buyer upon delivery or collection.

<strong>18. INDEMNITY</strong> The buyer agrees to indemnify and hold SilberArrows harmless from all liabilities arising out of the buyer's breach of these terms.

<strong>19. ENTIRE AGREEMENT</strong> These terms and conditions, together with the sales order, constitute the entire agreement between the parties.

              </div>
            </div>
          </div>

          <!-- SIGNATURE SECTION -->
          <div class="section">
            <div class="text-content" style="margin-bottom: 8px; text-align: left;">
              <strong>Acknowledgement</strong><br><br>I acknowledge that I have read, understood, and agree to the terms and conditions set out in this sales order.
            </div>
            <div class="signature-section" style="margin-top: 6px;">
              <div class="signature-box">
                <div>SilberArrows Signature:</div>
                <div class="signature-area" style="height: 60px;">
                  <div class="signature-date">Date:</div>
                </div>
              </div>
              <div class="signature-box">
                <div>Customer Signature:</div>
                <div class="signature-area" style="height: 60px;">
                  <div class="signature-date">Date:</div>
                </div>
              </div>
            </div>
          </div>

          <!-- FOOTER -->
          <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095 | TRN: 100281137800003 | Tel: +971 4 380 5515 | sales@silberarrows.com | www.silberarrows.com
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { salesOrderId } = body;
    
    console.log('[generate-sales-order-document] Request received:', { salesOrderId });

    if (!salesOrderId) {
      return NextResponse.json(
        { error: 'Sales Order ID is required' },
        { status: 400 }
      );
    }

    // Resolve logo data URL from local PNG
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

    // Validate PDFShift API key
    if (!process.env.PDFSHIFT_API_KEY) {
      return NextResponse.json(
        { error: 'PDFShift API key not configured' },
        { status: 500 }
      );
    }

    // Fetch sales order data
    console.log('[generate-sales-order-document] Fetching sales order...');
    const { data: salesOrder, error: soError } = await supabase
      .from('uv_sales_orders')
      .select('*')
      .eq('id', salesOrderId)
      .single();

    if (soError) {
      console.error('[generate-sales-order-document] Sales order fetch error:', soError);
      return NextResponse.json(
        { error: 'Sales order not found', details: soError.message },
        { status: 404 }
      );
    }
    
    if (!salesOrder) {
      return NextResponse.json(
        { error: 'Sales order not found' },
        { status: 404 }
      );
    }
    
    console.log('[generate-sales-order-document] Sales order found:', salesOrder.order_number);

    // Fetch line items
    console.log('[generate-sales-order-document] Fetching line items...');
    const { data: lineItems, error: liError } = await supabase
      .from('uv_sales_order_lines')
      .select('*')
      .eq('sales_order_id', salesOrderId)
      .order('sort_order', { ascending: true });

    if (liError) {
      console.error('[generate-sales-order-document] Line items fetch error:', liError);
      return NextResponse.json(
        { error: 'Failed to fetch line items', details: liError.message },
        { status: 500 }
      );
    }
    
    console.log('[generate-sales-order-document] Line items found:', lineItems?.length || 0);

    // Prepare form data for template
    const formData = {
      orderNumber: salesOrder.order_number,
      orderDate: salesOrder.order_date,
      salesExecutive: salesOrder.sales_executive,
      customerName: salesOrder.customer_name,
      customerPhone: salesOrder.customer_phone,
      customerEmail: salesOrder.customer_email,
      customerIdType: salesOrder.customer_id_type,
      customerIdNumber: salesOrder.customer_id_number,
      vehicleMakeModel: salesOrder.vehicle_make_model,
      modelYear: salesOrder.model_year,
      chassisNo: salesOrder.chassis_no,
      vehicleColour: salesOrder.vehicle_colour,
      vehicleMileage: salesOrder.vehicle_mileage,
      hasManufacturerWarranty: salesOrder.has_manufacturer_warranty,
      manufacturerWarrantyExpiry: salesOrder.manufacturer_warranty_expiry,
      manufacturerWarrantyKm: salesOrder.manufacturer_warranty_km,
      hasManufacturerService: salesOrder.has_manufacturer_service,
      manufacturerServiceExpiry: salesOrder.manufacturer_service_expiry,
      manufacturerServiceKm: salesOrder.manufacturer_service_km,
      hasPartExchange: salesOrder.has_part_exchange,
      partExchangeMakeModel: salesOrder.part_exchange_make_model,
      partExchangeYear: salesOrder.part_exchange_year,
      partExchangeChassisNo: salesOrder.part_exchange_chassis,
      partExchangeMileage: salesOrder.part_exchange_mileage,
      partExchangeValue: salesOrder.part_exchange_value,
      subtotal: salesOrder.subtotal,
      totalAmount: salesOrder.total_amount,
      notes: salesOrder.notes
    };

    // Generate HTML content
    console.log('[generate-sales-order-document] Generating HTML...');
    const htmlContent = generateSalesOrderHTML(formData, lineItems || [], logoSrc);
    console.log('[generate-sales-order-document] HTML generated, length:', htmlContent.length);

    // Call PDFShift API
    console.log('[generate-sales-order-document] Calling PDFShift API...');
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
        delay: 1000
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('[generate-sales-order-document] PDFShift error:', pdfShiftResponse.status, errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status} - ${errorText}`);
    }

    console.log('[generate-sales-order-document] PDF generated successfully');
    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    console.log('[generate-sales-order-document] PDF size:', pdfBuffer.byteLength, 'bytes');
    
    // Upload to Supabase storage
    const fileName = `sales-order-${salesOrderId}-${Date.now()}.pdf`;
    console.log('[generate-sales-order-document] Uploading to storage:', fileName);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('[generate-sales-order-document] Upload error:', uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    
    console.log('[generate-sales-order-document] Upload successful');
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // Update sales order with PDF URL
    // Note: signing_status column may not exist yet - that's okay
    const { error: updateError } = await supabase
      .from('uv_sales_orders')
      .update({ 
        pdf_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', salesOrderId);

    if (updateError) {
      console.error('Failed to update sales order with PDF URL:', updateError);
    }
    
    // Try to update signing_status separately (column may not exist yet)
    await supabase
      .from('uv_sales_orders')
      .update({ signing_status: 'pending' })
      .eq('id', salesOrderId)
      .then(() => {})
      .catch(() => {}); // Ignore errors if column doesn't exist

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      salesOrderId,
      orderNumber: salesOrder.order_number,
      message: 'Sales Order document generated successfully'
    });

  } catch (error) {
    console.error('[generate-sales-order-document] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { 
        error: errorMessage.includes('PDFShift') ? 'PDF generation failed' : 
               errorMessage.includes('upload') ? 'PDF upload failed' :
               'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
