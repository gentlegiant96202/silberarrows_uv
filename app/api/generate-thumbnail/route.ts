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

export async function POST(req: NextRequest) {
  try {
    const { taskId, fileUrl } = await req.json();
    if (!taskId || !fileUrl) {
      return NextResponse.json({ error: 'taskId and fileUrl are required' }, { status: 400 });
    }

    // Only handle videos; for images/PDFs we skip
    const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(fileUrl) || fileUrl.includes('video');
    if (!isVideo) {
      return NextResponse.json({ error: 'Not a video file' }, { status: 400 });
    }

    // Create temp dir and output path
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'vid-thumb-'));
    const thumbPath = path.join(tmpDir, 'thumb.png');

    // Use ffmpeg to extract a frame from the remote URL directly
    // Note: ffmpeg can read http(s) URLs
    await execFileAsync('ffmpeg', ['-ss', '0.1', '-i', fileUrl, '-frames:v', '1', '-q:v', '2', thumbPath]);

    // Ensure file exists
    const stats = await fs.stat(thumbPath);
    if (!stats || stats.size === 0) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      return NextResponse.json({ error: 'Failed to generate thumbnail' }, { status: 500 });
    }

    const thumbnailBuffer = await fs.readFile(thumbPath);

    // Upload thumbnail to storage
    const thumbnailFileName = `${crypto.randomUUID()}.png`;
    const thumbnailPath = `${taskId}/thumbnails/${thumbnailFileName}`;

    const { error: thumbError } = await supabase.storage
      .from('media-files')
      .upload(thumbnailPath, thumbnailBuffer, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    // Clean up temp files
    await fs.rm(tmpDir, { recursive: true, force: true });

    if (thumbError) {
      return NextResponse.json({ error: `Thumbnail upload failed: ${thumbError.message}` }, { status: 500 });
    }

    const { data: { publicUrl: thumbnailUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(thumbnailPath);

    // Attach thumbnail to the media_files array for this task entry (matching by url)
    const { data: task, error: fetchErr } = await supabase
      .from('design_tasks')
      .select('media_files')
      .eq('id', taskId)
      .single();

    if (!fetchErr && task?.media_files && Array.isArray(task.media_files)) {
      const updated = task.media_files.map((m: any) => {
        const currentUrl = typeof m === 'string' ? m : m.url;
        if (currentUrl === fileUrl) {
          if (typeof m === 'string') {
            return { url: m, thumbnail: thumbnailUrl };
          }
          return { ...m, thumbnail: thumbnailUrl };
        }
        return m;
      });

      await supabase
        .from('design_tasks')
        .update({ media_files: updated })
        .eq('id', taskId);
    }

    return NextResponse.json({ success: true, thumbnailUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
} 