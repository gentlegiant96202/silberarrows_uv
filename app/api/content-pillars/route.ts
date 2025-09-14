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
    console.error('Permission validation error:', error);
    return { error: 'Permission validation failed', status: 500 };
  }
}

// GET - Fetch all content pillars
export async function GET(req: NextRequest) {
  try {
    console.log('🔍 API: Fetching content pillars...');
    
    // Validate user has view permission
    const authResult = await validateUserPermissions(req, 'view');
    if (authResult.error) {
      console.log('❌ API: Auth error:', authResult.error);
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    console.log('✅ API: Auth validated, user ID:', authResult.user?.id);
    console.log('👤 API: User email:', authResult.user?.email);

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const dayOfWeek = searchParams.get('day_of_week');

    console.log('📋 API: Query params - dayOfWeek:', dayOfWeek);

    let query = supabaseAdmin
      .from('content_pillars')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🗂️ API: Base query created');

    // Filter by day if specified
    if (dayOfWeek) {
      query = query.eq('day_of_week', dayOfWeek);
    }

    const { data: pillars, error } = await query;

    if (error) {
      console.error('❌ API: Error fetching content pillars:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('📦 API: Fetched pillars count:', pillars?.length || 0);
    console.log('📋 API: First 5 pillar titles:', pillars?.slice(0, 5).map(p => p.title) || []);
    
    // Debug Monday pillars specifically
    const mondayPillars = pillars?.filter(p => p.day_of_week === 'monday') || [];
    console.log('📅 API: Monday pillars count:', mondayPillars.length);
    console.log('📅 API: Monday pillar titles:', mondayPillars.map(p => p.title));

    console.log(`✅ API: Successfully fetched ${pillars.length} content pillars`);
    return NextResponse.json(pillars);
  } catch (error: any) {
    console.error('Error in GET /api/content-pillars:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new content pillar
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Creating content pillar:', body);

    // Validate user has create permission
    const authResult = await validateUserPermissions(req, 'create');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { title, description, content_type, day_of_week, media_files, media_files_a, media_files_b, badge_text, subtitle, myth, fact, problem, solution, difficulty, tools_needed, warning } = body;
    
    console.log('📝 Extracted fields:', { title, subtitle, myth, fact, badge_text });

    const pillarData = {
      title,
      description,
      content_type,
      day_of_week,
      media_files: media_files || [],
      media_files_a: media_files_a || null,
      media_files_b: media_files_b || null,
      badge_text: badge_text ?? (day_of_week === 'monday' ? 'MYTH BUSTER MONDAY' : (day_of_week === 'tuesday' ? 'TECH TIPS TUESDAY' : day_of_week?.toUpperCase())),
      subtitle: subtitle ?? (day_of_week === 'monday' ? 'Independent Mercedes Service' : (day_of_week === 'tuesday' ? 'Expert Mercedes Knowledge' : 'Premium Selection')),
      myth: myth ?? null,
      fact: fact ?? null,
      problem: problem ?? null,
      solution: solution ?? null,
      difficulty: difficulty ?? null,
      tools_needed: tools_needed ?? null,
      warning: warning ?? null,
      created_by: authResult.user?.id
    };

    console.log('Content pillar data to insert:', pillarData);

    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .insert([pillarData])
      .select()
      .single();

    if (error) {
      console.error('Error creating content pillar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully created content pillar:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/content-pillars:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update an existing content pillar
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Updating content pillar:', body);

    const { id, title, description, content_type, day_of_week, media_files, media_files_a, media_files_b, badge_text, subtitle, myth, fact, problem, solution, difficulty, tools_needed, warning } = body;
    
    console.log('📝 PUT - Raw body received:', body);
    console.log('📝 PUT - Extracted fields:', { title, subtitle, myth, fact, badge_text });
    
    // Validate user has edit permission
    const authResult = await validateUserPermissions(req, 'edit');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const updateData = {
      title,
      description,
      content_type,
      day_of_week,
      media_files: media_files || [],
      media_files_a: media_files_a ?? undefined,
      media_files_b: media_files_b ?? undefined,
      badge_text: badge_text ?? (day_of_week === 'monday' ? 'MYTH BUSTER MONDAY' : (day_of_week === 'tuesday' ? 'TECH TIPS TUESDAY' : day_of_week?.toUpperCase())),
      subtitle: subtitle ?? (day_of_week === 'monday' ? 'Independent Mercedes Service' : (day_of_week === 'tuesday' ? 'Expert Mercedes Knowledge' : 'Premium Selection')),
      myth: myth ?? null,
      fact: fact ?? null,
      problem: problem ?? null,
      solution: solution ?? null,
      difficulty: difficulty ?? null,
      tools_needed: tools_needed ?? null,
      warning: warning ?? null,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('content_pillars')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating content pillar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully updated content pillar:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PUT /api/content-pillars:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a content pillar
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Content pillar ID is required' }, { status: 400 });
    }

    console.log('Deleting content pillar:', id);

    // Validate user has delete permission
    const authResult = await validateUserPermissions(req, 'delete');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { error } = await supabaseAdmin
      .from('content_pillars')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content pillar:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully deleted content pillar:', id);
    return NextResponse.json({ message: 'Content pillar deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/content-pillars:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
