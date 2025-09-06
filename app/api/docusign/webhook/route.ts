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
    
    const body = await request.json();
    console.log('📋 Webhook data:', JSON.stringify(body, null, 2));

    // Extract envelope information
    const envelopeId = body.data?.envelopeId || body.envelopeId;
    const envelopeStatus = body.data?.envelopeSummary?.status || body.status;

    if (!envelopeId) {
      console.error('❌ No envelope ID in webhook');
      return NextResponse.json({ error: 'No envelope ID' }, { status: 400 });
    }

    console.log(`📄 Envelope ${envelopeId} status: ${envelopeStatus}`);

    // Only process completed envelopes
    if (envelopeStatus !== 'completed') {
      console.log(`⏳ Envelope not completed yet (${envelopeStatus}), skipping PDF replacement`);
      
      // Update status in database
      const { error: updateError } = await supabase
        .from('car_media')
        .update({ 
          signing_status: envelopeStatus
        })
        .eq('docusign_envelope_id', envelopeId);

      if (updateError) {
        console.error('Failed to update signing status:', updateError);
      }

      return NextResponse.json({ success: true, message: 'Status updated' });
    }

    // Envelope is completed - replace with signed PDF
    console.log('✅ Envelope completed! Downloading signed PDF...');

    // Find the document in our database
    const { data: document, error: docError } = await supabase
      .from('car_media')
      .select('*')
      .eq('docusign_envelope_id', envelopeId)
      .single();

    if (docError || !document) {
      console.error('❌ Document not found in database:', docError);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Download the signed PDF from DocuSign
    const signedPdfBuffer = await downloadSignedPDF(envelopeId);
    
    // Upload the signed PDF to replace the unsigned one
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
      console.error('❌ Failed to update document with signed PDF:', updateError);
      throw updateError;
    }

    console.log('🎉 Successfully replaced unsigned PDF with signed version!');

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