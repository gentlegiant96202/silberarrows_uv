import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

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
    aud: process.env.NODE_ENV === 'production' ? 'account.docusign.com' : 'account-d.docusign.com',
    iat: now,
    exp: now + 3600,
    scope: 'signature impersonation'
  };

  const base64Header = Buffer.from(JSON.stringify(header)).toString('base64url');
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const signatureInput = `${base64Header}.${base64Payload}`;
  
  const crypto = require('crypto');
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);

  let rsaKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
  
  if (!rsaKey && process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64) {
    try {
      rsaKey = Buffer.from(process.env.DOCUSIGN_RSA_PRIVATE_KEY_BASE64, 'base64').toString();
    } catch (error) {
      // continue
    }
  }
  
  if (rsaKey) {
    let cleanKey = rsaKey.replace(/\s/g, '');
    const hasBeginHeader = cleanKey.includes('-----BEGINRSAPRIVATEKEY-----') || cleanKey.includes('-----BEGIN');
    const hasEndHeader = cleanKey.includes('-----ENDRSAPRIVATEKEY-----') || cleanKey.includes('-----END');
    
    if (hasBeginHeader && hasEndHeader) {
      const beginIndex = cleanKey.indexOf('-----BEGIN');
      const endIndex = cleanKey.lastIndexOf('-----END');
      
      if (beginIndex !== -1 && endIndex !== -1) {
        const afterBegin = cleanKey.substring(beginIndex);
        const beforeEnd = afterBegin.substring(0, afterBegin.lastIndexOf('-----END'));
        const keyContent = beforeEnd.replace('-----BEGINRSAPRIVATEKEY-----', '');
        const formattedContent = keyContent.match(/.{1,64}/g)?.join('\n') || keyContent;
        rsaKey = `-----BEGIN RSA PRIVATE KEY-----\n${formattedContent}\n-----END RSA PRIVATE KEY-----`;
      }
    }
  }
  const signature = signer.sign(rsaKey, 'base64url');
  
  return `${signatureInput}.${signature}`;
}

async function getAccessToken() {
  const jwt = generateJWT();
  
  const authUrl = process.env.NODE_ENV === 'production' 
    ? 'https://account.docusign.com/oauth/token'
    : 'https://account-d.docusign.com/oauth/token';

  const response = await fetch(authUrl, {
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

export async function POST(request: NextRequest) {
  try {
    const { 
      salesOrderId, 
      customerEmail, 
      customerName, 
      companySignerEmail, 
      pdfUrl,
      orderNumber
    } = await request.json();

    if (!salesOrderId || !customerEmail || !customerName || !companySignerEmail || !pdfUrl) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    const accessToken = await getAccessToken();

    // Fetch the PDF content
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
    }
    
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const pdfBase64 = Buffer.from(pdfBuffer).toString('base64');

    const documentTitle = `Sales Order ${orderNumber || ''}`.trim();
    const baseSubject = `SilberArrows ${documentTitle} - ${customerName} - Requires Signatures`;
    const safeSubject = baseSubject.length > 100 ? baseSubject.slice(0, 100) : baseSubject;

    const envelopeData = {
      emailSubject: safeSubject,
      emailBlurb: `${documentTitle} for ${customerName}. Company signature required first, then customer signature.`,
      documents: [
        {
          documentId: '1',
          name: documentTitle,
          fileExtension: 'pdf',
          documentBase64: pdfBase64
        }
      ],
      recipients: {
        signers: [
          {
            email: companySignerEmail,
            name: 'Company Representative',
            recipientId: '1',
            routingOrder: '1',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  anchorString: 'SilberArrows Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '30',
                  anchorIgnoreIfNotPresent: false,
                  anchorCaseSensitive: true,
                  tabLabel: 'CompanySignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  anchorString: 'SilberArrows Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '66',
                  anchorIgnoreIfNotPresent: false,
                  anchorCaseSensitive: true,
                  tabLabel: 'CompanyDate'
                }
              ]
            }
          },
          {
            email: customerEmail,
            name: customerName,
            recipientId: '2',
            routingOrder: '2',
            tabs: {
              signHereTabs: [
                {
                  documentId: '1',
                  anchorString: 'Customer Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '30',
                  anchorIgnoreIfNotPresent: false,
                  anchorCaseSensitive: true,
                  tabLabel: 'CustomerSignature'
                }
              ],
              dateSignedTabs: [
                {
                  documentId: '1',
                  anchorString: 'Customer Signature:',
                  anchorUnits: 'pixels',
                  anchorXOffset: '0',
                  anchorYOffset: '66',
                  anchorIgnoreIfNotPresent: false,
                  anchorCaseSensitive: true,
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
      throw new Error(`DocuSign API Error: ${errorText}`);
    }

    const result = await createResponse.json();
    const envelopeId = result.envelopeId;

    // Update the sales order with DocuSign envelope ID
    const { error: updateError } = await supabase
      .from('uv_sales_orders')
      .update({ 
        docusign_envelope_id: envelopeId,
        signing_status: 'sent',
        sent_for_signing_at: new Date().toISOString()
      })
      .eq('id', salesOrderId);

    if (updateError) {
      console.error('Failed to update sales order with envelope ID:', updateError);
    }

    return NextResponse.json({
      success: true,
      envelopeId,
      message: `Sales Order sent to ${companySignerEmail} for company approval. Customer will be notified after company signature is completed.`
    });

  } catch (error: any) {
    console.error('DocuSign send error:', error);
    return NextResponse.json(
      { error: `Failed to send document for signing: ${error.message}` },
      { status: 500 }
    );
  }
}
