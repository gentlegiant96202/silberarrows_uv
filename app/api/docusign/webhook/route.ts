import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// Generate JWT for DocuSign authentication (same as send-for-signing)
function generateJWT() {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: process.env.DOCUSIGN_USER_ID,
    aud: 'account.docusign.com', // For production environment
    iat: now,
    exp: now + 3600, // 1 hour
    scope: 'signature impersonation'
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${base64Header}.${base64Payload}`;
  
  // Sign with RSA private key
  const crypto = require('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  // Get RSA key and ensure proper formatting
  let rsaKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
  
  // If using base64 encoded key, decode it
  if (!rsaKey && process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64) {
    rsaKey = Buffer.from(process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64, 'base64').toString();
  }
  
  // If key doesn't have line breaks, add them back for proper RSA format
  if (rsaKey && !rsaKey.includes('\n')) {
    // Add line breaks every 64 characters (standard RSA format)
    const keyBody = rsaKey.replace('-----BEGIN RSA PRIVATE KEY-----', '').replace('-----END RSA PRIVATE KEY-----', '');
    const formattedKeyBody = keyBody.match(/.{1,64}/g)?.join('\n') || keyBody;
    rsaKey = `-----BEGIN RSA PRIVATE KEY-----\n${formattedKeyBody}\n-----END RSA PRIVATE KEY-----`;
  }
  
  const signature = signer.sign(rsaKey, 'base64url');
  
  return `${signatureInput}.${signature}`;
}

// Get access token using JWT
async function getAccessToken() {
  const jwt = generateJWT();
  
  const response = await fetch(`https://account.docusign.com/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DocuSign authentication failed: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Download signed PDF from DocuSign using REST API
async function downloadSignedPDF(envelopeId: string) {
  try {
    const accessToken = await getAccessToken();

    // Get the signed document
    const response = await fetch(
      `${process.env.DOCUSIGN_BASE_URL}/restapi/v2.1/accounts/${process.env.DOCUSIGN_ACCOUNT_ID}/envelopes/${envelopeId}/documents/1`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to download signed PDF: ${response.statusText}`);
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error('Failed to download signed PDF:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📧 DocuSign webhook received');
    
    // Get the raw body first to check content type
    const rawBody = await request.text();
    console.log('📋 Raw webhook body preview:', rawBody.substring(0, 100) + '...');
    
    let body: any;
    let envelopeId: string | null = null;
    let envelopeStatus: string | null = null;
    let recipientStatus: any[] = [];

    // Handle both JSON and XML webhook formats
    if (rawBody.startsWith('<?xml')) {
      console.log('📄 Processing XML webhook format');
      
      // Parse XML to extract envelope info
      // Look for envelope ID and status in XML
      const envelopeIdMatch = rawBody.match(/<EnvelopeID>(.*?)<\/EnvelopeID>/i);
      const statusMatch = rawBody.match(/<Status>(.*?)<\/Status>/i);
      
      envelopeId = envelopeIdMatch?.[1] || null;
      envelopeStatus = statusMatch?.[1] || null;
      
      console.log('📋 Extracted from XML:', { envelopeId, envelopeStatus });
    } else {
      console.log('📄 Processing JSON webhook format');
      body = JSON.parse(rawBody);
      console.log('📋 Webhook data:', JSON.stringify(body, null, 2));

      // Extract envelope information from JSON
      envelopeId = body.data?.envelopeId || body.envelopeId;
      envelopeStatus = body.data?.envelopeSummary?.status || body.status;
      recipientStatus = body.data?.envelopeSummary?.recipients?.signers || [];
      
      console.log('📋 Recipient status:', recipientStatus);
    }

    if (!envelopeId) {
      console.error('❌ No envelope ID in webhook');
      return NextResponse.json({ error: 'No envelope ID' }, { status: 400 });
    }

    console.log(`📄 Envelope ${envelopeId} status: ${envelopeStatus}`);

    // Determine signing status based on recipient completion
    let customStatus = envelopeStatus?.toLowerCase();
    
    // Check if only company has signed (for vehicle documents)
    if (recipientStatus && recipientStatus.length >= 2) {
      const companySigner = recipientStatus.find(r => r.routingOrder === '1' || r.routingOrder === 1);
      const customerSigner = recipientStatus.find(r => r.routingOrder === '2' || r.routingOrder === 2);
      
      console.log('📋 Signer status check:', {
        companyStatus: companySigner?.status,
        customerStatus: customerSigner?.status,
        companyCompleted: companySigner?.status?.toLowerCase() === 'completed',
        customerCompleted: customerSigner?.status?.toLowerCase() === 'completed'
      });
      
      // If company completed but customer hasn't
      if (companySigner?.status?.toLowerCase() === 'completed' && 
          customerSigner?.status?.toLowerCase() !== 'completed') {
        customStatus = 'company_signed';
        console.log('🟠 Company signature completed, waiting for customer');
      }
    }

    // Only download PDF when fully completed (all signers)
    if (envelopeStatus?.toLowerCase() !== 'completed') {
      console.log(`⏳ Envelope not fully completed yet (${envelopeStatus}), updating status to: ${customStatus}`);
      
      // Update status in both car_media and vehicle_reservations tables
      const { error: updateError1 } = await supabase
        .from('car_media')
        .update({ 
          signing_status: customStatus
        })
        .eq('docusign_envelope_id', envelopeId);

      const { error: updateError2 } = await supabase
        .from('vehicle_reservations')
        .update({ 
          signing_status: customStatus
        })
        .eq('docusign_envelope_id', envelopeId);

      if (updateError1) {
        console.error('Failed to update car_media signing status:', updateError1);
      }
      if (updateError2) {
        console.error('Failed to update vehicle_reservations signing status:', updateError2);
      }

      return NextResponse.json({ success: true, message: 'Status updated' });
    }

    // Envelope is completed - replace with signed PDF
    console.log('✅ Envelope completed! Downloading signed PDF...');

    // Find the document in our database - check both tables
    let document: any = null;
    let documentType: 'consignment' | 'vehicle' = 'consignment';

    // First check car_media (consignment documents)
    const { data: consignmentDoc, error: consignmentError } = await supabase
      .from('car_media')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (consignmentDoc && !consignmentError) {
      document = consignmentDoc;
      documentType = 'consignment';
      console.log('📄 Found consignment document:', document.id);
    } else {
      // Check vehicle_reservations (invoice/reservation documents)
      const { data: vehicleDoc, error: vehicleError } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('docusign_envelope_id', envelopeId)
        .single();

      if (vehicleDoc && !vehicleError) {
        document = vehicleDoc;
        documentType = 'vehicle';
        console.log('📄 Found vehicle document:', document.id, document.document_type);
      }
    }

    if (!document) {
      console.error('❌ Document not found in database');
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Download the signed PDF from DocuSign
    const signedPdfBuffer = await downloadSignedPDF(envelopeId);
    
    if (documentType === 'consignment') {
      // Handle consignment documents (existing logic)
      console.log('📄 Processing consignment document');
      const originalPath = document.url.split('/').pop(); // Get filename from URL
      const signedPath = `${document.car_id}/signed-${originalPath}`;
      
      const { error: uploadError } = await supabase.storage
        .from('car-media')
        .upload(signedPath, signedPdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true, // Allow overwrite
        });

      if (uploadError) {
        console.error('❌ Failed to upload signed PDF:', uploadError);
        throw uploadError;
      }

      // Get the new signed PDF URL
      const { data: urlData } = supabase.storage
        .from('car-media')
        .getPublicUrl(signedPath);

      // Update the database record with signed PDF
      const { error: updateError } = await supabase
        .from('car_media')
        .update({
          url: urlData.publicUrl,
          filename: `signed-${document.filename}`,
          signing_status: 'completed',
          signed_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (updateError) {
        console.error('❌ Failed to update consignment document:', updateError);
        throw updateError;
      }

      console.log('✅ Consignment document updated with signed PDF');
      
    } else {
      // Handle vehicle documents (reservations/invoices)
      console.log('📄 Processing vehicle document:', document.document_type);
      const fileName = `${document.document_type}-${document.id}-signed-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, signedPdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('❌ Failed to upload signed vehicle PDF:', uploadError);
        throw uploadError;
      }

      // Get the new signed PDF URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update the vehicle_reservations record with signed PDF (preserve separate columns)
      // First get the current document type to determine which column to update
      const { data: currentDoc } = await supabase
        .from('vehicle_reservations')
        .select('document_type')
        .eq('id', document.id)
        .single();

      console.log('📄 Document type for signed PDF update:', currentDoc?.document_type);

      // Update appropriate column based on document type, preserving original PDFs
      const updateData = currentDoc?.document_type === 'reservation' 
        ? {
            pdf_url: urlData.publicUrl,           // Legacy column for compatibility
            reservation_pdf_url: urlData.publicUrl, // Signed reservation PDF
            signed_pdf_url: urlData.publicUrl,    // Reference to signed version
            signing_status: 'completed',
            completed_at: new Date().toISOString()
          }
        : {
            pdf_url: urlData.publicUrl,           // Legacy column for compatibility  
            invoice_pdf_url: urlData.publicUrl,   // Signed invoice PDF
            signed_pdf_url: urlData.publicUrl,    // Reference to signed version
            signing_status: 'completed',
            completed_at: new Date().toISOString()
          };

      console.log('💾 Updating vehicle_reservations with signed PDF:', updateData);

      const { error: updateError } = await supabase
        .from('vehicle_reservations')
        .update(updateData)
        .eq('id', document.id);

      if (updateError) {
        console.error('❌ Failed to update vehicle document:', updateError);
        throw updateError;
      }

      console.log('✅ Vehicle document updated with signed PDF');
    }

    console.log('🎉 Successfully processed signed document!');

    return NextResponse.json({ 
      success: true, 
      message: 'Signed PDF downloaded and replaced successfully' 
    });

  } catch (error) {
    console.error('❌ DocuSign webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}