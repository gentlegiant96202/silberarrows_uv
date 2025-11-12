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
    // Get all media for this car using admin client (bypasses RLS)
    const { data: media, error: mediaError } = await supabaseAdmin
      .from('car_media')
      .select('*')
      .eq('car_id', carId)
      .order('sort_order', { ascending: true })
      .order('created_at');

    if (mediaError) {
      return NextResponse.json({ error: mediaError.message }, { status: 500 });
    }

    // Fix media URLs to use storage proxy for inaccessible storage domains
    const fixedMedia = media?.map((m: any) => {
      let fixedUrl = m.url;
      if (fixedUrl && fixedUrl.includes('.supabase.co/storage/')) {
        fixedUrl = `/api/storage-proxy?url=${encodeURIComponent(m.url)}`;
      }
      return { ...m, url: fixedUrl };
    }) || [];
    return NextResponse.json({
      success: true,
      media: fixedMedia
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to load car media' },
      { status: 500 }
    );
  }
}
