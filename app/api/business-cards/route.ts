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
      return { error: `Insufficient permissions for ${requiredPermission} operation`, status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { error: 'Internal server error', status: 500 };
  }
}

// Helper function to generate unique slug
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim();
}

// GET - Fetch all business cards
export async function GET(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'view');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Fetch business cards
    const { data: businessCards, error } = await supabaseAdmin
      .from('business_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch business cards' }, { status: 500 });
    }

    return NextResponse.json({ businessCards });
  } catch (error) {
    console.error('GET /api/business-cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new business card
export async function POST(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'create');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    const { user } = validation;
    const body = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.name);
    
    // Ensure slug is unique
    let slugCounter = 1;
    let originalSlug = slug;
    
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('business_cards')
        .select('id')
        .eq('slug', slug)
        .single();
      
      if (!existing) break;
      
      slug = `${originalSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Create business card
    const businessCardData = {
      slug,
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
      is_active: body.is_active !== undefined ? body.is_active : true,
      created_by: user.id
    };

    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .insert(businessCardData)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to create business card' }, { status: 500 });
    }

    return NextResponse.json({ businessCard }, { status: 201 });
  } catch (error) {
    console.error('POST /api/business-cards error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
