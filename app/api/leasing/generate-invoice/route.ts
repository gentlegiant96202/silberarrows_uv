import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import puppeteer from 'puppeteer';
import { format } from 'date-fns';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    // Fetch invoice data with customer and vehicle details
    const { data: invoice, error: invoiceError } = await supabase
      .from('lease_invoices')
      .select(`
        *,
        lease_customer:leasing_customers!lease_customer_id (
          customer_name,
          customer_email,
          customer_phone,
          customer_address,
          emirates_id,
          monthly_payment,
          lease_start_date,
          lease_end_date
        ),
        vehicle:leasing_inventory!vehicle_id (
          make,
          vehicle_model,
          model_year,
          plate_number,
          chassis_number,
          colour
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      console.error('Error fetching invoice:', invoiceError);
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Fetch all transactions for this invoice
    const { data: transactions, error: transError } = await supabase
      .from('lease_transactions')
      .select('*')
      .eq('invoice_id', invoiceId)
      .order('transaction_date', { ascending: true });

    if (transError) {
      console.error('Error fetching transactions:', transError);
      return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
    }

    // Generate HTML for PDF
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Lease Invoice - ${invoice.invoice_number}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #333;
            background: white;
            padding: 40px;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #000;
          }
          
          .company-info h1 {
            font-size: 32px;
            color: #000;
            margin-bottom: 10px;
          }
          
          .company-info p {
            color: #666;
            line-height: 1.6;
          }
          
          .invoice-title {
            text-align: right;
          }
          
          .invoice-title h2 {
            font-size: 28px;
            color: #000;
            margin-bottom: 10px;
          }
          
          .invoice-number {
            font-size: 18px;
            color: #666;
            margin-bottom: 5px;
          }
          
          .invoice-date {
            font-size: 14px;
            color: #666;
          }
          
          .billing-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          
          .billing-section h3 {
            font-size: 16px;
            color: #000;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .billing-section p {
            color: #666;
            line-height: 1.8;
            margin-bottom: 5px;
          }
          
          .vehicle-info {
            background: #f8f8f8;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .vehicle-info h3 {
            font-size: 16px;
            color: #000;
            margin-bottom: 15px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .vehicle-details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
          }
          
          .vehicle-details p {
            color: #666;
          }
          
          .vehicle-details strong {
            color: #000;
            display: block;
            margin-bottom: 3px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
          }
          
          thead {
            background: #000;
            color: white;
          }
          
          th {
            padding: 15px;
            text-align: left;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          td {
            padding: 15px;
            border-bottom: 1px solid #e0e0e0;
            color: #666;
          }
          
          .amount {
            text-align: right;
            font-weight: bold;
            color: #000;
          }
          
          .totals {
            margin-top: 30px;
            display: flex;
            justify-content: flex-end;
          }
          
          .totals-table {
            width: 350px;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .totals-row.grand-total {
            border-bottom: none;
            border-top: 2px solid #000;
            margin-top: 10px;
            padding-top: 15px;
            font-size: 20px;
            font-weight: bold;
            color: #000;
          }
          
          .payment-terms {
            margin-top: 40px;
            padding: 20px;
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            border-radius: 4px;
          }
          
          .payment-terms h4 {
            color: #856404;
            margin-bottom: 10px;
          }
          
          .payment-terms p {
            color: #856404;
            line-height: 1.6;
          }
          
          .footer {
            margin-top: 60px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            text-align: center;
            color: #999;
            font-size: 12px;
          }
          
          @media print {
            body {
              padding: 20px;
            }
            
            .invoice-header {
              page-break-after: avoid;
            }
            
            table {
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div class="company-info">
            <h1>SILBER ARROWS</h1>
            <p>Auto Leasing & Rental Services</p>
            <p>Dubai, United Arab Emirates</p>
            <p>Tel: +971 4 XXX XXXX</p>
            <p>Email: leasing@silberarrows.ae</p>
          </div>
          <div class="invoice-title">
            <h2>LEASE INVOICE</h2>
            <div class="invoice-number">${invoice.invoice_number}</div>
            <div class="invoice-date">Date: ${format(new Date(invoice.invoice_date), 'dd MMMM yyyy')}</div>
            <div class="invoice-date">Due: ${format(new Date(invoice.due_date), 'dd MMMM yyyy')}</div>
          </div>
        </div>
        
        <div class="billing-info">
          <div class="billing-section">
            <h3>Bill To</h3>
            <p><strong>${invoice.lease_customer?.customer_name || 'N/A'}</strong></p>
            <p>${invoice.lease_customer?.customer_address || ''}</p>
            <p>Phone: ${invoice.lease_customer?.customer_phone || 'N/A'}</p>
            <p>Email: ${invoice.lease_customer?.customer_email || 'N/A'}</p>
            <p>Emirates ID: ${invoice.lease_customer?.emirates_id || 'N/A'}</p>
          </div>
          <div class="billing-section">
            <h3>Lease Details</h3>
            <p><strong>Lease Period:</strong></p>
            <p>${invoice.billing_period_start ? format(new Date(invoice.billing_period_start), 'dd MMM yyyy') : ''} - 
               ${invoice.billing_period_end ? format(new Date(invoice.billing_period_end), 'dd MMM yyyy') : ''}</p>
            <p><strong>Monthly Rate:</strong> AED ${invoice.lease_customer?.monthly_payment?.toLocaleString() || '0'}</p>
          </div>
        </div>
        
        ${invoice.vehicle ? `
        <div class="vehicle-info">
          <h3>Vehicle Information</h3>
          <div class="vehicle-details">
            <div>
              <strong>Make & Model</strong>
              <p>${invoice.vehicle.make} ${invoice.vehicle.vehicle_model}</p>
            </div>
            <div>
              <strong>Year</strong>
              <p>${invoice.vehicle.model_year}</p>
            </div>
            <div>
              <strong>Plate Number</strong>
              <p>${invoice.vehicle.plate_number || 'N/A'}</p>
            </div>
            <div>
              <strong>Chassis Number</strong>
              <p>${invoice.vehicle.chassis_number || 'N/A'}</p>
            </div>
            <div>
              <strong>Color</strong>
              <p>${invoice.vehicle.colour || 'N/A'}</p>
            </div>
          </div>
        </div>
        ` : ''}
        
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Type</th>
              <th class="amount">Amount (AED)</th>
            </tr>
          </thead>
          <tbody>
            ${transactions?.map(t => `
              <tr>
                <td>${format(new Date(t.transaction_date), 'dd/MM/yyyy')}</td>
                <td>${t.description}</td>
                <td>${t.transaction_type.replace(/_/g, ' ').toUpperCase()}</td>
                <td class="amount">${t.amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</td>
              </tr>
            `).join('') || ''}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-table">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span>AED ${invoice.subtotal.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row">
              <span>VAT (5%):</span>
              <span>AED ${invoice.vat_amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="totals-row grand-total">
              <span>Total Due:</span>
              <span>AED ${invoice.total_amount.toLocaleString('en-AE', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>
        
        <div class="payment-terms">
          <h4>Payment Terms</h4>
          <p>Payment is due within 30 days from the invoice date.</p>
          <p>Late payments may incur additional charges as per the lease agreement.</p>
          <p>For payment inquiries, please contact our accounts department.</p>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing Silber Arrows for your leasing needs.</p>
          <p>This is a computer-generated invoice and does not require a signature.</p>
        </div>
      </body>
      </html>
    `;

    // Generate PDF using Puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(html);
    await page.emulateMediaType('print');
    
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    // Upload PDF to Supabase Storage
    const fileName = `lease-invoices/${invoice.invoice_number}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('leasing-payments')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('Error uploading PDF:', uploadError);
      return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('leasing-payments')
      .getPublicUrl(fileName);

    // Update invoice with PDF URL
    await supabase
      .from('lease_invoices')
      .update({ pdf_url: publicUrl })
      .eq('id', invoiceId);

    return NextResponse.json({ 
      success: true, 
      pdfUrl: publicUrl,
      invoiceNumber: invoice.invoice_number
    });

  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
