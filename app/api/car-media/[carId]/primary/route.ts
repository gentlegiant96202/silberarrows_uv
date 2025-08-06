import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: { carId: string } }
) {
  try {
    const { carId } = await params;

    // Get primary and second car images
    const { data: mediaData, error } = await supabaseAdmin
      .from('car_media')
      .select('url, sort_order, is_primary')
      .eq('car_id', carId)
      .eq('kind', 'photo')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(2);

    if (error) {
      console.log('No images found for car:', carId);
      return NextResponse.json({ primaryImageUrl: null, secondImageUrl: null });
    }

    // Extract primary and second images
    const primaryImage = mediaData.find(img => img.is_primary) || mediaData[0];
    const secondImage = mediaData.find(img => !img.is_primary) || mediaData[1];

    return NextResponse.json({ 
      primaryImageUrl: primaryImage?.url || null,
      secondImageUrl: secondImage?.url || null
    });

  } catch (error) {
    console.error('Error fetching car primary image:', error);
    return NextResponse.json({ primaryImageUrl: null, secondImageUrl: null });
  }
} 