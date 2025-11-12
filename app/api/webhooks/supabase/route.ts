import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import dayjs from 'dayjs';

export async function POST(req: NextRequest) {
  try {
    const webhookData = await req.json();
    
    // Verify the webhook signature (optional but recommended)
    const signature = req.headers.get('x-supabase-signature');
    
    // Log the webhook data for debugging
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
    }
    
    return NextResponse.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleLeadsWebhook(type: string, record: any, old_record?: any) {
  // Trigger webhook queue processing for real-time delivery
  try {
    fetch('http://localhost:3000/api/process-webhooks', { 
      method: 'POST' 
    }).catch(() => {});
  } catch (error) {
  }
  
  // Format appointment date from YYYY-MM-DD to DD-MM-YYYY for external systems
  const formatDateForWebhook = (dateString: string) => {
    if (!dateString) return dateString;
    try {
      return dayjs(dateString).format('DD-MM-YYYY');
    } catch (error) {
      return dateString; // Return original if formatting fails
    }
  };
  
  switch (type) {
    case 'INSERT':
      // Format the appointment date before logging/sending
      const newRecord = { ...record };
      if (newRecord.appointment_date) {
        newRecord.appointment_date_formatted = formatDateForWebhook(newRecord.appointment_date);
      }
      // Add any custom logic for new leads
      // e.g., send notification emails, update external systems
      // Use newRecord.appointment_date_formatted for external API calls
      break;
      
    case 'UPDATE':
      // Only fire webhook for appointment date/time changes, not status changes
      const appointmentDateChanged = old_record?.appointment_date !== record?.appointment_date;
      const timeSlotChanged = old_record?.time_slot !== record?.time_slot;
      
      if (appointmentDateChanged || timeSlotChanged) {
        // Format the appointment date before logging/sending
        const updatedRecord = { ...record };
        if (updatedRecord.appointment_date) {
          updatedRecord.appointment_date_formatted = formatDateForWebhook(updatedRecord.appointment_date);
        }
        // Add any custom logic for appointment updates
        // e.g., send notifications for rescheduled appointments
        // Use updatedRecord.appointment_date_formatted for external API calls
      } else {
      }
      break;
      
    case 'DELETE':
      // Add any custom logic for lead deletion
      // e.g., cleanup related data, send notifications
      break;
  }
}

async function handleCarsWebhook(type: string, record: any, old_record?: any) {
  switch (type) {
    case 'INSERT':
      // Add any custom logic for new cars
      break;
    case 'UPDATE':
      // Add any custom logic for car updates
      break;
    case 'DELETE':
      // Add any custom logic for car deletion
      break;
  }
}

async function handleCarMediaWebhook(type: string, record: any, old_record?: any) {
  switch (type) {
    case 'INSERT':
      // Add any custom logic for new media
      break;
    case 'UPDATE':
      // Add any custom logic for media updates
      break;
    case 'DELETE':
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