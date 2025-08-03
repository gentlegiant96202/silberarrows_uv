import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

const execFileAsync = promisify(execFile);

// NOTE: This route is now for Marketing Kanban only. UV CRM and Used Car modules do not use this route.
export async function POST(req: NextRequest) {
  try {
    console.log('=== UPLOAD FILE API ROUTE (MARKETING KANBAN) ===');

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;

    if (!file || !taskId) {
      return NextResponse.json(
        { error: 'File and taskId are required' },
        { status: 400 }
      );
    }

    console.log(`Processing file upload: ${file.name} (${file.size} bytes) for task: ${taskId}`);

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique file path
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${taskId}/${fileName}`;

    console.log(`Uploading to path: ${filePath}`);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filePath);

    console.log(`File uploaded successfully: ${publicUrl}`);

    // --- THUMBNAIL GENERATION LOGIC ---
    let thumbnailBuffer: Buffer | null = null;
    let thumbnailExt = 'png';
    let thumbnailMime = 'image/png';
    let thumbnailFileName = `${crypto.randomUUID()}.png`;
    let thumbnailPath = `${taskId}/thumbnails/${thumbnailFileName}`;
    let thumbnailUrl: string | null = null;

    if (file.type === 'application/pdf') {
      // Save PDF to temp file
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-thumb-'));
      const pdfPath = path.join(tmpDir, file.name);
      await fs.writeFile(pdfPath, buffer);
      // Use pdftoppm to generate PNG of first page
      const outputPrefix = path.join(tmpDir, 'thumb');
      await execFileAsync('pdftoppm', ['-png', '-f', '1', '-singlefile', '-r', '150', pdfPath, outputPrefix]);
      const thumbPath = `${outputPrefix}.png`;
      thumbnailBuffer = await fs.readFile(thumbPath);
      // Clean up temp files
      await fs.rm(tmpDir, { recursive: true, force: true });
    } else if (file.type.startsWith('video/')) {
      try {
        console.log('[THUMBNAIL] Starting video thumbnail generation for', file.name);
        // Save video to temp file
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vid-thumb-'));
        const videoPath = path.join(tmpDir, file.name);
        await fs.writeFile(videoPath, buffer);
        const thumbPath = path.join(tmpDir, 'thumb.png');
        // Use ffmpeg to extract frame at 0.05s
        console.log('[THUMBNAIL] Running ffmpeg for', videoPath, '->', thumbPath);
        await execFileAsync('ffmpeg', ['-ss', '0.05', '-i', videoPath, '-frames:v', '1', '-q:v', '2', thumbPath]);
        thumbnailBuffer = await fs.readFile(thumbPath);
        console.log('[THUMBNAIL] Thumbnail buffer created for', file.name);
        // Clean up temp files
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (err) {
        console.error('[THUMBNAIL] Error generating video thumbnail:', err);
      }
    }

    // Upload thumbnail if generated
    if (thumbnailBuffer) {
      try {
        console.log('[THUMBNAIL] Uploading thumbnail to', thumbnailPath);
        const { data: thumbUpload, error: thumbError } = await supabase.storage
          .from('media-files')
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: thumbnailMime,
            cacheControl: '3600',
            upsert: false
          });
        if (!thumbError) {
          const { data: { publicUrl: thumbUrl } } = supabase.storage
            .from('media-files')
            .getPublicUrl(thumbnailPath);
          thumbnailUrl = thumbUrl;
          console.log('[THUMBNAIL] Thumbnail uploaded. URL:', thumbnailUrl);
        } else {
          console.error('[THUMBNAIL] Error uploading thumbnail:', thumbError);
        }
      } catch (err) {
        console.error('[THUMBNAIL] Exception during thumbnail upload:', err);
      }
    } else {
      console.log('[THUMBNAIL] No thumbnail buffer generated for', file.name);
    }

    // Update task with new media file
    const { data: currentTask, error: fetchError } = await supabase
      .from('design_tasks')
      .select('media_files')
      .eq('id', taskId)
      .single();

    if (fetchError) {
      console.error('Error fetching current task:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch task' },
        { status: 500 }
      );
    }

    const currentMediaFiles = currentTask.media_files || [];
    const newMediaFile = {
      url: publicUrl,
      name: file.name,
      type: file.type,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      ...(thumbnailUrl ? { thumbnail: thumbnailUrl } : {})
    };

    const updatedMediaFiles = [...currentMediaFiles, newMediaFile];

    const { error: updateError } = await supabase
      .from('design_tasks')
      .update({ media_files: updatedMediaFiles })
      .eq('id', taskId);

    if (updateError) {
      console.error('Error updating media files:', updateError);
      return NextResponse.json(
        { error: 'Failed to update task with media file' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: file.name,
      ...(thumbnailUrl ? { thumbnailUrl } : {})
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 