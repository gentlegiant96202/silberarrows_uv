import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;

    // Fetch car data
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select(`
        id,
        stock_number,
        model_year,
        vehicle_model,
        advertised_price_aed,
        current_mileage_km,
        monthly_20_down_aed
      `)
      .eq('id', carId)
      .single();

    if (carError || !car) {
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    // For now, just create a placeholder image URL and update the database
    // This will allow the system to work while we debug Puppeteer
    const placeholderImageUrl = `https://placehold.co/1200x1200/000000/FFFFFF/png?text=${encodeURIComponent(car.model_year + ' ' + car.vehicle_model)}`;

    // Remove old XML card media if exists (look for documents with xml in filename)
    const { data: existingXmlCards } = await supabase
      .from('car_media')
      .select('id')
      .eq('car_id', carId)
      .eq('kind', 'document')
      .like('url', '%xml-card%');

    if (existingXmlCards && existingXmlCards.length > 0) {
      await supabase
        .from('car_media')
        .delete()
        .in('id', existingXmlCards.map(card => card.id));
    }

    // Add placeholder to car_media table
    const { error: mediaError } = await supabase
      .from('car_media')
      .insert({
        car_id: carId,
        url: placeholderImageUrl,
        kind: 'document',
        is_primary: false,
        sort_order: 999
      });

    if (mediaError) {
      return NextResponse.json({ 
        error: 'Failed to save media record', 
        details: mediaError.message,
        code: mediaError.code 
      }, { status: 500 });
    }

    // Update car record with image URL
    const { error: updateError } = await supabase
      .from('cars')
      .update({ xml_image_url: placeholderImageUrl })
      .eq('id', carId);

    if (updateError) {
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl: placeholderImageUrl,
      carId: carId,
      note: 'Using placeholder image - Puppeteer implementation pending'
    });

  } catch (error) {
    return NextResponse.json({ 
      error: 'Image generation failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 