import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: NextRequest) {
  try {
    console.log('🚗 API: Loading cars using admin client to bypass RLS...');

    // Get all cars using admin client (bypasses RLS)
    const { data: cars, error: carsError } = await supabaseAdmin
      .from('cars')
      .select('*')
      .order('updated_at', { ascending: false });

    if (carsError) {
      console.error('❌ API: Error loading cars:', carsError);
      return NextResponse.json({ error: carsError.message }, { status: 500 });
    }

    console.log('✅ API: Loaded', cars?.length || 0, 'cars');

    // Get primary thumbnails for these cars
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
        console.warn('⚠️ API: Error loading thumbnails:', mediaError);
      } else {
        mediaRows?.forEach((m: any) => {
          let imageUrl = m.url;
          
          // If URL is from old domain, proxy it through our storage proxy
          if (imageUrl && imageUrl.includes('.supabase.co/storage/')) {
            imageUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
            console.log('🔧 Using storage proxy for image');
          }
          
          thumbnails[m.car_id] = imageUrl;
        });
        console.log('🖼️ API: Loaded', mediaRows?.length || 0, 'primary thumbnails');
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
      { error: 'Failed to load cars' },
      { status: 500 }
    );
  }
}
