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

    console.log('🔍 API: Fetching matching cars for model family:', model);

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
      console.error('❌ API: Error fetching matching cars:', carsError);
      return NextResponse.json({ error: carsError.message }, { status: 500 });
    }

    console.log('✅ API: Found', cars?.length || 0, 'matching cars for model:', model);

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
        console.warn('⚠️ API: Error loading thumbnails for matching cars:', mediaError);
      } else {
        mediaRows?.forEach((m: any) => {
          let imageUrl = m.url;
          
          // Use storage proxy for old domain URLs
          if (imageUrl && imageUrl.includes('.supabase.co/storage/')) {
            imageUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
          }
          
          thumbnails[m.car_id] = imageUrl;
        });
        console.log('🖼️ API: Loaded', mediaRows?.length || 0, 'thumbnails for matching cars');
      }
    }

    return NextResponse.json({
      success: true,
      cars: cars || [],
      thumbnails
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch matching cars' },
      { status: 500 }
    );
  }
}
