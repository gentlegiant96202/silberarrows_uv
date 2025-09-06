import { NextRequest, NextResponse } from 'next/server';

// Simple consent page that shows success after DocuSign consent
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    
    if (code) {
      // User has granted consent - show success message
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>DocuSign Consent Granted</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; text-align: center; }
            .success { color: green; font-size: 24px; margin-bottom: 20px; }
            .instructions { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="success">✅ DocuSign Consent Granted Successfully!</div>
          <div class="instructions">
            <p>Your DocuSign production integration is now authorized.</p>
            <p>You can close this tab and test the "Send for Signing" feature.</p>
            <p>Demo watermarks should now be removed from all documents.</p>
          </div>
        </body>
        </html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    // No code parameter - show error
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });

  } catch (error) {
    console.error('Consent page error:', error);
    return NextResponse.json({ error: 'Consent processing failed' }, { status: 500 });
  }
}
