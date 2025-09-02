import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ carId: string }> }
) {
  try {
    const { carId } = await params;
    
    if (!carId) {
      return NextResponse.json({ error: 'Car ID is required' }, { status: 400 });
    }

    console.log('🖼️ API: Loading car media for ID:', carId);

    // Get all media for this car using admin client (bypasses RLS)
    const { data: media, error: mediaError } = await supabaseAdmin
      .from('car_media')
      .select('*')
      .eq('car_id', carId)
      .order('sort_order', { ascending: true })
      .order('created_at');

    if (mediaError) {
      console.error('❌ API: Error loading car media:', mediaError);
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }

    console.log('✅ API: Loaded', media?.length || 0, 'media items for car:', carId);

    return NextResponse.json({
      success: true,
      media: media || []
    });

  } catch (error) {
    console.error('❌ API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to load car media' },
      { status: 500 }
    );
  }
}
