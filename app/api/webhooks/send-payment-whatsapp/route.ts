import { NextRequest, NextResponse } from 'next/server';

// WhatsApp webhook URL - BotHook integration
const WHATSAPP_WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL || 'https://bothook.io/v1/public/triggers/webhooks/49119f49-7828-4359-9c33-31bb6e92b689';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      payment_number,
      payment_amount,
      payment_method,
      payment_date,
      pdf_url,
      customer_name,
      customer_phone,
      customer_country_code,
    } = body;

    // Validate required fields
    if (!payment_number) {
      return NextResponse.json({ error: 'Payment number is required' }, { status: 400 });
    }
    
    if (!pdf_url) {
      return NextResponse.json({ error: 'PDF URL is required. Generate receipt first.' }, { status: 400 });
    }

    if (!customer_phone) {
      return NextResponse.json({ error: 'Customer phone number is required' }, { status: 400 });
    }

    // Format phone number (remove + and any spaces)
    const formattedPhone = `${customer_country_code}${customer_phone}`.replace(/[\s+]/g, '');

    // Prepare webhook payload
    const webhookPayload = {
      // Customer info
      phone: formattedPhone,
      customer_name: customer_name || 'Customer',
      
      // Payment details
      payment_reference: payment_number,
      payment_amount: payment_amount,
      payment_method: payment_method,
      payment_date: payment_date,
      
      // PDF document
      document_url: pdf_url,
      document_type: 'payment_receipt',
      
      // Metadata
      timestamp: new Date().toISOString(),
    };

    // Check if webhook URL is configured
    if (!WHATSAPP_WEBHOOK_URL) {
      console.log('WhatsApp webhook payload (no URL configured):', webhookPayload);
      return NextResponse.json({ 
        success: true, 
        message: 'Webhook not configured - payload logged',
        payload: webhookPayload 
      });
    }

    // Send to external webhook
    const webhookResponse = await fetch(WHATSAPP_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error('Webhook error:', errorText);
      throw new Error(`Webhook returned ${webhookResponse.status}: ${errorText}`);
    }

    const result = await webhookResponse.json().catch(() => ({}));

    return NextResponse.json({ 
      success: true, 
      message: 'Payment receipt sent via WhatsApp',
      webhookResponse: result 
    });

  } catch (error: any) {
    console.error('Error sending WhatsApp:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send WhatsApp' },
      { status: 500 }
    );
  }
}

