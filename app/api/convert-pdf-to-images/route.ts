import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

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
    const body = await req.json();
    const { pdfUrl, taskId } = body;

    if (!pdfUrl || !taskId) {
      return NextResponse.json(
        { error: 'pdfUrl and taskId are required' },
        { status: 400 }
      );
    }

    const rendererUrl = process.env.NEXT_PUBLIC_RENDERER_URL || process.env.RENDERER_URL;
    if (!rendererUrl) {
      return NextResponse.json(
        { error: 'Renderer service URL not configured' },
        { status: 500 }
      );
    }
    const rendererResponse = await fetch(`${rendererUrl}/render-pdf-to-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfUrl, scale: 2.0 })
    });

    if (!rendererResponse.ok) {
      const errorText = await rendererResponse.text();
      return NextResponse.json(
        { error: 'Renderer service failed', details: errorText },
        { status: 502 }
      );
    }

    const rendererPayload = await rendererResponse.json();
    const rendererPages = Array.isArray(rendererPayload.pages) ? rendererPayload.pages : [];

    if (!rendererPages.length) {
      return NextResponse.json(
        { error: 'Renderer returned no pages' },
        { status: 500 }
      );
    }
    const uploadedPages: Array<{
      url: string;
      pageIndex: number;
      thumbnail: string;
      type: string;
      name: string;
      originalType: string;
    }> = [];

    for (const page of rendererPages) {
      try {
        // Handle both dataURL and dataUrl (renderer returns both)
        const dataUrlField = page.dataURL || page.dataUrl;
        const base64Data = typeof dataUrlField === 'string' && dataUrlField.includes(',')
          ? dataUrlField.split(',')[1]
          : dataUrlField;

        if (!base64Data) {
          continue;
        }

        const pageBuffer = Buffer.from(base64Data, 'base64');

        const thumbnailBuffer = await sharp(pageBuffer)
          .resize(300, 300, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .png()
          .toBuffer();

        const fileName = `${randomUUID()}.png`;
        const filePath = `${taskId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-files')
          .upload(filePath, pageBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('media-files')
          .getPublicUrl(filePath);

        const thumbnailFileName = `${randomUUID()}.png`;
        const thumbnailPath = `${taskId}/thumbnails/${thumbnailFileName}`;

        const { error: thumbError } = await supabase.storage
          .from('media-files')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/png',
            cacheControl: '3600',
            upsert: false
          });

        let thumbnailUrl = publicUrl;
        if (!thumbError) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('media-files')
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrl;
        }

        uploadedPages.push({
          url: publicUrl,
          pageIndex: page.pageIndex,
          thumbnail: thumbnailUrl,
          type: 'image/png',
          name: `pdf_page_${page.pageIndex}.png`,
          originalType: 'application/pdf'
        });
      } catch (pageError) {
      }
    }
    return NextResponse.json({
      success: true,
      pages: uploadedPages,
      totalPages: uploadedPages.length
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
