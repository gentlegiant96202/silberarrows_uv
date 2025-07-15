import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST() {
  try {
    // Get unprocessed webhooks from queue
    const { data: webhooks, error: fetchError } = await supabase
      .from('webhook_queue')
      .select('*')
      .eq('processed', false)
      .order('created_at', { ascending: true })
      .limit(10); // Process in batches

    if (fetchError) {
      console.error('Error fetching webhook queue:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch webhook queue' }, { status: 500 });
    }

    if (!webhooks || webhooks.length === 0) {
      return NextResponse.json({ message: 'No webhooks to process', processed: 0 });
    }

    let processedCount = 0;
    const results = [];

    // Process each webhook
    for (const webhook of webhooks) {
      try {
        // Replace with your actual external webhook URL
        const EXTERNAL_WEBHOOK_URL = process.env.EXTERNAL_WEBHOOK_URL || 'https://webhook.site/your-unique-url';
        
        console.log(`Processing webhook ${webhook.id}: ${webhook.event_type}`);
        
        // Send webhook to external URL
        const response = await fetch(EXTERNAL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'SilberArrows-CRM/1.0'
          },
          body: JSON.stringify(webhook.payload)
        });

        if (response.ok) {
          // Mark as processed
          const { error: updateError } = await supabase
            .from('webhook_queue')
            .update({ 
              processed: true, 
              processed_at: new Date().toISOString() 
            })
            .eq('id', webhook.id);

          if (updateError) {
            console.error(`Error updating webhook ${webhook.id}:`, updateError);
          } else {
            processedCount++;
            results.push({
              id: webhook.id,
              event_type: webhook.event_type,
              status: 'success',
              response_status: response.status
            });
          }
        } else {
          // Mark error
          const { error: errorUpdateError } = await supabase
            .from('webhook_queue')
            .update({ 
              error_message: `HTTP ${response.status}: ${response.statusText}` 
            })
            .eq('id', webhook.id);

          if (errorUpdateError) {
            console.error(`Error updating webhook error ${webhook.id}:`, errorUpdateError);
          }

          results.push({
            id: webhook.id,
            event_type: webhook.event_type,
            status: 'failed',
            error: `HTTP ${response.status}`,
            response_status: response.status
          });
        }

      } catch (error) {
        console.error(`Error processing webhook ${webhook.id}:`, error);
        
        // Mark error in database
        const { error: errorUpdateError } = await supabase
          .from('webhook_queue')
          .update({ 
            error_message: error instanceof Error ? error.message : 'Unknown error' 
          })
          .eq('id', webhook.id);

        if (errorUpdateError) {
          console.error(`Error updating webhook error ${webhook.id}:`, errorUpdateError);
        }

        results.push({
          id: webhook.id,
          event_type: webhook.event_type,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: `Processed ${processedCount} webhooks`,
      processed: processedCount,
      total: webhooks.length,
      results
    });

  } catch (error) {
    console.error('Error in webhook processing:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET endpoint to check queue status
export async function GET() {
  try {
    const { data: queueStats, error } = await supabase
      .from('webhook_queue')
      .select('processed, error_message')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const stats = {
      total: queueStats?.length || 0,
      pending: queueStats?.filter(w => !w.processed && !w.error_message).length || 0,
      processed: queueStats?.filter(w => w.processed).length || 0,
      errors: queueStats?.filter(w => w.error_message && !w.processed).length || 0
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching queue stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 