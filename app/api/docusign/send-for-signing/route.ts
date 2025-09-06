import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import { createHash } from 'crypto';

// Generate JWT for DocuSign authentication
function generateJWT() {
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: process.env.DOCUSIGN_INTEGRATION_KEY,
    sub: process.env.DOCUSIGN_USER_ID,
    aud: process.env.NODE_ENV === 'production' ? 'account.docusign.com' : 'account-d.docusign.com', // Environment-based
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
  // Get RSA key - try multiple sources and formats
  let rsaKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
  
  // If no direct key, try base64 encoded version
  if (!rsaKey && process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64) {
    try {
      rsaKey = Buffer.from(process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64, 'base64').toString();
    } catch (error) {
      console.error('Failed to decode base64 RSA key:', error);
    }
  }
  
  // Ensure proper RSA key format with line breaks
  if (rsaKey) {
    // Clean the key - remove all whitespace and line breaks
    let cleanKey = rsaKey.replace(/\s/g, '');
    
    // Check if it has proper headers (with or without spaces)
    const hasBeginHeader = cleanKey.includes('-----BEGINRSAPRIVATEKEY-----') || cleanKey.includes('-----BEGIN');
    const hasEndHeader = cleanKey.includes('-----ENDRSAPRIVATEKEY-----') || cleanKey.includes('-----END');
    
    if (hasBeginHeader && hasEndHeader) {
      // Extract the key content (everything between BEGIN and END)
      const beginIndex = cleanKey.indexOf('-----BEGIN');
      const endIndex = cleanKey.lastIndexOf('-----END');
      
      if (beginIndex !== -1 && endIndex !== -1) {
        // Get the key content after BEGIN header
        const afterBegin = cleanKey.substring(beginIndex);
        const beforeEnd = afterBegin.substring(0, afterBegin.lastIndexOf('-----END'));
        
        // Extract just the base64 content
        const keyContent = beforeEnd.replace('-----BEGINRSAPRIVATEKEY-----', '');
        
        // Add proper line breaks every 64 characters
        const formattedContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
        
        // Reconstruct with proper headers and formatting
        rsaKey = `-----BEGIN RSA PRIVATE KEY-----\n${formattedContent}\n-----END RSA PRIVATE KEY-----`;
      }
    }
  }
  
  console.log('🔑 RSA Key Debug:', {
    hasKey: !!rsaKey,
    keyLength: rsaKey?.length || 0,
    hasBegin: rsaKey?.includes('-----BEGIN RSA PRIVATE KEY-----') || false,
    hasEnd: rsaKey?.includes('-----END RSA PRIVATE KEY-----') || false,
    hasLineBreaks: rsaKey?.includes('\n') || false
  });
  
  const signature = signer.sign(rsaKey, 'base64url');
  
  return `${signatureInput}.${signature}`;
}

// Get access token using OAuth 2.0 Client Credentials Grant
async function getAccessToken() {
  // For production, use OAuth 2.0 Client Credentials Grant
  if (process.env.NODE_ENV === 'production') {
    const response = await fetch('https://account.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.DOCUSIGN_INTEGRATION_KEY}:${process.env.DOCUSIGN_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        scope: 'signature impersonation'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OAuth 2.0 authentication failed:', error);
      throw new Error(`DocuSign OAuth authentication failed: ${error}`);
    }

    const data = await response.json();
    console.log('✅ OAuth 2.0 access token obtained');
    return data.access_token;
  } else {
    // For development, use JWT
    const jwt = generateJWT();
    
    const response = await fetch(`https://account-d.docusign.com/oauth/token`, {
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
}

export async function POST(request: NextRequest) {
  try {
    const { carId, documentId } = await request.json();

    if (!carId || !documentId) {
      return NextResponse.json(
        { error: 'Missing carId or documentId' },
        { status: 400 }
      );
    }

    console.log('📧 Sending consignment agreement for DocuSign signing...');

    // Get car and document details from database
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return NextResponse.json(
        { error: 'Car not found' },
        { status: 404 }
      );
    }

    const { data: document, error: docError } = await supabase
      .from('car_media')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Validate required customer info
    if (!car.customer_name || !car.customer_email) {
      return NextResponse.json(
        { error: 'Customer name and email are required for signing' },
        { status: 400 }
      );
    }

    // Get access token
    const accessToken = await getAccessToken();

    // Fetch the PDF content
    const pdfResponse = await fetch(document.url);
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    // Create envelope using REST API
    const envelopeData = {
      emailSubject: `SilberArrows Consignment Agreement - ${car.vehicle_model} (${car.stock_number}) - Requires Approval`,
      emailBlurb: `Consignment agreement for ${car.model_year} ${car.vehicle_model} (Stock: ${car.stock_number}). Company approval required first, then customer will be notified to sign.`,
      documents: [
        {
          documentId: '1',
          name: `Consignment Agreement - ${car.stock_number}`,
          fileExtension: 'pdf',
          documentBase64: pdfBase64
        }
      ],
      recipients: {
        signers: [
          {
            email: 'samuel.sanjeev@silberarrows.com',
            name: 'Samuel Sanjeev',
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '320',
                  tabLabel: 'SamuelSignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '360',
                  tabLabel: 'SamuelDate'
                }
              ]
            }
          },
          {
            email: 'nick.hurst@silberarrows.com',
            name: 'Nick Hurst',
            recipientId: '2',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '320',
                  tabLabel: 'NickSignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '360',
                  tabLabel: 'NickDate'
                }
              ]
            }
          },
          {
            email: 'glen.hawkins@silberarrows.com',
            name: 'Glen Hawkins',
            recipientId: '3',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '320',
                  tabLabel: 'GlenSignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '150',
                  yPosition: '360',
                  tabLabel: 'GlenDate'
                }
              ]
            }
          },
          {
            email: car.customer_email,
            name: car.customer_name,
            recipientId: '4',
            routingOrder: '2',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '400',
                  yPosition: '320',
                  tabLabel: 'CustomerSignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  pageNumber: '2',
                  xPosition: '400',
                  yPosition: '360',
                  tabLabel: 'CustomerDate'
                }
              ]
            }
          }
        ]
      },
      eventNotification: {
        url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/docusign/webhook`,
        loggingEnabled: 'true',
        requireAcknowledgment: 'true',
        envelopeEvents: [
          { envelopeEventStatusCode: 'completed' },
          { envelopeEventStatusCode: 'declined' },
          { envelopeEventStatusCode: 'voided' }
        ]
      },
      status: 'sent'
    };

    // Send envelope creation request
    const createResponse = await fetch(`${process.env.DOCUSIGN_BASE_URL}/restapi/v2.1/accounts/${process.env.DOCUSIGN_ACCOUNT_ID}/envelopes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(envelopeData)
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('DocuSign API Error:', errorText);
      throw new Error(`DocuSign API Error: ${errorText}`);
    }

    const result = await createResponse.json();
    const envelopeId = result.envelopeId;
    console.log('✅ DocuSign envelope created:', envelopeId);

    // Update the car_media record with DocuSign envelope ID
    const { error: updateError } = await supabase
      .from('car_media')
      .update({ 
        docusign_envelope_id: envelopeId,
        signing_status: 'sent',
        sent_for_signing_at: new Date().toISOString()
      })
      .eq('id', documentId);

    if (updateError) {
      console.error('Failed to update document with envelope ID:', updateError);
    }

    return NextResponse.json({
      success: true,
      envelopeId,
      message: `Consignment agreement sent to Samuel, Nick, and Glen for company approval. Only ONE company signature is required. Customer will be notified after company approval. Signed PDF will automatically replace unsigned version when completed.`
    });

  } catch (error) {
    console.error('Error sending for DocuSign signing:', error);
    return NextResponse.json(
      { error: 'Failed to send document for signing' },
      { status: 500 }
    );
  }
}