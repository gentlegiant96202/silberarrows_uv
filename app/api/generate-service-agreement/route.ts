import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  console.log('🚀 SERVICE AGREEMENT API CALLED');
  
  try {
    const data = await request.json();
    const skipDatabase = data.skipDatabase || false; // New flag to skip database operations
    console.log('📝 Contract data received:', { referenceNo: data.referenceNo, ownerName: data.ownerName, skipDatabase });
    
    // Format dates to DD/MM/YYYY
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

    // Get service type display text and amount
    const serviceTypeDisplay = (data.serviceType === 'premium') ? 'PREMIUM' : 'STANDARD';
    const amount = data.invoiceAmount || '0.00';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ServiceCare Prepaid Receipt - ${data.referenceNo}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
            color: white;
            min-height: 100vh;
            padding: 30px 60px;
            line-height: 1.4;
          }
          
          @page {
            margin: 0;
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
          }
          
          html, body {
            background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 50%, #000000 100%);
            margin: 0;
            padding: 0;
          }
          
          .content-container {
            page-break-inside: avoid;
            padding: 20px 40px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            min-height: calc(100vh - 60px);
            margin: auto 0;
          }
          
          .content-container {
            max-width: 1400px;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            margin-bottom: 20px;
            padding: 16px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            position: relative;
            z-index: 2;
          }
          
          .main-title {
            font-size: 32px;
            font-weight: bold;
            color: white;
            text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7);
            letter-spacing: 2px;
            margin-bottom: 4px;
          }
          
          .sub-title {
            font-size: 18px;
            font-weight: bold;
            color: rgba(255, 255, 255, 0.9);
            letter-spacing: 1px;
            margin-bottom: 16px;
          }
          
          .logo {
            width: 60px;
            height: auto;
            filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4)) brightness(1.1);
            margin: 0 auto 8px auto;
          }
          
          .section {
            margin-bottom: 16px;
            background: rgba(255, 255, 255, 0.03);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 14px 18px;
            position: relative;
            width: 100%;
            box-sizing: border-box;
          }
          
          .section-title {
            font-size: 14px;
            font-weight: bold;
            margin-bottom: 12px;
            color: white;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.15);
            padding-bottom: 6px;
          }
          
          .info-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            align-items: center;
          }
          
          .info-label {
            font-weight: bold;
            color: rgba(255, 255, 255, 0.8);
            font-size: 11px;
            min-width: 80px;
          }
          
          .info-value {
            color: white;
            font-size: 11px;
            flex: 1;
            margin-left: 16px;
          }
          
          .product-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 12px 0;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 6px;
            overflow: hidden;
          }
          
          .product-table th {
            background: rgba(255, 255, 255, 0.08);
            padding: 10px 12px;
            text-align: left;
            font-weight: bold;
            color: white;
            font-size: 11px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .product-table td {
            padding: 10px 12px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            color: white;
            font-size: 11px;
          }
          
          .product-table .total-row {
            background: rgba(255, 255, 255, 0.05);
            font-weight: bold;
          }
          
          .message-section {
            background: rgba(255, 255, 255, 0.04);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 18px;
            margin: 20px 0;
            color: rgba(255, 255, 255, 0.9);
            line-height: 1.6;
            font-size: 11px;
            text-align: justify;
          }
          
          .signature-section {
            margin-top: auto;
            padding-top: 20px;
          }
          
          .signature-text {
            color: rgba(255, 255, 255, 0.8);
            font-size: 11px;
            margin-bottom: 12px;
          }
          
          .signature-box {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          
          .signature-line {
            border-top: 1px solid rgba(255, 255, 255, 0.4);
            margin-top: 30px;
            width: 200px;
          }
          
          .footer {
            margin-top: auto;
            text-align: center;
            font-size: 10px;
            border-top: 1px solid rgba(255, 255, 255, 0.15);
            padding: 16px 8px 8px 8px;
            color: rgba(255, 255, 255, 0.7);
            line-height: 1.4;
          }
          
          .brand-signature {
            text-align: right;
            font-style: italic;
            color: rgba(255, 255, 255, 0.8);
            font-size: 12px;
            margin: 16px 0;
          }
        </style>
    </head>
    <body>
        <div class="content-container">
            <!-- Header -->
            <div class="header">
                <img src="https://res.cloudinary.com/dw0ciqgwd/image/upload/v1748497977/qgdbuhm5lpnxuggmltts.png" alt="SilberArrows Logo" class="logo">
                <div class="main-title">SERVICECARE</div>
                <div class="sub-title">PREPAID RECEIPT</div>
            </div>

            <!-- Owner Information -->
            <div class="section">
                <div class="section-title">Owner Information</div>
                <div class="info-row">
                    <span class="info-label">Name:</span>
                    <span class="info-value">${data.ownerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Date:</span>
                    <span class="info-value">${currentDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Mobile No.:</span>
                    <span class="info-value">${data.mobileNo}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Email:</span>
                    <span class="info-value">${data.email}</span>
                </div>
            </div>

            <!-- Vehicle Information -->
            <div class="section">
                <div class="section-title">Vehicle Information</div>
                <div class="info-row">
                    <span class="info-label">Chassis No.:</span>
                    <span class="info-value">${data.vin}</span>
                </div>
            </div>

            <!-- Product Details -->
            <div class="section">
                <div class="section-title">Product Details</div>
                <table class="product-table">
                    <thead>
                        <tr>
                            <th>Description</th>
                            <th>Cover Type</th>
                            <th style="text-align: right;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>ServiceCare</td>
                            <td>${serviceTypeDisplay}</td>
                            <td style="text-align: right;">AED ${amount}</td>
                        </tr>
                        <tr class="total-row">
                            <td colspan="2"><strong>Total</strong></td>
                            <td style="text-align: right;"><strong>AED ${amount}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Thank You Message -->
            <div class="message-section">
                <p><strong>Thank you for purchasing the SilberArrows ServiceCare contract.</strong></p>
                <p>You've made a smart choice – your Mercedes-Benz will now receive expert servicing using genuine parts, all at a preferred rate.</p>
                <br>
                <p>This commitment not only brings peace of mind and convenience, but also helps protect the long-term value of your vehicle.</p>
                <br>
                <p>You'll be able to view the full scope of coverage by scanning the QR code on your ServiceCare card, which will be issued separately.</p>
                <br>
                <p>We appreciate your trust in SilberArrows and look forward to keeping your drive smooth, safe, and hassle-free.</p>
            </div>

            <div class="brand-signature">~ SilberArrows</div>

            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-text">This document confirms receipt of payment.</div>
                <div class="signature-box">
                    <div>
                        <strong>Signed by:</strong><br>
                        SilberArrows
                    </div>
                    <div>
                        <strong>Date:</strong> ${currentDate}
                        <div class="signature-line"></div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                Tel: +971 4 380 5515 | service@silberarrows.com | www.silberarrows.com
            </div>
        </div>
    </body>
    </html>
    `;

    console.log('📄 HTML content generated, calling PDFShift API...');

    // Call PDFShift API with corrected parameters
    const pdfResponse = await fetch('https://api.pdfshift.io/v3/convert/pdf', {
      method: 'POST',
      headers: {
        'X-API-Key': process.env.PDFSHIFT_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: htmlContent,
        landscape: false,
        use_print: false,
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
          right: '0.5in'
        }
      }),
    });

    console.log('📊 PDFShift API response status:', pdfResponse.status);

    if (!pdfResponse.ok) {
      const errorText = await pdfResponse.text();
      console.error('❌ PDFShift API error:', errorText);
      throw new Error(`PDFShift API error: ${pdfResponse.status} - ${errorText}`);
    }

    const pdfBuffer = await pdfResponse.arrayBuffer();
    console.log('✅ PDF generated successfully, size:', pdfBuffer.byteLength, 'bytes');

    // Save contract data to database first (skip if this is PDF-only generation)
    let contractData = null;
    if (!skipDatabase) {
      try {
        console.log('💾 Saving contract to database...');
        
        const { data: dbData, error: dbError } = await supabaseAdmin
          .from('service_contracts')
          .insert({
            reference_no: data.referenceNo,
            owner_name: data.ownerName,
            mobile_no: data.mobileNo,
            email: data.email,
            dealer_name: data.dealerName,
            dealer_phone: data.dealerPhone,
            dealer_email: data.dealerEmail,
            vin: data.vin,
            make: data.make,
            model: data.model,
            model_year: data.modelYear,
            current_odometer: data.currentOdometer,
            start_date: data.startDate,
            end_date: data.endDate,
            cut_off_km: data.cutOffKm,
            status: 'active'
          })
          .select()
          .single();

        if (dbError) {
          console.error('❌ Database error:', dbError);
          throw new Error('Failed to save contract to database');
        }

        contractData = dbData;
        console.log('✅ Contract saved to database successfully, ID:', contractData.id);

      } catch (dbError) {
        console.error('❌ Failed to save contract to database:', dbError);
        throw new Error('Failed to save contract to database');
      }
    } else {
      console.log('⏭️ Skipping database operations (PDF-only generation)');
    }

    // Upload PDF to Supabase storage (skip if this is PDF-only generation)
    let pdfUrl = null;
    if (!skipDatabase && contractData) {
      try {
        const fileName = `ServiceCare_Agreement_${data.referenceNo}_${Date.now()}.pdf`;
        const filePath = `service-contracts/${fileName}`;

        console.log('☁️ Uploading PDF to storage bucket: service-documents');
        console.log('📁 File path:', filePath);
        console.log('📄 PDF size:', pdfBuffer.byteLength, 'bytes');

        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('service-documents')
          .upload(filePath, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (uploadError) {
          console.error('❌ Storage upload error:', uploadError);
          console.error('🔍 Error details:', JSON.stringify(uploadError, null, 2));
          
          // Check if bucket exists
          if (uploadError.message?.includes('Bucket not found') || uploadError.message?.includes('bucket does not exist')) {
            console.error('❌ STORAGE BUCKET MISSING: Please create "service-documents" bucket in Supabase Dashboard');
            console.error('📋 Instructions: Go to Supabase Dashboard → Storage → Create Bucket → Name: "service-documents" → Public: YES');
          }
          
          // Continue without failing - PDF will still download
          console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
        } else {
          console.log('✅ PDF uploaded successfully:', uploadData);
          
          // Get public URL for the uploaded file
          const { data: urlData } = supabaseAdmin.storage
            .from('service-documents')
            .getPublicUrl(filePath);
          
          pdfUrl = urlData.publicUrl;
          console.log('🔗 PDF public URL generated:', pdfUrl);

          // Update contract record with PDF URL
          console.log('💾 Updating contract with PDF URL...');
          const { error: updateError } = await supabaseAdmin
            .from('service_contracts')
            .update({ pdf_url: pdfUrl })
            .eq('id', contractData.id);

          if (updateError) {
            console.error('❌ Failed to update contract with PDF URL:', updateError);
          } else {
            console.log('✅ Contract updated with PDF URL successfully');
          }
        }
      } catch (storageError) {
        console.error('❌ Failed to upload PDF to storage:', storageError);
        console.log('⚠️ PDF will be downloaded locally but not stored in cloud');
      }
    } else {
      console.log('⏭️ Skipping storage upload (PDF-only generation)');
    }

    // Log contract creation activity (skip if this is PDF-only generation)
    if (!skipDatabase && contractData) {
      try {
        console.log('📝 Logging contract activity...');
        await supabaseAdmin
          .from('contract_activities')
          .insert({
            contract_id: contractData.id,
            contract_type: 'service',
            activity_type: 'created',
            activity_description: `ServiceCare agreement ${data.referenceNo} created for ${data.ownerName}`,
            activity_data: {
              reference_no: data.referenceNo,
              vehicle: `${data.make} ${data.model} (${data.modelYear})`,
              vin: data.vin,
              pdf_url: pdfUrl
            }
          });
        console.log('✅ Activity logged successfully');
      } catch (activityError) {
        console.error('❌ Failed to log activity:', activityError);
        // Continue without failing
      }
    } else {
      console.log('⏭️ Skipping activity logging (PDF-only generation)');
    }

    console.log('🎉 SERVICE AGREEMENT PROCESS COMPLETED');
    console.log('📊 Final status: PDF URL =', pdfUrl ? 'SAVED TO CLOUD' : 'LOCAL DOWNLOAD ONLY');

    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="ServiceCare_Receipt_${data.referenceNo}.pdf"`,
      },
    });

  } catch (error) {
    console.error('💥 Error generating ServiceCare Agreement PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate ServiceCare Agreement PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 