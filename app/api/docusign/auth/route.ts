import { NextRequest, NextResponse } from 'next/server';

// Initiate DocuSign OAuth 2.0 flow
export async function GET(request: NextRequest) {
  try {
    const authUrl = new URL('https://account.docusign.com/oauth/auth');
    
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'signature impersonation');
    authUrl.searchParams.set('client_id', process.env.DOCUSIGN_INTEGRATION_KEY!);
    authUrl.searchParams.set('redirect_uri', `${process.env.NEXT_PUBLIC_BASE_URL}/api/docusign/oauth`);
    authUrl.searchParams.set('state', 'docusign_auth'); // Optional state parameter
    return NextResponse.redirect(authUrl.toString());

  } catch (error) {
    return NextResponse.json({ error: 'Failed to initiate authentication' }, { status: 500 });
  }
}
