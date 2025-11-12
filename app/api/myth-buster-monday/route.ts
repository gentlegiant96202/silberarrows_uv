import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Create admin client for permission checking with cache-busting headers
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
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
      return { error: 'Permission check failed', status: 500 };
    }

    const perms = permissions?.[0] || { can_view: false, can_create: false, can_edit: false, can_delete: false };
    
    // Check required permission
    let hasPermission = false;
    switch (requiredPermission) {
      case 'view': hasPermission = perms.can_view; break;
      case 'create': hasPermission = perms.can_create; break;
      case 'edit': hasPermission = perms.can_edit; break;
      case 'delete': hasPermission = perms.can_delete; break;
    }

    if (!hasPermission) {
      return { error: `Insufficient permissions for ${requiredPermission} operation`, status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    return { error: 'Permission validation failed', status: 500 };
  }
}

// GET - Fetch all myth buster monday items
export async function GET(req: NextRequest) {
  try {
    // Validate user has view permission
    const authResult = await validateUserPermissions(req, 'view');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const marketingStatus = searchParams.get('marketing_status');
    let query = supabaseAdmin
      .from('myth_buster_monday')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by status if specified
    if (status) {
      query = query.eq('status', status);
    }

    // Filter by marketing status if specified
    if (marketingStatus) {
      query = query.eq('marketing_status', marketingStatus);
    }

    const { data: items, error } = await query;

    if (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
    return NextResponse.json(items);
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// POST - Create a new myth buster monday item
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate user has create permission
    const authResult = await validateUserPermissions(req, 'create');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { 
      title, 
      subtitle, 
      description, 
      myth, 
      fact, 
      media_files, 
      media_files_a, 
      media_files_b, 
      badge_text, 
      status,
      marketing_status,
      titleFontSize, 
      imageFit, 
      imageAlignment, 
      imageZoom, 
      imageVerticalPosition,
      generated_image_a_url,
      generated_image_b_url,
      generated_image_a_id,
      generated_image_b_id
    } = body;
    // Validate and sanitize media files
    const sanitizedMediaFiles = Array.isArray(media_files) ? media_files.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : [];
    
    const sanitizedMediaFilesA = Array.isArray(media_files_a) ? media_files_a.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : null;
    
    const sanitizedMediaFilesB = Array.isArray(media_files_b) ? media_files_b.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : null;

    const itemData: any = {
      title,
      subtitle: subtitle ?? 'Independent Mercedes Service',
      description,
      myth: myth ?? null,
      fact: fact ?? null,
      badge_text: badge_text ?? 'MYTH BUSTER MONDAY',
      media_files: sanitizedMediaFiles,
      media_files_a: sanitizedMediaFilesA,
      media_files_b: sanitizedMediaFilesB,
      content_type: 'image',
      status: status ?? 'draft',
      marketing_status: marketing_status ?? 'not_sent',
      created_by: authResult.user?.id,
      image_width: 1080,
      image_height: 1920
    };

    // Add form fields if they exist in the request
    if (titleFontSize !== undefined) itemData.titlefontsize = titleFontSize;
    if (imageFit !== undefined) itemData.imagefit = imageFit;
    if (imageAlignment !== undefined) itemData.imagealignment = imageAlignment;
    if (imageZoom !== undefined) itemData.imagezoom = imageZoom;
    if (imageVerticalPosition !== undefined) itemData.imageverticalposition = imageVerticalPosition;
    if (generated_image_a_url !== undefined) itemData.generated_image_a_url = generated_image_a_url;
    if (generated_image_b_url !== undefined) itemData.generated_image_b_url = generated_image_b_url;
    if (generated_image_a_id !== undefined) itemData.generated_image_a_id = generated_image_a_id;
    if (generated_image_b_id !== undefined) itemData.generated_image_b_id = generated_image_b_id;
    const { data, error } = await supabaseAdmin
      .from('myth_buster_monday')
      .insert([itemData])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT - Update an existing myth buster monday item
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      id, 
      title, 
      subtitle, 
      description, 
      myth, 
      fact, 
      media_files, 
      media_files_a, 
      media_files_b, 
      badge_text, 
      status,
      marketing_status,
      titleFontSize, 
      imageFit, 
      imageAlignment, 
      imageZoom, 
      imageVerticalPosition,
      generated_image_a_url,
      generated_image_b_url,
      generated_image_a_id,
      generated_image_b_id
    } = body;
    
    // Validate user has edit permission
    const authResult = await validateUserPermissions(req, 'edit');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Validate and sanitize media files for update
    const sanitizedMediaFiles = Array.isArray(media_files) ? media_files.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : [];
    
    const sanitizedMediaFilesA = Array.isArray(media_files_a) ? media_files_a.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : undefined;
    
    const sanitizedMediaFilesB = Array.isArray(media_files_b) ? media_files_b.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : undefined;

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only include fields if they are actually provided in the request
    if (title !== undefined) updateData.title = title;
    if (subtitle !== undefined) updateData.subtitle = subtitle;
    if (description !== undefined) updateData.description = description;
    if (myth !== undefined) updateData.myth = myth;
    if (fact !== undefined) updateData.fact = fact;
    if (badge_text !== undefined) updateData.badge_text = badge_text;
    
    // Handle media files - only update if provided
    if (media_files !== undefined) updateData.media_files = sanitizedMediaFiles;
    if (media_files_a !== undefined) updateData.media_files_a = sanitizedMediaFilesA;
    if (media_files_b !== undefined) updateData.media_files_b = sanitizedMediaFilesB;

    // Add status fields if provided
    if (status !== undefined) updateData.status = status;
    if (marketing_status !== undefined) updateData.marketing_status = marketing_status;

    // Add form fields if they exist in the request
    if (titleFontSize !== undefined) updateData.titlefontsize = titleFontSize;
    if (imageFit !== undefined) updateData.imagefit = imageFit;
    if (imageAlignment !== undefined) updateData.imagealignment = imageAlignment;
    if (imageZoom !== undefined) updateData.imagezoom = imageZoom;
    if (imageVerticalPosition !== undefined) updateData.imageverticalposition = imageVerticalPosition;
    if (generated_image_a_url !== undefined) updateData.generated_image_a_url = generated_image_a_url;
    if (generated_image_b_url !== undefined) updateData.generated_image_b_url = generated_image_b_url;
    if (generated_image_a_id !== undefined) updateData.generated_image_a_id = generated_image_a_id;
    if (generated_image_b_id !== undefined) updateData.generated_image_b_id = generated_image_b_id;
    const { data, error } = await supabaseAdmin
      .from('myth_buster_monday')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// DELETE - Delete a myth buster monday item
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Myth buster monday item ID is required' }, { status: 400 });
    }
    // Validate user has delete permission
    const authResult = await validateUserPermissions(req, 'delete');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { error } = await supabaseAdmin
      .from('myth_buster_monday')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
    return NextResponse.json({ message: 'Myth buster monday item deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
