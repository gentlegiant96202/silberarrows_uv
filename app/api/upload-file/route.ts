import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { execFile } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';
import fs from 'fs/promises';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const execFileAsync = promisify(execFile);

// NOTE: This route is now for Marketing Kanban only. UV CRM and Used Car modules do not use this route.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const taskId = formData.get('taskId') as string;

    if (!file || !taskId) {
      return NextResponse.json(
        { error: 'File and taskId are required' },
        { status: 400 }
      );
    }
    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique file path
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${taskId}/${fileName}`;
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filePath);
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
        // Save video to temp file
        const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vid-thumb-'));
        const videoPath = path.join(tmpDir, file.name);
        await fs.writeFile(videoPath, buffer);
        const thumbPath = path.join(tmpDir, 'thumb.png');
        
        // Use ffmpeg to extract frame at 0.05s
        await execFileAsync('ffmpeg', ['-ss', '0.05', '-i', videoPath, '-frames:v', '1', '-q:v', '2', thumbPath]);
        
        // Check if thumbnail was created
        const thumbStats = await fs.stat(thumbPath);
        thumbnailBuffer = await fs.readFile(thumbPath);
        // Clean up temp files
        await fs.rm(tmpDir, { recursive: true, force: true });
      } catch (err) {
        // Continue without thumbnail - this is not a fatal error
      }
    }

    // Upload thumbnail if generated
    if (thumbnailBuffer) {
      try {
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
        } else {
        }
      } catch (err) {
      }
    } else {
    }

    // Do not touch DB here. Frontend will update design_tasks.media_files under user session.
    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: file.name,
      ...(thumbnailUrl ? { thumbnailUrl } : {})
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 