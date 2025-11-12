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
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the raw body first to check content type
    const rawBody = await request.text();
    let body: any;
    let envelopeId: string | null = null;
    let envelopeStatus: string | null = null;
    let recipientStatus: any[] = [];

    // Handle both JSON and XML webhook formats
    if (rawBody.startsWith('<?xml')) {
      // Parse XML to extract envelope info
      // Look for envelope ID and status in XML
      const envelopeIdMatch = rawBody.match(/<EnvelopeID>(.*?)<\/EnvelopeID>/i);
      const statusMatch = rawBody.match(/<Status>(.*?)<\/Status>/i);
      
      envelopeId = envelopeIdMatch?.[1] || null;
      envelopeStatus = statusMatch?.[1] || null;
    } else {
      body = JSON.parse(rawBody);
      // Extract envelope information from JSON
      envelopeId = body.data?.envelopeId || body.envelopeId;
      envelopeStatus = body.data?.envelopeSummary?.status || body.status;
      recipientStatus = body.data?.envelopeSummary?.recipients?.signers || [];
    }

    if (!envelopeId) {
      return NextResponse.json({ error: 'No envelope ID' }, { status: 400 });
    }
    // Determine signing status based on recipient completion
    let customStatus = envelopeStatus?.toLowerCase();
    
    // Check if only company has signed (for vehicle documents)
    if (recipientStatus && recipientStatus.length >= 2) {
      const companySigner = recipientStatus.find(r => r.routingOrder === '1' || r.routingOrder === 1);
      const customerSigner = recipientStatus.find(r => r.routingOrder === '2' || r.routingOrder === 2);
      // If company completed but customer hasn't
      if (companySigner?.status?.toLowerCase() === 'completed' && 
          customerSigner?.status?.toLowerCase() !== 'completed') {
        customStatus = 'company_signed';
      }
    }

    // Only download PDF when fully completed (all signers)
    if (envelopeStatus?.toLowerCase() !== 'completed') {
      // Update status in car_media, vehicle_reservations, service_contracts, warranty_contracts
      const updates = await Promise.allSettled([
        supabase.from('car_media').update({ signing_status: customStatus }).eq('docusign_envelope_id', envelopeId),
        supabase.from('vehicle_reservations').update({ signing_status: customStatus }).eq('docusign_envelope_id', envelopeId),
        supabase.from('service_contracts').update({ signing_status: customStatus }).eq('docusign_envelope_id', envelopeId),
        supabase.from('warranty_contracts').update({ signing_status: customStatus }).eq('docusign_envelope_id', envelopeId),
      ]);

      updates.forEach((res, idx) => {
        if (res.status === 'rejected') {
        }
      });

      return NextResponse.json({ success: true, message: 'Status updated' });
    }

    // Envelope is completed - replace with signed PDF
    // Find the document in our database - check car_media, vehicle_reservations, then service/warranty contracts
    let document: any = null;
    let documentType: 'consignment' | 'vehicle' | 'service' | 'warranty' | null = null;

    // First check car_media (consignment documents)
    const { data: consignmentDoc } = await supabase
      .from('car_media')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (consignmentDoc) {
      document = consignmentDoc;
      documentType = 'consignment';
    }

    if (!document) {
      const { data: vehicleDoc } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('docusign_envelope_id', envelopeId)
        .single();
      if (vehicleDoc) {
        document = vehicleDoc;
        documentType = 'vehicle';
      }
    }

    if (!document) {
      const { data: serviceDoc } = await supabase
        .from('service_contracts')
        .select('*')
        .eq('docusign_envelope_id', envelopeId)
        .single();
      if (serviceDoc) {
        document = serviceDoc;
        documentType = 'service';
      }
    }

    if (!document) {
      const { data: warrantyDoc } = await supabase
        .from('warranty_contracts')
        .select('*')
        .eq('docusign_envelope_id', envelopeId)
        .single();
      if (warrantyDoc) {
        document = warrantyDoc;
        documentType = 'warranty';
      }
    }

    if (!document || !documentType) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Download the signed PDF from DocuSign
    const signedPdfBuffer = await downloadSignedPDF(envelopeId);
    
    if (documentType === 'consignment') {
      // Handle consignment documents (existing logic)
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
        throw updateError;
      }
    } else if (documentType === 'vehicle') {
      // Handle vehicle documents (reservations/invoices)
      const fileName = `${document.document_type}-${document.id}-signed-${Date.now()}.pdf`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, signedPdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get the new signed PDF URL
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      // Update vehicle_reservations record with signed PDF
      const updateData = document.document_type === 'reservation' 
        ? {
            pdf_url: urlData.publicUrl,
            reservation_pdf_url: urlData.publicUrl,
            signed_pdf_url: urlData.publicUrl,
            signing_status: 'completed',
            completed_at: new Date().toISOString()
          }
        : {
            pdf_url: urlData.publicUrl,
            invoice_pdf_url: urlData.publicUrl,
            signed_pdf_url: urlData.publicUrl,
            signing_status: 'completed',
            completed_at: new Date().toISOString()
          };
      const { error: updateError } = await supabase
        .from('vehicle_reservations')
        .update(updateData)
        .eq('id', document.id);

      if (updateError) {
        throw updateError;
      }
    } else if (documentType === 'service' || documentType === 'warranty') {
      // Handle service and warranty contracts
      const fileName = `${documentType}_contract_${document.id}_signed_${Date.now()}.pdf`;
      const bucket = 'service-documents';
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, signedPdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      const tableName = documentType === 'service' ? 'service_contracts' : 'warranty_contracts';
      const { error: updateError } = await supabase
        .from(tableName)
        .update({
          pdf_url: urlData.publicUrl,
          signed_pdf_url: urlData.publicUrl,
          signing_status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', document.id);

      if (updateError) {
        throw updateError;
      }
    }
    return NextResponse.json({ 
      success: true, 
      message: 'Signed PDF downloaded and replaced successfully' 
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}