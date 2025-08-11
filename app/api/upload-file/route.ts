import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

    // Do not touch DB here. Frontend will update design_tasks.media_files under user session.
    return NextResponse.json({
      success: true,
      fileUrl: publicUrl,
      fileName: file.name
    });

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 