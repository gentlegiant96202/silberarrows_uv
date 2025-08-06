import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carId, stockNumber, carTitle, wasPrice, nowPrice, monthlyPayment, savings, imageDataUrl } = body;

    console.log('🎨 Creating price drop task for:', stockNumber);

    // Get car details to verify it exists
    const { data: carData, error: carError } = await supabaseAdmin
      .from('cars')
      .select('*')
      .eq('id', carId)
      .single();

    if (carError || !carData) {
      throw new Error('Car not found');
    }

    let imageUrl = null;

    // If image data is provided, upload it to Supabase storage
    if (imageDataUrl) {
      try {
        // Convert base64 to buffer
        const base64Data = imageDataUrl.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        
        // Upload to Supabase storage
        const fileName = `price-drop-${stockNumber}-${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('media-files')
          .upload(fileName, imageBuffer, {
            contentType: 'image/png'
          });

        if (uploadError) {
          console.warn('Upload failed:', uploadError.message);
        } else {
          // Get public URL
          const { data: { publicUrl } } = supabaseAdmin.storage
            .from('media-files')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      } catch (error) {
        console.warn('Image upload failed:', error);
      }
    }

    // Create marketing task in INTAKE column
    const taskTitle = `Price Drop - ${carTitle}`;
    const taskDescription = `Price reduced from AED ${wasPrice.toLocaleString()} to AED ${nowPrice.toLocaleString()}. Save AED ${savings.toLocaleString()}. Monthly payment: AED ${monthlyPayment.toLocaleString()}/mo (20% down).`;

    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('design_tasks')
      .insert({
        title: taskTitle,
        description: taskDescription,
        status: 'intake',
        task_type: 'design',
        media_files: imageUrl ? [imageUrl] : [],
        requested_by: 'system',
      })
      .select()
      .single();

    if (taskError) {
      throw new Error(`Task creation failed: ${taskError.message}`);
    }

    console.log('✅ Price drop task created successfully:', taskData.id);

    return NextResponse.json({
      success: true,
      taskId: taskData.id,
      imageUrl,
      message: 'Price drop marketing task created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating price drop task:', error);
    return NextResponse.json(
      { error: 'Failed to create price drop task' },
      { status: 500 }
    );
  }
} 