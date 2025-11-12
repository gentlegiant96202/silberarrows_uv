import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';

// 1. Add a helper for comma formatting
function formatPrice(num: number | string | null | undefined) {
  if (num === null || num === undefined || num === '') return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// 2. Get today's date in dd/mm/yyyy
const today = new Date();
const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth()+1).padStart(2, '0')}/${today.getFullYear()}`;

export async function POST(request: NextRequest) {
  try {
    const { car, agreementType } = await request.json();
    const isDriveWhilstSell = agreementType === 'drive-whilst-sell';
    // Fetch damage report image URL if it exists
    let damageReportImageUrl = '';
    if (car.id) {
      const { data: damageReportMedia } = await supabase
        .from('car_media')
        .select('url')
        .eq('car_id', car.id)
        .eq('kind', 'damage_report')
        .eq('report_type', 'damage_report')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (damageReportMedia) {
        damageReportImageUrl = damageReportMedia.url;
      } else {
      }
    }

    // Add damage report image URL to car data (with fallback to base diagram)
    const fallbackDiagramUrl = `${process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app'}/Pre uvc-2.jpg`;
    const enhancedCarData = {
      ...car,
      damage_diagram_image_url: damageReportImageUrl || fallbackDiagramUrl
    };

    // Railway renderer loads templates from files, so we skip inline HTML generation
    // Use your Railway renderer instead of PDF Shift
    const rendererResponse = await fetch(`${process.env.NEXT_PUBLIC_RENDERER_URL || 'https://story-render-production.up.railway.app'}/render-consignment-agreement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        carData: enhancedCarData,
        agreementType: agreementType
      })
    });

    if (!rendererResponse.ok) {
      const errorText = await rendererResponse.text();
      throw new Error(`Renderer API Error: ${errorText}`);
    }

    const rendererResult = await rendererResponse.json();
    if (!rendererResult.success) {
      throw new Error(`Renderer Error: ${rendererResult.error}`);
    }

    const fileSizeMB = rendererResult.pdfStats?.fileSizeMB || 'Unknown';
    // Sanitize filename
    const sanitizedStockNumber = (car.stock_number || 'draft')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '');

    // Save PDF to vehicle documents
    try {
      const agreementTypeLabel = isDriveWhilstSell ? 'drive-whilst-sell' : 'consignment';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19); // Format: YYYY-MM-DDTHH-MM-SS
      const filename = `${sanitizedStockNumber}-${agreementTypeLabel}-agreement-${timestamp}.pdf`;
      
      // First, delete any existing agreements (both consignment and drive-whilst-sell)
      const { data: existingMedia } = await supabase
        .from('car_media')
        .select('id, url, filename')
        .eq('car_id', car.id)
        .eq('kind', 'document')
        .or('filename.ilike.%consignment-agreement%,filename.ilike.%drive-whilst-sell-agreement%');
      
      if (existingMedia && existingMedia.length > 0) {
        // Delete from storage and database
        for (const media of existingMedia) {
          try {
            // Extract path from URL for storage deletion
            const urlParts = media.url.split('/');
            const storagePath = `${car.id}/${urlParts[urlParts.length - 1]}`;
            const { error: storageError } = await supabase.storage.from('car-media').remove([storagePath]);
            if (storageError) {
            }
            const { error: dbError } = await supabase.from('car_media').delete().eq('id', media.id);
            if (dbError) {
            } else {
            }
          } catch (error) {
          }
        }
      }
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('car-media')
        .upload(
          `${car.id}/${filename}`,
          Buffer.from(rendererResult.pdfData, 'base64'),
          {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: true
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from('car-media')
        .getPublicUrl(uploadData.path);

      // Save reference to database
      const { error: mediaError } = await supabase
        .from('car_media')
        .insert({
          car_id: car.id,
          url: urlData.publicUrl,
          filename: filename,
          kind: 'document',
          is_primary: false,
        });

      if (mediaError) {
        // Don't throw here - PDF was still generated successfully
      } else {
      }

    } catch (saveError) {
      // Continue - PDF generation was successful even if saving failed
    }

    return NextResponse.json({
      success: true,
      message: `${isDriveWhilstSell ? 'Drive Whilst Sell' : 'Consignment'} Agreement generated successfully`,
      pdfData: rendererResult.pdfData,
      fileName: `${isDriveWhilstSell ? 'Drive_Whilst_Sell' : 'Consignment'}_Agreement_${sanitizedStockNumber}.pdf`,
      pdfStats: rendererResult.pdfStats
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to generate agreement' 
      },
      { status: 500 }
    );
  }
}
