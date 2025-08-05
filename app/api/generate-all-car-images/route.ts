import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const force = body.force || false;

    // Get cars that need image generation
    let carsWithoutImages, carsError;
    
    if (force) {
      // Force regenerate all cars
      const result = await supabase
        .from('cars')
        .select('id')
        .eq('status', 'inventory')
        .eq('sale_status', 'available');
      carsWithoutImages = result.data;
      carsError = result.error;
    } else {
      // Only cars without images or with broken via.placeholder.com URLs
      const result = await supabase
        .from('cars')
        .select('id')
        .eq('status', 'inventory')
        .eq('sale_status', 'available')
        .or('xml_image_url.is.null,xml_image_url.like.*via.placeholder.com*');
      carsWithoutImages = result.data;
      carsError = result.error;
    }

    if (carsError) {
      console.error('Error fetching cars:', carsError);
      return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 });
    }

    if (!carsWithoutImages || carsWithoutImages.length === 0) {
      return NextResponse.json({ 
        message: 'All cars already have generated images',
        processed: 0 
      });
    }

    // Add all cars to the image generation queue
    const queueInserts = carsWithoutImages.map(car => ({
      car_id: car.id,
      status: 'pending'
    }));

    const { error: queueError } = await supabase
      .from('car_image_queue')
      .upsert(queueInserts, { 
        onConflict: 'car_id',
        ignoreDuplicates: false 
      });

    if (queueError) {
      console.error('Error adding to queue:', queueError);
      return NextResponse.json({ error: 'Failed to queue cars' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Cars queued for image generation',
      queued: carsWithoutImages.length,
      cars: carsWithoutImages.map(c => c.id)
    });

  } catch (error) {
    console.error('Batch queue error:', error);
    return NextResponse.json({ 
      error: 'Failed to queue cars for batch generation' 
    }, { status: 500 });
  }
}

// Force regeneration for ALL cars (even those with existing images)
export async function PUT(request: NextRequest) {
  try {
    const { data: allCars, error: carsError } = await supabase
      .from('cars')
      .select('id')
      .eq('status', 'inventory')
      .eq('sale_status', 'available');

    if (carsError) {
      console.error('Error fetching all cars:', carsError);
      return NextResponse.json({ error: 'Failed to fetch cars' }, { status: 500 });
    }

    if (!allCars || allCars.length === 0) {
      return NextResponse.json({ 
        message: 'No cars found to regenerate',
        processed: 0 
      });
    }

    // Clear existing XML image URLs and add to queue
    const { error: clearError } = await supabase
      .from('cars')
      .update({ xml_image_url: null })
      .in('id', allCars.map(c => c.id));

    if (clearError) {
      console.error('Error clearing image URLs:', clearError);
      return NextResponse.json({ error: 'Failed to clear image URLs' }, { status: 500 });
    }

    // Add all cars to queue
    const queueInserts = allCars.map(car => ({
      car_id: car.id,
      status: 'pending'
    }));

    const { error: queueError } = await supabase
      .from('car_image_queue')
      .upsert(queueInserts, { 
        onConflict: 'car_id',
        ignoreDuplicates: false 
      });

    if (queueError) {
      console.error('Error adding to queue:', queueError);
      return NextResponse.json({ error: 'Failed to queue cars' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'All cars queued for image regeneration',
      queued: allCars.length,
      cars: allCars.map(c => c.id)
    });

  } catch (error) {
    console.error('Force regeneration error:', error);
    return NextResponse.json({ 
      error: 'Failed to force regenerate all images' 
    }, { status: 500 });
  }
} 