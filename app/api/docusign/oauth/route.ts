import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// OAuth 2.0 callback handler for DocuSign
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code) {
      return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
    }
    // Check if we have required credentials
    if (!process.env.DOCUSIGN_INTEGRATION_KEY || !process.env.DOCUSIGN_CLIENT_SECRET) {
      return NextResponse.json({ error: 'Missing DocuSign credentials' }, { status: 500 });
    }

    // Exchange authorization code for access token
    const requestBody = {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/docusign/oauth`
    };
    const tokenResponse = await fetch('https://account.docusign.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${process.env.DOCUSIGN_INTEGRATION_KEY}:${process.env.DOCUSIGN_CLIENT_SECRET}`).toString('base64')}`
      },
      body: new URLSearchParams(requestBody)
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      return NextResponse.json({ 
        error: 'Token exchange failed', 
        details: error,
        status: tokenResponse.status 
      }, { status: 400 });
    }

    const tokenData = await tokenResponse.json();
    
    // Store the access token securely (you might want to store this in database)
    // For now, we'll store it in a way that can be retrieved by the send-for-signing endpoint
    // Redirect to success page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL}/inventory?docusign_auth=success`);

  } catch (error) {
    return NextResponse.json({ error: 'OAuth process failed' }, { status: 500 });
  }
}
