import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to validate user permissions
async function validateUserPermissions(request: NextRequest, requiredPermission: 'edit' | 'delete') {
  try {
    // Get the Authorization header (sent by frontend)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authorization header missing', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token using admin client
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // Get user permissions for service module
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'service'
      });

    if (permError) {
      console.error('Permission check error:', permError);
      return { error: 'Permission check failed', status: 500 };
    }

    const perms = permissions?.[0] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
    
    // Check required permission
    let hasPermission = false;
    switch (requiredPermission) {
      case 'edit': hasPermission = perms.can_edit; break;
      case 'delete': hasPermission = perms.can_delete; break;
    }

    if (!hasPermission) {
      return { error: `Insufficient permissions for ${requiredPermission} operation`, status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { error: 'Permission validation failed', status: 500 };
  }
}

// POST - Upload new PDF
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate edit permissions (uploading PDF is considered editing)
  const validation = await validateUserPermissions(request, 'edit');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const contractId = id;
    const formData = await request.formData();
    
    const file = formData.get('pdf') as File;
    const type = formData.get('type') as string || 'service';
    const referenceNo = formData.get('referenceNo') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No PDF file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'File must be a PDF' },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const filename = `${type}_contract_${referenceNo}_${timestamp}.pdf`;
    const filePath = `service-documents/${filename}`;

    console.log('📤 Uploading PDF to Supabase storage:', filePath);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload PDF to storage', details: uploadError.message },
        { status: 500 }
      );
    }

    console.log('✅ PDF uploaded successfully:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL generated:', publicUrl);

    // Update contract with PDF URL
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';
    
    const { data: updatedContract, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        pdf_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      
      // Try to clean up uploaded file
      try {
        await supabase.storage
          .from('service-documents')
          .remove([filePath]);
      } catch (cleanupError) {
        console.error('Failed to cleanup uploaded file:', cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Failed to update contract with PDF URL', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contract updated with PDF URL');

    // Log activity
    try {
      await supabase
        .from('contract_activities')
        .insert({
          contract_id: contractId,
          contract_type: type,
          activity_type: 'pdf_uploaded',
          activity_description: `PDF document uploaded by ${validation.user.email}`,
          activity_data: {
            filename: filename,
            file_size: file.size,
            uploaded_by: validation.user.email,
            uploaded_at: new Date().toISOString(),
            pdf_url: publicUrl
          }
        });
    } catch (activityError) {
      console.error('Failed to log activity:', activityError);
      // Continue without failing
    }

    return NextResponse.json({
      success: true,
      pdf_url: publicUrl,
      filename: filename,
      message: 'PDF uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to upload PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Remove PDF
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate delete permissions
  const validation = await validateUserPermissions(request, 'delete');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const contractId = id;
    
    // Try to parse JSON body, default to service type if no body
    let type = 'service';
    try {
      const body = await request.json();
      type = body.type || 'service';
    } catch (e) {
      // No JSON body sent, use default type 'service'
      console.log('No JSON body in DELETE request, defaulting to service type');
    }

    // Get current contract to find PDF URL
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';
    
    const { data: contract, error: fetchError } = await supabase
      .from(tableName)
      .select('pdf_url, reference_no')
      .eq('id', contractId)
      .single();

    if (fetchError) {
      console.error('Error fetching contract:', fetchError);
      return NextResponse.json(
        { error: 'Contract not found', details: fetchError.message },
        { status: 404 }
      );
    }

    if (!contract.pdf_url) {
      return NextResponse.json(
        { error: 'No PDF found for this contract' },
        { status: 404 }
      );
    }

    console.log('🗑️ Deleting PDF:', contract.pdf_url);

    // Extract file path from URL
    try {
      const url = new URL(contract.pdf_url);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === 'service-documents');
      
      if (bucketIndex === -1) {
        throw new Error('Invalid storage URL format');
      }
      
      const filePath = pathParts.slice(bucketIndex + 1).join('/');
      console.log('📁 File path to delete:', filePath);

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('service-documents')
        .remove([filePath]);

      if (storageError) {
        console.error('Storage deletion error:', storageError);
        // Continue with database update even if storage deletion fails
      } else {
        console.log('✅ PDF deleted from storage');
      }
    } catch (urlError) {
      console.error('Error parsing PDF URL for deletion:', urlError);
      // Continue with database update
    }

    // Update contract to remove PDF URL
    const { data: updatedContract, error: updateError } = await supabase
      .from(tableName)
      .update({ 
        pdf_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('Database update error:', updateError);
      return NextResponse.json(
        { error: 'Failed to update contract', details: updateError.message },
        { status: 500 }
      );
    }

    console.log('✅ Contract updated - PDF URL removed');

    // Log activity
    try {
      await supabase
        .from('contract_activities')
        .insert({
          contract_id: contractId,
          contract_type: type,
          activity_type: 'pdf_deleted',
          activity_description: `PDF document deleted by ${validation.user.email}`,
          activity_data: {
            deleted_url: contract.pdf_url,
            deleted_by: validation.user.email,
            deleted_at: new Date().toISOString()
          }
        });
    } catch (activityError) {
      console.error('Failed to log activity:', activityError);
      // Continue without failing
    }

    return NextResponse.json({
      success: true,
      message: 'PDF deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting PDF:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 