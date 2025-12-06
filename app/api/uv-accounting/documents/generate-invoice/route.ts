import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Helper: Format date
const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Helper: Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-AE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Charge type labels
const chargeTypeLabels: Record<string, string> = {
  'vehicle_price': 'Vehicle Sale Price',
  'rta_fee': 'RTA Transfer Fee',
  'insurance': 'Vehicle Insurance',
  'extended_warranty': 'Extended Warranty',
  'servicecare_standard': 'ServiceCare Standard',
  'servicecare_premium': 'ServiceCare Premium',
  'ceramic_coating': 'Ceramic Coating',
  'window_tints': 'Window Tinting',
  'other': 'Other'
};

// Build Invoice HTML
function buildInvoiceHtml(data: {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerIdType?: string;
  customerIdNumber?: string;
  vehicleInfo: string;
  vehicleYear?: number;
  vehicleColour?: string;
  chassisNumber?: string;
  stockNumber?: string;
  charges: Array<{ charge_type: string; description?: string; amount: number }>;
  invoiceTotal: number;
}): string {
  const chargeRows = data.charges.map(charge => `
    <tr>
      <td class="item-desc">${charge.charge_type === 'other' && charge.description ? charge.description : chargeTypeLabels[charge.charge_type] || charge.charge_type}</td>
      <td class="item-amount">${formatCurrency(charge.amount)} AED</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>Invoice - ${data.invoiceNumber}</title>
        <style>
          @page { margin: 0; size: A4 portrait; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            background: #000; 
            color: white; 
            font-family: 'Arial', sans-serif; 
            font-size: 11px; 
            line-height: 1.4; 
            width: 210mm; 
            min-height: 297mm;
            padding: 25px;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 25px;
            padding-bottom: 20px;
            border-bottom: 2px solid rgba(255,255,255,0.2);
          }
          .logo { width: 120px; }
          .title-section { text-align: right; }
          .title { font-size: 32px; font-weight: bold; color: white; margin-bottom: 5px; }
          .subtitle { font-size: 12px; color: rgba(255,255,255,0.7); }
          
          .invoice-meta {
            display: flex;
            justify-content: space-between;
            margin-bottom: 25px;
          }
          .meta-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px 20px;
          }
          .meta-label { font-size: 10px; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; }
          .meta-value { font-size: 16px; font-weight: bold; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
          .info-box {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px;
          }
          .info-title { 
            font-size: 11px; 
            font-weight: bold; 
            text-transform: uppercase; 
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; }
          .info-label { color: rgba(255,255,255,0.6); }
          .info-value { font-weight: 500; }
          
          .charges-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .charges-table th {
            background: rgba(255,255,255,0.1);
            padding: 12px 15px;
            text-align: left;
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid rgba(255,255,255,0.2);
          }
          .charges-table th:last-child { text-align: right; }
          .charges-table td {
            padding: 12px 15px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
          .charges-table .item-desc { }
          .charges-table .item-amount { text-align: right; font-weight: 500; }
          
          .totals-section {
            display: flex;
            justify-content: flex-end;
            margin-bottom: 25px;
          }
          .totals-box {
            width: 280px;
            background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 10px;
            padding: 15px 20px;
          }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.grand-total { 
            border-top: 2px solid rgba(255,255,255,0.3); 
            margin-top: 10px; 
            padding-top: 15px;
            font-size: 16px;
            font-weight: bold;
          }
          
          .bank-details {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.15);
            border-radius: 10px;
            padding: 15px;
            margin-bottom: 25px;
          }
          .bank-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 10px; }
          
          .footer {
            margin-top: auto;
            padding-top: 20px;
            border-top: 1px solid rgba(255,255,255,0.2);
            text-align: center;
            font-size: 9px;
            color: rgba(255,255,255,0.5);
          }
        </style>
    </head>
    <body>
        <div class="header">
            <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" class="logo" alt="SilberArrows">
            <div class="title-section">
                <div class="title">INVOICE</div>
                <div class="subtitle">SilberArrows Used Vehicles</div>
            </div>
        </div>

        <div class="invoice-meta">
            <div class="meta-box">
                <div class="meta-label">Invoice Number</div>
                <div class="meta-value">${data.invoiceNumber}</div>
            </div>
            <div class="meta-box">
                <div class="meta-label">Invoice Date</div>
                <div class="meta-value">${formatDate(data.invoiceDate)}</div>
            </div>
        </div>

        <div class="info-grid">
            <div class="info-box">
                <div class="info-title">Bill To</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.customerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Phone:</span>
                    <span class="info-value">${data.customerPhone}</span>
                </div>
                ${data.customerEmail ? `
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.customerEmail}</span>
                </div>` : ''}
                ${data.customerIdType && data.customerIdNumber ? `
                <div class="info-row">
                    <span class="info-label">${data.customerIdType}:</span>
                    <span class="info-value">${data.customerIdNumber}</span>
                </div>` : ''}
            </div>
            <div class="info-box">
                <div class="info-title">Vehicle Details</div>
                <div class="info-row">
                    <span class="info-label">Vehicle:</span>
                    <span class="info-value">${data.vehicleInfo}</span>
                </div>
                ${data.vehicleYear ? `
                <div class="info-row">
                    <span class="info-label">Year:</span>
                    <span class="info-value">${data.vehicleYear}</span>
                </div>` : ''}
                ${data.vehicleColour ? `
                <div class="info-row">
                    <span class="info-label">Colour:</span>
                    <span class="info-value">${data.vehicleColour}</span>
                </div>` : ''}
                ${data.chassisNumber ? `
                <div class="info-row">
                    <span class="info-label">Chassis:</span>
                    <span class="info-value">${data.chassisNumber}</span>
                </div>` : ''}
                ${data.stockNumber ? `
                <div class="info-row">
                    <span class="info-label">Stock #:</span>
                    <span class="info-value">${data.stockNumber}</span>
                </div>` : ''}
            </div>
        </div>

        <table class="charges-table">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${chargeRows}
            </tbody>
        </table>

        <div class="totals-section">
            <div class="totals-box">
                <div class="total-row grand-total">
                    <span>TOTAL DUE</span>
                    <span>${formatCurrency(data.invoiceTotal)} AED</span>
                </div>
            </div>
        </div>

        <div class="bank-details">
            <div class="info-title">Bank Details for Payment</div>
            <div class="bank-row">
                <span class="info-label">Bank Name:</span>
                <span class="info-value">Emirates NBD</span>
            </div>
            <div class="bank-row">
                <span class="info-label">Account Name:</span>
                <span class="info-value">SilberArrows Auto Trading LLC</span>
            </div>
            <div class="bank-row">
                <span class="info-label">Account Number:</span>
                <span class="info-value">1015555555501</span>
            </div>
            <div class="bank-row">
                <span class="info-label">IBAN:</span>
                <span class="info-value">AE123456789012345678901</span>
            </div>
        </div>

        <div class="footer">
            Al Manara St., Al Quoz 1, Dubai, UAE, P.O. Box 185095<br>
            TRN: 100281137800003 | Tel: +971 4 380 5515<br>
            sales@silberarrows.com | www.silberarrows.com<br><br>
            Payment is due upon receipt. This invoice is valid for 30 days from the date of issue.
        </div>
    </body>
    </html>
  `;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deal_id } = body;

    if (!deal_id) {
      return NextResponse.json({ error: 'deal_id is required' }, { status: 400 });
    }

    // Check for existing ACTIVE invoice in uv_invoices table
    const { data: existingInvoice } = await supabase
      .from('uv_invoices')
      .select('id, invoice_number, invoice_url')
      .eq('deal_id', deal_id)
      .eq('status', 'active')
      .maybeSingle();

    // If active invoice exists, return it
    if (existingInvoice?.invoice_number && existingInvoice?.invoice_url) {
      return NextResponse.json({ 
        success: true, 
        pdfUrl: existingInvoice.invoice_url,
        invoiceNumber: existingInvoice.invoice_number,
        invoiceId: existingInvoice.id,
        existing: true
      });
    }

    // Get deal summary for PDF content
    const { data: deal, error: dealError } = await supabase
      .from('uv_deal_summary')
      .select('*')
      .eq('id', deal_id)
      .single();

    if (dealError || !deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 });
    }

    // Get charges
    const { data: charges, error: chargesError } = await supabase
      .from('uv_charges')
      .select('*')
      .eq('deal_id', deal_id)
      .order('created_at', { ascending: true });

    if (chargesError) throw chargesError;

    if (!charges || charges.length === 0) {
      return NextResponse.json({ error: 'No charges found for this deal. Add charges before generating invoice.' }, { status: 400 });
    }

    // Generate invoice number using the 'invoice' sequence (gapless)
    const { data: invoiceNumber, error: seqError } = await supabase.rpc('get_next_uv_document_number', {
      p_document_type: 'invoice'
    });

    if (seqError) throw seqError;

    // Build HTML with the NEW invoice number
    const htmlContent = buildInvoiceHtml({
      invoiceNumber: invoiceNumber,
      invoiceDate: new Date().toISOString(), // Invoice date is NOW, not deal creation date
      customerName: deal.customer_name,
      customerPhone: deal.customer_phone,
      customerEmail: deal.customer_email,
      customerIdType: deal.customer_id_type,
      customerIdNumber: deal.customer_id_number,
      vehicleInfo: deal.vehicle_model || 'Vehicle',
      vehicleYear: deal.vehicle_year,
      vehicleColour: deal.vehicle_colour,
      chassisNumber: deal.vehicle_chassis,
      stockNumber: deal.vehicle_stock_number,
      charges: charges,
      invoiceTotal: deal.invoice_total || 0
    });

    // Generate PDF
    const pdfResp = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
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
    });

    if (!pdfResp.ok) {
      const errText = await pdfResp.text();
      throw new Error(`PDFShift error: ${pdfResp.status} - ${errText}`);
    }

    const pdfBuffer = await pdfResp.arrayBuffer();

    // Upload to Supabase
    const fileName = `${invoiceNumber}_${Date.now()}.pdf`;
    const filePath = `uv-invoices/${fileName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(filePath, Buffer.from(pdfBuffer), {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl(filePath);

    const pdfUrl = urlData.publicUrl;

    // Calculate invoice total from charges
    const invoiceTotal = charges.reduce((sum, c) => sum + Number(c.amount), 0);

    // Create invoice record in uv_invoices table
    const { data: newInvoice, error: invoiceError } = await supabase
      .from('uv_invoices')
      .insert({
        deal_id: deal_id,
        invoice_number: invoiceNumber,
        invoice_url: pdfUrl,
        total_amount: invoiceTotal,
        status: 'active'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // Also update deal for backward compatibility
    await supabase
      .from('uv_deals')
      .update({ 
        invoice_number: invoiceNumber,
        invoice_url: pdfUrl
      })
      .eq('id', deal_id);

    return NextResponse.json({ 
      success: true, 
      pdfUrl,
      invoiceNumber,
      invoiceId: newInvoice.id,
      existing: false
    });

  } catch (error: any) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

