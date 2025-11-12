import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
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
      return { error: `Insufficient permissions for ${requiredPermission} operation`, status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    return { error: 'Internal server error', status: 500 };
  }
}

// No longer need slug generation - using simple auto-generated IDs

// GET - Fetch specific business card
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    
    // Validate permissions
    const validation = await validateUserPermissions(request, 'view');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Fetch business card
    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .select('*')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    return NextResponse.json({ businessCard });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update business card
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    
    // Validate permissions
    const validation = await validateUserPermissions(request, 'edit');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Check if business card exists
    const { data: existingCard, error: fetchError } = await supabaseAdmin
      .from('business_cards')
      .select('*')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    // Update business card (no slug handling needed with simple IDs)
    const businessCardData = {
      name: body.name,
      title: body.title || null,
      company: body.company || null,
      landline_phone: body.landline_phone || null,
      mobile_phone: body.mobile_phone || null,
      email: body.email || null,
      website: body.website || null,
      google_review_url: body.google_review_url || null,
      facebook_url: body.facebook_url || null,
      instagram_url: body.instagram_url || null,
      linkedin_url: body.linkedin_url || null,
      is_active: body.is_active !== undefined ? body.is_active : existingCard.is_active,
      updated_at: new Date().toISOString()
    };

    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .update(businessCardData)
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to update business card' }, { status: 500 });
    }

    return NextResponse.json({ businessCard });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete business card
export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    
    // Validate permissions
    const validation = await validateUserPermissions(request, 'delete');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Check if business card exists
    const { data: existingCard, error: fetchError } = await supabaseAdmin
      .from('business_cards')
      .select('id')
      .eq('id', params.id)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    // Delete business card
    const { error } = await supabaseAdmin
      .from('business_cards')
      .delete()
      .eq('id', params.id);

    if (error) {
      return NextResponse.json({ error: 'Failed to delete business card' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Business card deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
