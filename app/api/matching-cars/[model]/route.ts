import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ model: string }> }
) {
  try {
    const { model } = await params;
    
    if (!model) {
      return NextResponse.json({ error: 'Model parameter is required' }, { status: 400 });
    }
    // Get cars matching the model family using admin client (bypasses RLS)
    const { data: cars, error: carsError } = await supabaseAdmin
      .from('cars')
      .select('*')
      .eq('status', 'inventory')
      .eq('sale_status', 'available')
      .eq('model_family', model)
      .order('advertised_price_aed', { ascending: true })
      .limit(6);

    if (carsError) {
      return NextResponse.json({ error: carsError.message }, { status: 500 });
    }
    // Get thumbnails for these cars
    const carIds = cars?.map(c => c.id) || [];
    let thumbnails: Record<string, string> = {};

    if (carIds.length > 0) {
      const { data: mediaRows, error: mediaError } = await supabaseAdmin
        .from('car_media')
        .select('car_id, url')
        .eq('is_primary', true)
        .eq('kind', 'photo')
        .in('car_id', carIds);

      if (mediaError) {
      } else {
        mediaRows?.forEach((m: any) => {
          let imageUrl = m.url;
          
          // Use storage proxy for old domain URLs
          if (imageUrl && imageUrl.includes('.supabase.co/storage/')) {
            imageUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
          }
          
          thumbnails[m.car_id] = imageUrl;
        });
      }
    }

    return NextResponse.json({
      success: true,
      cars: cars || [],
      thumbnails
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch matching cars' },
      { status: 500 }
    );
  }
}
