import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Generate HTML content for reservation/invoice form
function generateReservationHTML(formData: any, mode: string, logoSrc: string) {
  const isInvoice = mode === 'invoice';
  const documentTitle = isInvoice ? 'INVOICE DOCUMENT' : 'NEW AND PRE-OWNED VEHICLE RESERVATION FORM';
  
  // Safely handle numeric values
  const safeNumber = (value: any) => {
    const num = Number(value) || 0;
    return num.toLocaleString();
  };
  
  // Safely handle string values
  const safeString = (value: any) => String(value || '');
  
  // VAT helpers (inclusive VAT at 5%)
  const computeVatBreakdown = (totalInclVat: number) => {
    const total = Number(totalInclVat) || 0;
    const net = Math.round((total / 1.05) * 100) / 100;
    const vat = Math.round((total - net) * 100) / 100;
    return { net, vat, total };
  };

  // Format date to DD/MM/YYYY
  const formatDate = (dateString: any) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // Return original if invalid
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString; // Return original if parsing fails
    }
  };
  
  // Invoice-specific customizations
  const headerTitle = isInvoice 
    ? 'NEW AND PRE-OWNED VEHICLE<br>SALES - TAX INVOICE'
    : 'NEW AND PRE-OWNED VEHICLE<br>RESERVATION FORM';
    
  const termsTitle = isInvoice
    ? 'GENERAL TERMS & CONDITIONS FOR<br>NEW & PRE-OWNED VEHICLE SALES'
    : 'GENERAL TERMS & CONDITIONS FOR<br>NEW & PRE-OWNED VEHICLE SALES';
    
  // Different titles for signature section vs terms page
  const signatureTermsTitle = isInvoice
    ? 'GENERAL TERMS & CONDITIONS FOR<br>NEW & PRE-OWNED VEHICLE SALES'
    : ''; // Remove title for reservation signature section
    
  const termsContent = isInvoice
    ? 'Payment has been received in full. Vehicle ownership will be transferred upon completion of RTA procedures. All add-ons and services are confirmed as per this invoice. Vehicle delivery is subject to final inspection and documentation completion.'
    : '<strong>Acknowledgement</strong>\n\nI confirm that the above vehicle details, price, and payment terms are correct and agreed, and that I have paid the stated reservation deposit.';
  
  // Status-specific labels
  const paymentStatusLabel = isInvoice ? 'Payment Status' : 'Amount Due';
  const paymentStatusValue = isInvoice ? 'PAID IN FULL' : `AED ${safeNumber(formData.amountDue)}`;
  
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

        .checkbox-line {
          display: flex;
          align-items: center;
          margin: 6px 0;
          color: white;
          font-size: 10px;
          position: relative;
          z-index: 2;
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

        .terms-col {
          word-spacing: normal;
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
        }
      </style>
    </head>
    <body>
      <!-- PAGE 1 -->
      <div class="page first-page">
        <div class="header">
          <div class="title-section">
            <div class="title">${headerTitle}</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="content-container">
          <!-- DOCUMENT INFO -->
          <div class="section">
            <table class="form-table">
              ${isInvoice ? `
              <tr>
                <td class="label">Invoice No.:</td>
                <td class="data">${safeString(formData.documentNumber || 'Pending')}</td>
                <td class="label">Date:</td>
                <td class="data">${formatDate(formData.date)}</td>
              </tr>
              ` : `
              <tr>
                <td class="label">Date:</td>
                <td class="data">${formatDate(formData.date)}</td>
                <td class="label">Status:</td>
                <td class="data">RESERVED</td>
              </tr>
              `}
              <tr>
                <td class="label">Sales Executive:</td>
                <td class="data">${safeString(formData.salesExecutive)}</td>
                ${isInvoice ? `
                <td class="label">Status:</td>
                <td class="data">PAID IN FULL</td>
                ` : `
                <td class="label"></td>
                <td class="data"></td>
                `}
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
                <td class="data">+971 ${safeString(formData.contactNo)}</td>
              </tr>
              <tr>
                <td class="label">Email Address:</td>
                <td class="data">${safeString(formData.emailAddress)}</td>
                <td class="label">Customer Identification:</td>
                <td class="data">
                  ${formData.customerIdType}: ${safeString(formData.customerIdNumber)}
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
                <td class="label">Exterior Colour:</td>
                <td class="data">${safeString(formData.exteriorColour)}</td>
              </tr>
              <tr>
                <td class="label">Make & Model:</td>
                <td class="data">${safeString(formData.makeModel)}</td>
                <td class="label">Interior Colour:</td>
                <td class="data">${safeString(formData.interiorColour)}</td>
              </tr>
              <tr>
                <td class="label">Model Year:</td>
                <td class="data">${safeString(formData.modelYear)}</td>
                <td class="label">Mileage (Km):</td>
                <td class="data">${safeNumber(formData.mileage)}</td>
              </tr>
            </table>
            
            <div class="warranty-checkbox-line" style="margin-top: 15px;">
              <span style="margin-right: 30px; min-width: 200px;">Manufacturer / Dealer Warranty</span>
              <span style="margin-right: 10px;">Yes</span>
              <span class="checkbox" style="margin-right: 20px;">${formData.manufacturerWarranty ? '✓' : ''}</span>
              <span style="margin-right: 10px;">No</span>
              <span class="checkbox">${!formData.manufacturerWarranty ? '✓' : ''}</span>
            </div>
            ${formData.manufacturerWarranty ? `
            <table class="form-table">
                             <tr>
                 <td class="label">Expiration Date:</td>
                 <td class="data">${formatDate(formData.manufacturerWarrantyExpiryDate)}</td>
                 <td class="label">Expiration Mileage:</td>
                 <td class="data">${safeNumber(formData.manufacturerWarrantyExpiryMileage)}</td>
               </tr>
            </table>
            ` : ''}
            
            <div class="warranty-checkbox-line">
              <span style="margin-right: 30px; min-width: 200px;">Dealer Service Package</span>
              <span style="margin-right: 10px;">Yes</span>
              <span class="checkbox" style="margin-right: 20px;">${formData.dealerServicePackage ? '✓' : ''}</span>
              <span style="margin-right: 10px;">No</span>
              <span class="checkbox">${!formData.dealerServicePackage ? '✓' : ''}</span>
            </div>
            ${formData.dealerServicePackage ? `
            <table class="form-table">
                             <tr>
                 <td class="label">Expiration Date:</td>
                 <td class="data">${formatDate(formData.dealerServicePackageExpiryDate)}</td>
                 <td class="label">Expiration Mileage:</td>
                 <td class="data">${safeNumber(formData.dealerServicePackageExpiryMileage)}</td>
               </tr>
            </table>
            ` : ''}
          </div>

          ${formData.hasPartExchange ? `
          <!-- PART EXCHANGE SECTION -->
          <div class="section">
            <div class="section-title">PART EXCHANGE</div>
            <table class="form-table">
              <tr>
                <td class="label">Make & Model:</td>
                <td class="data">${safeString(formData.partExchangeMakeModel)}</td>
                <td class="label">Model Year:</td>
                <td class="data">${safeString(formData.partExchangeModelYear)}</td>
              </tr>
              <tr>
                <td class="label">Chassis No.:</td>
                <td class="data">${safeString(formData.partExchangeChassisNo)}</td>
                <td class="label">Exterior Colour:</td>
                <td class="data">${safeString(formData.partExchangeExteriorColour)}</td>
              </tr>
              <tr>
                <td class="label">Engine No.:</td>
                <td class="data">${safeString(formData.partExchangeEngineNo)}</td>
                <td class="label">Mileage:</td>
                <td class="data">${safeString(formData.partExchangeMileage)}</td>
              </tr>
            </table>
          </div>
          ` : ''}

          <!-- ADD-ONS SECTION -->
          <div class="section">
            <div class="section-title">ADD-ONS</div>
            <table class="form-table">
              <tr>
                <td class="label">Extended Warranty:</td>
                <td class="data">AED ${safeNumber(formData.extendedWarrantyPrice)}</td>
                <td class="label">Ceramic Treatment:</td>
                <td class="data">AED ${safeNumber(formData.ceramicTreatmentPrice)}</td>
              </tr>
              <tr>
                <td class="label">ServiceCare:</td>
                <td class="data">AED ${safeNumber(formData.serviceCarePrice)}</td>
                <td class="label">Window Tints:</td>
                <td class="data">AED ${safeNumber(formData.windowTintsPrice)}</td>
              </tr>
            </table>
          </div>

          <!-- NOTES SECTION -->
          ${formData.additionalNotes && formData.additionalNotes.trim() ? `
          <div class="section">
            <div class="section-title">ADDITIONAL NOTES</div>
            <div class="notes-content">
              ${safeString(formData.additionalNotes).replace(/\n/g, '<br/>')}
            </div>
          </div>
          ` : ''}

          <!-- PAYMENT SECTION -->
          <div class="section">
            <div class="section-title">PAYMENT</div>
            <table class="form-table">
              <tr>
                <td class="label">RTA + Add-Ons:</td>
                <td class="data">AED ${safeNumber((Number(formData.rtaFees || 0)) + (Number(formData.addOnsTotal || 0)))}</td>
                <td class="label">Vehicle Sale Price:</td>
                <td class="data">AED ${safeNumber(formData.vehicleSalePrice)}</td>
              </tr>
              <tr>
                <td class="label">Deposit:</td>
                <td class="data">AED ${safeNumber(formData.deposit)}</td>
                <td class="label">Invoice Total:</td>
                <td class="data">AED ${safeNumber(formData.invoiceTotal)}</td>
              </tr>
              <tr>
                <td class="label">Part Exchange:</td>
                <td class="data">AED ${safeNumber(formData.partExchangeValue)}</td>
                <td class="label">${paymentStatusLabel}:</td>
                <td class="data">${paymentStatusValue}</td>
              </tr>
            </table>

            ${isInvoice && formData.taxInvoice ? `
            <div class="section-title" style="margin-top:6px;">VAT BREAKDOWN (INCLUSIVE VAT @ 5%)</div>
            ${(() => {
              const b = computeVatBreakdown(Number(formData.invoiceTotal || 0));
              return `
              <table class="form-table">
                <tr>
                  <td class="label">Subtotal (Excl. VAT):</td>
                  <td class="data">AED ${safeNumber(b.net)}</td>
                  <td class="label">VAT (5%):</td>
                  <td class="data">AED ${safeNumber(b.vat)}</td>
                </tr>
                <tr>
                  <td class="label">Total (Incl. VAT):</td>
                  <td class="data" colspan="3">AED ${safeNumber(b.total)}</td>
                </tr>
              </table>
              `;
            })()}
            ` : ''}
          </div>

          <!-- RESERVATION TERMS -->
          <div class="section">
            ${signatureTermsTitle ? `<div class="text-content" style="margin: 0 0 8px 0;">
              <strong>${signatureTermsTitle}:</strong> ${termsContent}
            </div>` : `<div class="text-content" style="margin: 0 0 8px 0;">
              ${termsContent}
            </div>`}
            
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
            <div class="title">${termsTitle}</div>
          </div>
          <img src="${logoSrc}" alt="SilberArrows Logo" class="logo">
        </div>

        <div class="content-container" style="flex: 1; display: flex; flex-direction: column; height: calc(100% - 60px);">

          <div class="section" style="flex: 1; display: flex; flex-direction: column;">
            <div class="terms-cols">
              <div class="terms-col">
<strong>Silber Arrows 1934 Used Car Trading LLC</strong> (hereinafter referred to as "SilberArrows")

<strong>1. INTRODUCTION</strong> SilberArrows adheres to Federal Law No. 15 of 2020 on Consumer Protection. These terms and conditions govern the ${isInvoice ? 'sale' : 'reservation'} of both new and pre-owned vehicles by SilberArrows. By ${isInvoice ? 'purchasing' : 'reserving'} a vehicle ${isInvoice ? 'from' : 'with'} us, you agree to be bound by these terms and conditions.

<strong>2. VEHICLE INFORMATION</strong> All vehicles are ${isInvoice ? 'sold' : 'reserved'} as seen and described in the ${isInvoice ? 'invoice' : 'reservation form'}. We ensure that all descriptions and representations of vehicles are accurate to the best of our knowledge.

<strong>3. PRICE AND PAYMENT</strong>
• The price of the vehicle is as stated in the ${isInvoice ? 'invoice' : 'reservation form'}. Prices include VAT unless stated otherwise.
• Payment can be made via bank transfer, credit/debit card (with a %2 surcharge), cash, cheque, or any other method agreed upon in writing.
${isInvoice ? '• Full payment must be received before the vehicle can be released to the buyer.' : '• A deposit must be paid to secure the reservation. Full payment must be received before the vehicle can be released to the buyer.'}

<strong>4. DEPOSITS</strong> ${isInvoice ? 'A deposit may be required to secure a vehicle. This deposit is non-refundable unless otherwise stated in the invoice or required by law.' : 'A deposit is required to secure a vehicle. This deposit is non-refundable unless otherwise stated in the reservation form or required by law.'}

<strong>5. FINANCE</strong>
• If the vehicle is purchased through a finance agreement, the terms of the finance agreement will apply.
• SilberArrows is not responsible for the finance company's terms and conditions.

<strong>6. PART EXCHANGE</strong>
• Part exchange vehicles are accepted at the discretion of SilberArrows.
• The agreed part exchange value will be deducted from the price of the vehicle being purchased.
• Part exchange vehicles must be delivered with all relevant documentation and in the condition described during the valuation.

<strong>7. WARRANTY & DEALER SERVICE PACKAGE</strong>
• Vehicles may come with a manufacturer's warranty and/or dealer service package as specified in the ${isInvoice ? 'invoice' : 'reservation form'}. For vehicles that have a manufacturer's warranty and/or dealer service package, the expiry date or mileage will be stated on the ${isInvoice ? 'invoice' : 'reservation form'}.
• For vehicles without any manufacturer's warranty and/or dealer service package, SilberArrows offers the Extended Warranty and ServiceCare products. If the customer has chosen to purchase one or both products, the prices are detailed in the 'ADD-ONS' section of the ${isInvoice ? 'invoice' : 'reservation form'}.
• Any warranty offered does not affect your statutory rights.

<strong>8. VEHICLE CONDITION AND INSPECTION</strong>
• The buyer is responsible for inspecting the vehicle prior to purchase.
• Any defects or issues should be reported to SilberArrows before the completion of the sale.
              </div>
              <div class="terms-col">
<strong>9. RETURNS AND REFUNDS</strong>
• Returns are only accepted if agreed in writing by SilberArrows.
• Refunds will be processed in accordance with the terms specified in this ${isInvoice ? 'invoice' : 'reservation form'} and applicable law. For the avoidance of doubt, deposits are non-refundable except as stated in Section 4.

<strong>10. LIMITATION OF LIABILITY</strong>
• SilberArrows is not liable for any indirect or consequential loss or damage arising out of or in connection with the reservation or sale of the vehicle.
• Our liability is limited to the purchase price of the vehicle.

<strong>11. DATA PROTECTION</strong>
• Personal information collected during the ${isInvoice ? 'sales' : 'reservation'} process will be used in accordance with our Privacy Policy, which can be viewed at https://www.silberarrows.com/privacy-policy/.
• We may share your information with third parties involved in the ${isInvoice ? 'sale' : 'reservation'} and financing of the vehicle.

<strong>12. GOVERNING LAW</strong>
• These terms and conditions are governed by the laws of the Emirate of Dubai.
• Any disputes arising out of or in connection with these terms and conditions will be subject to the exclusive jurisdiction of the courts of Dubai.

<strong>13. CHANGES TO TERMS AND CONDITIONS</strong> SilberArrows reserves the right to change these terms and conditions at any time. Any changes will be posted on our website and will apply to ${isInvoice ? 'sales' : 'reservations'} made after the date of the change.

<strong>14. DISTANCE SELLING</strong> If the ${isInvoice ? 'invoice' : 'reservation form'} is completed without face-to-face contact, you may cancel the ${isInvoice ? 'purchase' : 'reservation'} within 7 days. The cancellation period expires upon the transfer of ownership of the vehicle.

<strong>15. FORCE MAJEURE</strong> SilberArrows shall not be liable for any failure to perform its obligations due to events beyond its control, including but not limited to natural disasters, war, civil commotion, and strikes.

<strong>16. INSURANCE GOVERNANCE</strong> It is the customer's responsibility to ensure that their vehicle is adequately insured while it is in the possession of SilberArrows. We are not liable for any damage or loss to the vehicle due to theft, fire, or any other unforeseen events while it is on our premises.

<strong>17. TITLE AND RISK</strong> The title to the vehicle will pass to the buyer upon full payment of the purchase price. Risk in the vehicle will pass to the buyer upon delivery or collection.

<strong>18. INDEMNITY</strong> The buyer agrees to indemnify and hold SilberArrows harmless from all liabilities, damages, losses, and costs (including legal fees) arising out of the buyer's breach of these terms and conditions.

<strong>19. ENTIRE AGREEMENT</strong> These terms and conditions, together with the ${isInvoice ? 'invoice' : 'reservation form'}, constitute the entire agreement between the parties and supersede all prior agreements, understandings, or representations.

              </div>
            </div>
          </div>

          <!-- SIGNATURE SECTION -->
          <div class="section">
            <div class="text-content" style="margin-bottom: 8px; text-align: left;">
              <strong>Acknowledgement</strong><br><br>I acknowledge that I have read, understood, and agree to the terms and conditions set out in this ${isInvoice ? 'invoice' : 'reservation form'}.
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
    const { mode, formData, leadId, reservationId, taxInvoice } = await request.json();
    
    console.log('📝 Generating vehicle document:', { mode, leadId, reservationId });
    console.log('📝 Form data received:', JSON.stringify(formData, null, 2));
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

    // Validate required data
    if (!mode || !formData || !leadId || !reservationId) {
      console.error('❌ Missing required parameters:', { mode, formData: !!formData, leadId, reservationId });
      return NextResponse.json(
        { error: 'Missing required parameters' },
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

    // Check for existing PDF and get document number
    console.log('🔍 Checking for existing PDF to delete and getting document number...');
    const { data: existingReservation } = await supabase
      .from('vehicle_reservations')
      .select('pdf_url, document_number')
      .eq('id', reservationId)
      .single();

    if (!taxInvoice && existingReservation?.pdf_url) {
      console.log('🗑️ Found existing PDF, attempting to delete:', existingReservation.pdf_url);
      try {
        // Extract file path from URL
        const url = new URL(existingReservation.pdf_url);
        const pathParts = url.pathname.split('/');
        const bucketIndex = pathParts.findIndex(part => part === 'documents');
        
        if (bucketIndex !== -1 && pathParts[bucketIndex + 1]) {
          const filePath = pathParts.slice(bucketIndex + 1).join('/');
          console.log('🗑️ Deleting file path:', filePath);
          
          const { error: deleteError } = await supabase.storage
            .from('documents')
            .remove([filePath]);
          
          if (deleteError) {
            console.warn('⚠️ Failed to delete previous PDF:', deleteError);
            // Continue with generation even if deletion fails
          } else {
            console.log('✅ Previous PDF deleted successfully');
          }
        } else {
          console.warn('⚠️ Could not extract file path from URL:', existingReservation.pdf_url);
        }
      } catch (deleteError) {
        console.warn('⚠️ Error during PDF deletion:', deleteError);
        // Continue with generation even if deletion fails
      }
    } else {
      console.log('ℹ️ No existing PDF found to delete');
    }

    // Add document number to form data
    const enhancedFormData = {
      ...formData,
      documentNumber: existingReservation?.document_number || 'Pending',
      taxInvoice: !!taxInvoice
    };

    // Generate HTML content for the reservation/invoice form
    console.log('📄 Generating HTML content...');
    const htmlContent = generateReservationHTML(enhancedFormData, mode, logoSrc);
    console.log('📄 HTML content generated, length:', htmlContent.length);
    
    console.log('📄 Generating vehicle document PDF using PDFShift...');
    
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
        delay: 1000
      }),
    });

    if (!pdfShiftResponse.ok) {
      const errorText = await pdfShiftResponse.text();
      console.error('❌ PDFShift API Error:', pdfShiftResponse.status, errorText);
      throw new Error(`PDFShift API Error: ${pdfShiftResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await pdfShiftResponse.arrayBuffer();
    
    // Upload to Supabase storage
    const filePrefix = taxInvoice ? 'tax-invoice' : mode;
    const fileName = `${filePrefix}-${reservationId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });
    
    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      throw new Error('Failed to upload PDF');
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);
      
    console.log('📄 PDF generated and uploaded:', publicUrl);

    // Get the updated document number after generation
    const { data: updatedReservation } = await supabase
      .from('vehicle_reservations')
      .select('document_number')
      .eq('id', reservationId)
      .single();

    return NextResponse.json({
      success: true,
      pdfUrl: publicUrl,
      documentType: mode,
      reservationId,
      documentNumber: updatedReservation?.document_number || existingReservation?.document_number,
      message: `${mode} document generated successfully`
    });

  } catch (error) {
    console.error('❌ Error generating vehicle document:', error);
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

// GET method to retrieve existing documents
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');
    const reservationId = searchParams.get('reservationId');

    if (!leadId && !reservationId) {
      return NextResponse.json(
        { error: 'Either leadId or reservationId is required' },
        { status: 400 }
      );
    }

    // Using supabaseAdmin for server-side operations

    let query = supabase
      .from('vehicle_reservations')
      .select('*');

    if (reservationId) {
      query = query.eq('id', reservationId);
    } else if (leadId) {
      query = query.eq('lead_id', leadId);
    }

    const { data: reservations, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching reservations:', error);
      return NextResponse.json(
        { error: 'Failed to fetch reservations' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reservations
    });

  } catch (error) {
    console.error('Error fetching vehicle documents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 