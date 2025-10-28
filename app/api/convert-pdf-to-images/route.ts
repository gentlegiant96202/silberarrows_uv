import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * Converts a multi-page PDF to individual PNG images (one per page)
 * and uploads them to Supabase Storage.
 * 
 * POST /api/convert-pdf-to-images
 * Body: JSON with:
 *   - pdfUrl: URL of the PDF file already uploaded to Supabase
 *   - taskId: The design task ID
 * 
 * Returns: Array of image URLs with page indices
 */
export async function POST(req: NextRequest) {
  try {
    console.log('=== PDF TO IMAGES CONVERSION API ===');

    const body = await req.json();
    const { pdfUrl, taskId } = body;

    if (!pdfUrl || !taskId) {
      return NextResponse.json(
        { error: 'pdfUrl and taskId are required' },
        { status: 400 }
      );
    }

    console.log(`Converting PDF from URL: ${pdfUrl} for task: ${taskId}`);

    // Download PDF from URL
    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to download PDF: ${response.statusText}`);
    }
    
    const pdfBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`Downloaded PDF: ${pdfBuffer.length} bytes`);

    // Use sharp to convert PDF pages to images
    // Sharp can handle PDF files directly using libvips
    const uploadedPages: Array<{
      url: string;
      pageIndex: number;
      thumbnail: string;
      type: string;
      name: string;
      originalType: string;
    }> = [];

    try {
      // Get PDF metadata to determine number of pages
      const metadata = await sharp(pdfBuffer, { pages: -1 }).metadata();
      const pageCount = metadata.pages || 1;
      
      console.log(`PDF has ${pageCount} page(s)`);

      // Convert each page
      for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
        const pageNumber = pageIndex + 1;
        console.log(`Processing page ${pageNumber}/${pageCount}...`);

        // Extract specific page and convert to PNG with white background
        const pageBuffer = await sharp(pdfBuffer, { 
          page: pageIndex,
          density: 150 // 150 DPI for good quality
        })
          .flatten({ background: { r: 255, g: 255, b: 255 } })
          .png()
          .toBuffer();

        // Create thumbnail (300px max width/height)
        const thumbnailBuffer = await sharp(pageBuffer)
          .resize(300, 300, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png()
          .toBuffer();

        // Upload full-size page image
        const fileName = `${crypto.randomUUID()}.png`;
        const filePath = `${taskId}/${fileName}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('media-files')
          .upload(filePath, pageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error(`Error uploading page ${pageNumber}:`, uploadError);
          continue;
        }

        // Get public URL for page image
        const { data: { publicUrl } } = supabase.storage
          .from('media-files')
          .getPublicUrl(filePath);

        // Upload thumbnail
        const thumbnailFileName = `${crypto.randomUUID()}.png`;
        const thumbnailPath = `${taskId}/thumbnails/${thumbnailFileName}`;
        
        const { data: thumbUpload, error: thumbError } = await supabase.storage
          .from('media-files')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        let thumbnailUrl = publicUrl; // Fallback to page image if thumbnail upload fails
        if (!thumbError) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('media-files')
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrl;
        }

        uploadedPages.push({
          url: publicUrl,
          pageIndex: pageNumber,
          thumbnail: thumbnailUrl,
          type: 'image/png',
          name: `pdf_page_${pageNumber}.png`,
          originalType: 'application/pdf' // Mark as converted from PDF
        });

        console.log(`Page ${pageNumber} uploaded: ${publicUrl}`);
      }

      console.log(`=== PDF CONVERSION COMPLETE: ${uploadedPages.length} pages ===`);

      return NextResponse.json({
        success: true,
        pages: uploadedPages,
        totalPages: uploadedPages.length
      });

    } catch (sharpError) {
      console.error('Sharp PDF processing error:', sharpError);
      
      // If sharp doesn't support PDF on this platform, return helpful error
      return NextResponse.json(
        { 
          error: 'PDF conversion failed. This feature requires libvips with PDF support.',
          details: sharpError instanceof Error ? sharpError.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('PDF conversion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
