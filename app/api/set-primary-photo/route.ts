import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request: NextRequest) {
  try {
    const { mediaId } = await request.json();

    if (!mediaId) {
      return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
    }

    // Get the media item that will become primary
    const { data: targetMedia, error: targetError } = await supabase
      .from('car_media')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (targetError || !targetMedia) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Only photos can be primary
    if (targetMedia.kind !== 'photo') {
      return NextResponse.json({ error: 'Only photos can be set as primary' }, { status: 400 });
    }

    const carId = targetMedia.car_id;

    // Start transaction by getting all media for this car
    const { data: allMedia, error: allMediaError } = await supabase
      .from('car_media')
      .select('*')
      .eq('car_id', carId)
      .order('sort_order', { ascending: true });

    if (allMediaError) {
      return NextResponse.json({ error: 'Failed to fetch car media' }, { status: 500 });
    }

    // Separate photos/videos from other media
    const gallery = allMedia.filter(m => m.kind === 'photo' || m.kind === 'video');
    
    // Remove the target media from its current position
    const galleryWithoutTarget = gallery.filter(m => m.id !== mediaId);

    // Create new ordered array with target media first
    const reorderedGallery = [targetMedia, ...galleryWithoutTarget];

    // Step 1: Clear primary status from all photos for this car
    console.log('🔄 Clearing primary status from all photos for car:', carId);
    const { error: clearError } = await supabase
      .from('car_media')
      .update({ is_primary: false })
      .eq('car_id', carId)
      .eq('kind', 'photo');

    if (clearError) {
      console.error('Error clearing primary status:', clearError);
      return NextResponse.json({ error: 'Failed to clear primary status' }, { status: 500 });
    }

    // Step 2: Set the target as primary and update sort orders sequentially
    console.log('🔄 Setting new primary photo and updating sort orders...');
    for (let i = 0; i < reorderedGallery.length; i++) {
      const item = reorderedGallery[i];
      const isPrimary = i === 0 && item.kind === 'photo';
      
      console.log(`🔄 Updating item ${item.id}: sort_order=${i}, is_primary=${isPrimary}`);
      
      const { error: updateError } = await supabase
        .from('car_media')
        .update({
          is_primary: isPrimary,
          sort_order: i
        })
        .eq('id', item.id);

      if (updateError) {
        console.error(`Error updating media item ${item.id}:`, updateError);
        return NextResponse.json({ error: `Failed to update media item ${item.id}` }, { status: 500 });
      }
    }

    // Return success with updated media info
    return NextResponse.json({ 
      success: true,
      message: 'Primary photo updated successfully',
      primaryMediaId: mediaId
    });

  } catch (error) {
    console.error('Set primary error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 