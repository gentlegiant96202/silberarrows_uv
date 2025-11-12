import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Get pending image generation jobs
    const { data: queueItems, error: queueError } = await supabase
      .from('car_image_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Process 10 at a time

    if (queueError) {
      return NextResponse.json({ error: 'Queue fetch failed' }, { status: 500 });
    }

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ 
        message: 'No pending image generation jobs',
        processed: 0 
      });
    }

    const results = [];

    // Process each queue item
    for (const item of queueItems) {
      try {
        // Mark as processing
        await supabase
          .from('car_image_queue')
          .update({ 
            status: 'processing',
            processed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Call the image generation API
        const baseUrl = request.headers.get('host');
        const protocol = request.headers.get('x-forwarded-proto') || 'http';
        const imageGenUrl = `${protocol}://${baseUrl}/api/generate-car-image/${item.car_id}`;

        const response = await fetch(imageGenUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          // Mark as completed
          await supabase
            .from('car_image_queue')
            .update({ 
              status: 'completed',
              processed_at: new Date().toISOString()
            })
            .eq('id', item.id);

          results.push({
            carId: item.car_id,
            status: 'completed',
            success: true
          });

        } else {
          // Mark as failed
          const errorText = await response.text();
          await supabase
            .from('car_image_queue')
            .update({ 
              status: 'failed',
              processed_at: new Date().toISOString(),
              error_message: `HTTP ${response.status}: ${errorText}`
            })
            .eq('id', item.id);

          results.push({
            carId: item.car_id,
            status: 'failed',
            success: false,
            error: errorText
          });
        }

      } catch (itemError) {
        // Mark as failed
        await supabase
          .from('car_image_queue')
          .update({ 
            status: 'failed',
            processed_at: new Date().toISOString(),
            error_message: itemError instanceof Error ? itemError.message : 'Unknown error'
          })
          .eq('id', item.id);

        results.push({
          carId: item.car_id,
          status: 'failed',
          success: false,
          error: itemError instanceof Error ? itemError.message : 'Unknown error'
        });
      }
    }

    // Clean up old completed/failed records (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('car_image_queue')
      .delete()
      .in('status', ['completed', 'failed'])
      .lt('processed_at', oneDayAgo);

    return NextResponse.json({
      message: 'Queue processing completed',
      processed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Queue processing failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Manual trigger for specific car
export async function PUT(request: NextRequest) {
  try {
    const { carId } = await request.json();

    if (!carId) {
      return NextResponse.json({ error: 'Car ID required' }, { status: 400 });
    }

    // Add to queue manually
    const { error: queueError } = await supabase
      .from('car_image_queue')
      .insert({ 
        car_id: carId, 
        status: 'pending' 
      })
      .select()
      .single();

    if (queueError) {
      // If already exists, update it
      await supabase
        .from('car_image_queue')
        .update({ 
          status: 'pending',
          created_at: new Date().toISOString(),
          error_message: null
        })
        .eq('car_id', carId);
    }

    return NextResponse.json({ 
      message: 'Car added to image generation queue',
      carId: carId
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to queue car for image generation' 
    }, { status: 500 });
  }
} 