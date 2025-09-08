import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

interface DamageMarker {
  id: string;
  x: number;
  y: number;
  damageType: 'B' | 'BR' | 'C' | 'CR' | 'D' | 'F' | 'FI' | 'L' | 'M' | 'P' | 'PA' | 'PC' | 'R' | 'RU' | 'S' | 'ST';
  severity: 'minor' | 'moderate' | 'major';
  description: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { carId, damageAnnotations, inspectionNotes } = body;

    if (!carId || !damageAnnotations) {
      return NextResponse.json(
        { error: 'Missing required fields: carId and damageAnnotations' },
        { status: 400 }
      );
    }

    console.log('🔧 Generating damage report image for car:', carId);
    console.log('📊 Damage annotations:', damageAnnotations.length, 'markers');

    // Get car details for the report
    const { data: car, error: carError } = await supabase
      .from('cars')
      .select('stock_number, model_year, vehicle_model, colour, customer_name')
      .eq('id', carId)
      .single();

    if (carError || !car) {
      console.error('❌ Car not found:', carError);
      return NextResponse.json({ error: 'Car not found' }, { status: 404 });
    }

    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app';
    
    console.log('🔄 Calling Railway renderer service at:', `${rendererUrl}/render-damage-report`);
    
    const renderPayload = {
      carDetails: {
        stockNumber: car.stock_number,
        modelYear: car.model_year,
        vehicleModel: car.vehicle_model,
        colour: car.colour,
        customerName: car.customer_name
      },
      damageAnnotations,
      inspectionNotes: inspectionNotes || '',
      diagramImageUrl: `${rendererUrl}/Pre uvc-2.jpg`, // Use Railway's local image
      timestamp: new Date().toISOString()
    };

    console.log('📤 Sending payload to renderer:', {
      carDetails: renderPayload.carDetails,
      annotationsCount: damageAnnotations.length,
      diagramUrl: renderPayload.diagramImageUrl
    });

    const renderResponse = await fetch(`${rendererUrl}/render-damage-report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(renderPayload),
    });

    console.log('📊 Render response status:', renderResponse.status);

    if (!renderResponse.ok) {
      const errorText = await renderResponse.text();
      console.error('❌ Renderer service error:', errorText);
      return NextResponse.json({ 
        error: 'Failed to generate damage report image',
        details: `Renderer service returned ${renderResponse.status}: ${errorText}`,
        rendererUrl: `${rendererUrl}/render-damage-report`
      }, { status: 500 });
    }

    const renderResult = await renderResponse.json();
    
    if (!renderResult.success || !renderResult.damageReportImage) {
      console.error('❌ Invalid renderer response:', renderResult);
      return NextResponse.json({ 
        error: 'Renderer service returned invalid response',
        details: renderResult 
      }, { status: 500 });
    }

    console.log('✅ Successfully generated damage report image');
    console.log('🔍 About to save to storage...');

    // Convert base64 to buffer for storage
    const imageBuffer = Buffer.from(renderResult.damageReportImage, 'base64');

    // Upload generated image to Supabase Storage
    const fileName = `damage-report-${car.stock_number}-${Date.now()}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(`damage-reports/${fileName}`, imageBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      return NextResponse.json({ 
        error: 'Failed to save generated image',
        details: uploadError.message 
      }, { status: 500 });
    }

    console.log('💾 Image uploaded to storage successfully:', uploadData.path);
    console.log('🔍 About to get public URL...');

    // Delete any existing damage report images for this car first
    console.log('🗑️ Removing old damage report images...');
    const { data: existingReports } = await supabase
      .from('car_media')
      .select('id, url')
      .eq('car_id', carId)
      .eq('kind', 'damage_report');

    if (existingReports && existingReports.length > 0) {
      console.log(`🗑️ Found ${existingReports.length} existing damage reports to remove`);
      
      // Delete from car_media table
      const { error: deleteError } = await supabase
        .from('car_media')
        .delete()
        .eq('car_id', carId)
        .eq('kind', 'damage_report');
      
      if (deleteError) {
        console.error('❌ Failed to delete old damage reports from database:', deleteError);
      } else {
        console.log('✅ Old damage reports removed from database');
      }

      // Also try to delete old files from storage (best effort)
      for (const report of existingReports) {
        try {
          const pathMatch = report.url.match(/damage-reports\/(.+)$/);
          if (pathMatch) {
            await supabase.storage.from('media-files').remove([`damage-reports/${pathMatch[1]}`]);
            console.log('🗑️ Deleted old file from storage:', pathMatch[1]);
          }
        } catch (e) {
          console.log('⚠️ Could not delete old file from storage (non-critical):', e);
        }
      }
    }

    // Get public URL and replace with new domain
    const { data: publicUrlData } = supabase.storage
      .from('media-files')
      .getPublicUrl(uploadData.path);

    let finalImageUrl = publicUrlData.publicUrl;
    
    // Replace Supabase domain with our custom domain if configured
    if (process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL) {
      finalImageUrl = finalImageUrl.replace(
        'https://ygdxvbzxqnxmxvmhiusy.supabase.co/storage/v1/object/public',
        process.env.NEXT_PUBLIC_SUPABASE_STORAGE_URL
      );
    }

    // Save reference in car_media table
    console.log('💾 Saving to car_media table:', {
      car_id: carId,
      url: finalImageUrl,
      kind: 'damage_report',
      filename: fileName,
      sort_order: 999,
      report_type: 'damage_report'
    });
    
    const { data: insertData, error: mediaError } = await supabase.from('car_media').insert({
      car_id: carId,
      url: finalImageUrl,
      kind: 'damage_report',
      filename: fileName,
      sort_order: 999,
      report_type: 'damage_report'
    }).select();

    if (mediaError) {
      console.error('❌ Failed to save media reference:', mediaError);
      console.error('❌ This might be because database migration hasn\'t been run yet!');
      return NextResponse.json({ 
        error: 'Failed to save media reference - check if database migration was run',
        details: mediaError.message,
        imageUrl: finalImageUrl // Return URL anyway
      }, { status: 500 });
    }
    
    console.log('✅ Media reference saved:', insertData);

    console.log('✅ Damage report generation completed successfully');

    return NextResponse.json({
      success: true,
      imageUrl: finalImageUrl,
      fileName,
      carDetails: renderPayload.carDetails,
      annotationsCount: damageAnnotations.length
    });

  } catch (error: any) {
    console.error('❌ Damage report generation failed:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error during damage report generation',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
