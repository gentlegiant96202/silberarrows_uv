import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create admin client for permission checking
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Helper function to validate user permissions
async function validateUserPermissions(request: NextRequest, requiredPermission: 'view' | 'create' | 'edit' | 'delete') {
  try {
    // Get the Authorization header (sent by frontend)
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authorization header missing', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token using admin client
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // Get user permissions for marketing module
    const { data: permissions, error: permError } = await supabaseAdmin
      .rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'marketing'
      });

    if (permError) {
      console.error('Permission check error:', permError);
      return { error: 'Permission check failed', status: 500 };
    }

    const perms = permissions?.[0] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
    
    // Check required permission
    let hasPermission = false;
    switch (requiredPermission) {
      case 'view':
        hasPermission = perms.can_view;
        break;
      case 'create':
        hasPermission = perms.can_create;
        break;
      case 'edit':
        hasPermission = perms.can_edit;
        break;
      case 'delete':
        hasPermission = perms.can_delete;
        break;
    }

    if (!hasPermission) {
      return { error: 'Insufficient permissions', status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { error: 'Permission validation failed', status: 500 };
  }
}

// PUT - Update form fields only
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Updating form fields:', body);

    const { id, titleFontSize, imageFit, imageAlignment, imageZoom, imageVerticalPosition } = body;
    
    // Validate user has edit permission
    const authResult = await validateUserPermissions(req, 'edit');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!id) {
      return NextResponse.json({ error: 'Content pillar ID is required' }, { status: 400 });
    }

    // Build update object with only form fields
    const updateData: any = {};
    if (titleFontSize !== undefined) updateData.titleFontSize = titleFontSize;
    if (imageFit !== undefined) updateData.imageFit = imageFit;
    if (imageAlignment !== undefined) updateData.imageAlignment = imageAlignment;
    if (imageZoom !== undefined) updateData.imageZoom = imageZoom;
    if (imageVerticalPosition !== undefined) updateData.imageVerticalPosition = imageVerticalPosition;
    
    updateData.updated_at = new Date().toISOString();

    console.log('Form fields update data:', updateData);
    console.log('Content pillar ID:', id);

    // Use direct Supabase update instead of raw SQL
    console.log('Updating form fields with data:', updateData);
    
    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating form fields:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return NextResponse.json({ error: error.message, details: error }, { status: 500 });
    }

    console.log('Form fields updated successfully:', data);
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error updating form fields:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
