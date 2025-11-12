import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const bannerType = formData.get('bannerType') as string;
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert file to buffer (exactly like upload-file route)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename (exactly like upload-file route)
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `email-signatures/${fileName}`;
    // Upload to Supabase Storage (exactly like upload-file route)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('media-files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // Get public URL (exactly like upload-file route)
    const { data: { publicUrl } } = supabase.storage
      .from('media-files')
      .getPublicUrl(filePath);
    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      }
    });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Remove banner image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');
    const signatureId = searchParams.get('signatureId');
    const bannerType = searchParams.get('bannerType');

    if (!mediaId || !signatureId || !bannerType) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Get media record
    const { data: mediaRecord, error: fetchError } = await supabase
      .from('email_signature_media')
      .select('file_path')
      .eq('id', mediaId)
      .single();

    if (fetchError || !mediaRecord) {
      return NextResponse.json({ error: 'Media record not found' }, { status: 404 });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('email-signatures')
      .remove([mediaRecord.file_path]);

    if (storageError) {
    }

    // Delete media record
    const { error: deleteError } = await supabase
      .from('email_signature_media')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Clear banner URL from signature
    const updateField = bannerType === 'banner_1' ? 'banner_image_1_url' : 'banner_image_2_url';
    await supabase
      .from('email_signatures')
      .update({ [updateField]: null })
      .eq('id', signatureId);

    return NextResponse.json({ success: true });

  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
