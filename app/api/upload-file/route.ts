import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    console.log('=== UPLOAD FILE API ROUTE ===');

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

    // Create unique file path (same pattern as MediaUploader)
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `${taskId}/${fileName}`;

    console.log(`Uploading to path: ${filePath}`);

    // Upload to Supabase Storage using regular client (same as MediaUploader)
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

    // Get public URL (same as MediaUploader)
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filePath);

    console.log(`File uploaded successfully: ${publicUrl}`);

    // Update task with new media file using regular client
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
      uploadedAt: new Date().toISOString()
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