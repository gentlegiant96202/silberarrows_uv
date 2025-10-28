import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

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
    
    const buffer = Buffer.from(await response.arrayBuffer());
    console.log(`Downloaded PDF: ${buffer.length} bytes`);

    // Create temp directory
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'));
    const pdfPath = path.join(tmpDir, 'input.pdf');
    await fs.writeFile(pdfPath, buffer);

    console.log(`PDF saved to temp: ${pdfPath}`);

    // Convert PDF to PNG images (one per page) using pdftoppm
    const outputPrefix = path.join(tmpDir, 'page');
    console.log('Running pdftoppm...');
    
    try {
      await execFileAsync('pdftoppm', [
        '-png',           // Output as PNG
        '-r', '150',      // 150 DPI for quality
        '-aa', 'yes',     // Enable antialiasing
        '-aaVector', 'yes', // Enable vector antialiasing
        pdfPath,
        outputPrefix
      ]);
    } catch (error) {
      console.error('pdftoppm error:', error);
      await fs.rm(tmpDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: 'PDF conversion failed. Ensure pdftoppm is installed (brew install poppler on macOS).' },
        { status: 500 }
      );
    }

    console.log('PDF converted to images');

    // Read all generated PNG files
    const files = await fs.readdir(tmpDir);
    const pngFiles = files
      .filter(f => f.startsWith('page-') && f.endsWith('.png'))
      .sort(); // Sort to maintain page order

    console.log(`Found ${pngFiles.length} pages`);

    if (pngFiles.length === 0) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      return NextResponse.json(
        { error: 'No pages were generated from PDF' },
        { status: 500 }
      );
    }

    // Process each page: flatten to white background and upload
    const uploadedPages: Array<{
      url: string;
      pageIndex: number;
      thumbnail: string;
      type: string;
      name: string;
      originalType: string;
    }> = [];

    for (let i = 0; i < pngFiles.length; i++) {
      const pngFile = pngFiles[i];
      const pagePath = path.join(tmpDir, pngFile);
      const pageIndex = i + 1;

      console.log(`Processing page ${pageIndex}/${pngFiles.length}...`);

      // Flatten image to white background using sharp
      const processedBuffer = await sharp(pagePath)
        .flatten({ background: { r: 255, g: 255, b: 255 } })
        .png({ palette: false })
        .toBuffer();

      // Create thumbnail (300px max width/height)
      const thumbnailBuffer = await sharp(processedBuffer)
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
        .upload(filePath, processedBuffer, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error(`Error uploading page ${pageIndex}:`, uploadError);
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
        pageIndex: pageIndex,
        thumbnail: thumbnailUrl,
        type: 'image/png',
        name: `pdf_page_${pageIndex}.png`,
        originalType: 'application/pdf' // Mark as converted from PDF
      });

      console.log(`Page ${pageIndex} uploaded: ${publicUrl}`);
    }

    // Clean up temp directory
    await fs.rm(tmpDir, { recursive: true, force: true });
    console.log('Temp directory cleaned up');

    console.log(`=== PDF CONVERSION COMPLETE: ${uploadedPages.length} pages ===`);

    return NextResponse.json({
      success: true,
      pages: uploadedPages,
      totalPages: uploadedPages.length
    });

  } catch (error) {
    console.error('PDF conversion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

