import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();
    
    // Verify the webhook signature (optional but recommended)
    const signature = req.headers.get('x-supabase-signature');
    
    // Log the webhook data for debugging
    console.log('Received webhook:', JSON.stringify(webhookData, null, 2));
    
    // Handle different webhook events
    const { table, record, old_record, type } = webhookData;
    
    switch (table) {
      case 'leads':
        await handleLeadsWebhook(type, record, old_record);
        break;
      case 'cars':
        await handleCarsWebhook(type, record, old_record);
        break;
      case 'car_media':
        await handleCarMediaWebhook(type, record, old_record);
        break;
      default:
        console.log(`Unhandled table: ${table}`);
    }
    
    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleLeadsWebhook(type: string, record: any, old_record?: any) {
  console.log(`Processing leads webhook: ${type}`);
  
  switch (type) {
    case 'INSERT':
      console.log('New lead created:', record);
      // Add any custom logic for new leads
      // e.g., send notification emails, update external systems
      break;
    case 'UPDATE':
      console.log('Lead updated:', record);
      // Add any custom logic for lead updates
      // e.g., track status changes, send notifications
      break;
    case 'DELETE':
      console.log('Lead deleted:', old_record);
      // Add any custom logic for lead deletion
      // e.g., cleanup related data, send notifications
      break;
  }
}

async function handleCarsWebhook(type: string, record: any, old_record?: any) {
  console.log(`Processing cars webhook: ${type}`);
  
  switch (type) {
    case 'INSERT':
      console.log('New car added:', record);
      // Add any custom logic for new cars
      break;
    case 'UPDATE':
      console.log('Car updated:', record);
      // Add any custom logic for car updates
      break;
    case 'DELETE':
      console.log('Car deleted:', old_record);
      // Add any custom logic for car deletion
      break;
  }
}

async function handleCarMediaWebhook(type: string, record: any, old_record?: any) {
  console.log(`Processing car_media webhook: ${type}`);
  
  switch (type) {
    case 'INSERT':
      console.log('New car media added:', record);
      // Add any custom logic for new media
      break;
    case 'UPDATE':
      console.log('Car media updated:', record);
      // Add any custom logic for media updates
      break;
    case 'DELETE':
      console.log('Car media deleted:', old_record);
      // Add any custom logic for media deletion
      break;
  }
}

// Handle preflight requests for CORS
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-supabase-signature',
    },
  });
} 