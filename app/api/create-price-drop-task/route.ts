import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { carId, carDetails, pricing, images } = body;

    if (!carId || !carDetails || !pricing || !images) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log('🎨 Creating price drop task for:', carDetails.stock_number);

    // Upload images to storage
    const imageUrls: string[] = [];
    const timestamp = Date.now();

    // Upload 4:5 image
    if (images.image45) {
      // Handle base64 string (may or may not have data URL prefix)
      const base64Data = images.image45.includes(',') 
        ? images.image45.split(',')[1] 
        : images.image45;
      const image45Buffer = Buffer.from(base64Data, 'base64');
      const image45FileName = `price-drop-45-${carDetails.stock_number}-${timestamp}.png`;
      
      const { data: image45Upload, error: image45Error } = await supabaseAdmin.storage
        .from('media-files')
        .upload(image45FileName, image45Buffer, {
          contentType: 'image/png',
          cacheControl: '3600'
        });

      if (image45Error) {
        console.error('Error uploading 4:5 image:', image45Error);
        throw new Error('Failed to upload 4:5 image');
      }

      const { data: image45Public } = supabaseAdmin.storage
        .from('media-files')
        .getPublicUrl(image45FileName);
      
      imageUrls.push(image45Public.publicUrl);
    }

    // Upload story image
    if (images.imageStory) {
      // Handle base64 string (may or may not have data URL prefix)
      const base64Data = images.imageStory.includes(',') 
        ? images.imageStory.split(',')[1] 
        : images.imageStory;
      const imageStoryBuffer = Buffer.from(base64Data, 'base64');
      const imageStoryFileName = `price-drop-story-${carDetails.stock_number}-${timestamp}.png`;
      
      const { data: imageStoryUpload, error: imageStoryError } = await supabaseAdmin.storage
        .from('media-files')
        .upload(imageStoryFileName, imageStoryBuffer, {
          contentType: 'image/png',
          cacheControl: '3600'
        });

      if (imageStoryError) {
        console.error('Error uploading story image:', imageStoryError);
        throw new Error('Failed to upload story image');
      }

      const { data: imageStoryPublic } = supabaseAdmin.storage
        .from('media-files')
        .getPublicUrl(imageStoryFileName);
      
      imageUrls.push(imageStoryPublic.publicUrl);
    }

    // Create design task
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('design_tasks')
      .insert({
        title: `Price Drop - ${carDetails.model_year} ${carDetails.vehicle_model}`,
        description: `Price reduced from AED ${pricing.wasPrice.toLocaleString()} to AED ${pricing.nowPrice.toLocaleString()}. Save AED ${pricing.savings.toLocaleString()}. Two formats generated: 4:5 (Instagram post) and 9:16 (Story).`,
        status: 'intake',
        task_type: 'design',
        requested_by: 'system',
        media_files: imageUrls,
        annotations: []
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating design task:', taskError);
      throw new Error('Failed to create design task');
    }

    console.log('✅ Price drop task created successfully:', taskData.id);
    console.log(`📷 Generated ${imageUrls.length} images (4:5 + Story formats)`);

    return NextResponse.json({
      success: true,
      taskId: taskData.id,
      imageUrls,
      imageCount: imageUrls.length,
      message: 'Price drop marketing task created successfully with dual image formats'
    });

  } catch (error) {
    console.error('❌ Error creating price drop task:', error);
    
    const errorResponse = { 
      error: 'Failed to create price drop task',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
} 