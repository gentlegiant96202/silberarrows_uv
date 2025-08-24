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

// GET - Fetch all content examples
export async function GET(req: NextRequest) {
  try {
    console.log('Fetching content examples...');
    
    // Validate user has view permission
    const authResult = await validateUserPermissions(req, 'view');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const dayOfWeek = searchParams.get('day_of_week');

    let query = supabaseAdmin
      .from('content_examples')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by day if specified
    if (dayOfWeek) {
      query = query.eq('day_of_week', dayOfWeek);
    }

    const { data: examples, error } = await query;

    if (error) {
      console.error('Error fetching content examples:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`✅ Successfully fetched ${examples.length} content examples`);
    return NextResponse.json(examples);
  } catch (error: any) {
    console.error('Error in GET /api/content-examples:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create multiple content examples (bulk operation)
export async function POST(req: NextRequest) {
  try {
    // Allow writes only from trusted UI calls
    const source = req.headers.get('x-examples-write');
    if (source !== 'ui') {
      return NextResponse.json({ error: 'Writes to content_examples are disabled' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Creating/updating content examples:', body);

    // Validate user has create permission
    const authResult = await validateUserPermissions(req, 'create');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { examples } = body;

    if (!Array.isArray(examples)) {
      return NextResponse.json({ error: 'Examples must be an array' }, { status: 400 });
    }

    // Add created_by to each example
    const examplesWithUser = examples.map(example => ({
      ...example,
      created_by: authResult.user?.id
    }));

    console.log('Content examples data to upsert:', examplesWithUser);

    // Use upsert to handle both create and update operations
    const { data, error } = await supabaseAdmin
      .from('content_examples')
      .upsert(examplesWithUser, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error upserting content examples:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully upserted content examples:', data?.length);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/content-examples:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update content examples (replace all for efficiency)
export async function PUT(req: NextRequest) {
  try {
    // Allow writes only from trusted UI calls
    const source = req.headers.get('x-examples-write');
    if (source !== 'ui') {
      return NextResponse.json({ error: 'Writes to content_examples are disabled' }, { status: 403 });
    }

    const body = await req.json();
    console.log('Replacing content examples:', body);

    const { examples, dayOfWeek } = body;
    
    // Validate user has edit permission
    const authResult = await validateUserPermissions(req, 'edit');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    if (!Array.isArray(examples)) {
      return NextResponse.json({ error: 'Examples must be an array' }, { status: 400 });
    }

    // Use UPSERT to handle existing entries with unique constraint
    const examplesWithUser = examples.map(example => ({
      title: example.title,
      description: example.description,
      content_type: example.content_type,
      day_of_week: example.day_of_week,
      created_by: authResult.user?.id,
      updated_at: new Date().toISOString()
    }));

    // If dayOfWeek is provided, first delete examples that are no longer in the new list
    if (dayOfWeek && examples.length > 0) {
      const newTitles = examples.map(ex => ex.title);
      console.log(`🗑️ Checking for examples to delete for ${dayOfWeek}, keeping:`, newTitles);
      
      // First, get existing examples for this day
      const { data: existingExamples, error: fetchError } = await supabaseAdmin
        .from('content_examples')
        .select('id, title')
        .eq('day_of_week', dayOfWeek);

      if (fetchError) {
        console.error('Error fetching existing examples:', fetchError);
      } else if (existingExamples) {
        // Find examples to delete (existing but not in new list)
        const toDelete = existingExamples.filter(ex => !newTitles.includes(ex.title));
        console.log(`🗑️ Found ${toDelete.length} examples to delete:`, toDelete.map(ex => ex.title));
        
        if (toDelete.length > 0) {
          const deleteIds = toDelete.map(ex => ex.id);
          const { error: deleteError } = await supabaseAdmin
            .from('content_examples')
            .delete()
            .in('id', deleteIds);

          if (deleteError) {
            console.error('Error deleting removed examples:', deleteError);
          } else {
            console.log('✅ Successfully deleted removed examples');
          }
        }
      }
    } else if (dayOfWeek && examples.length === 0) {
      // If no examples provided, delete all for this day
      const { error: deleteError } = await supabaseAdmin
        .from('content_examples')
        .delete()
        .eq('day_of_week', dayOfWeek);

      if (deleteError) {
        console.error('Error deleting all examples for day:', deleteError);
        return NextResponse.json({ error: deleteError.message }, { status: 500 });
      }
      return NextResponse.json([]);
    }

    // Upsert examples (insert new, update existing)
    const { data, error } = await supabaseAdmin
      .from('content_examples')
      .upsert(examplesWithUser, { 
        onConflict: 'title,day_of_week',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error inserting content examples:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully replaced content examples:', data?.length);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PUT /api/content-examples:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a content example
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Content example ID is required' }, { status: 400 });
    }

    console.log('Deleting content example:', id);

    // Validate user has delete permission
    const authResult = await validateUserPermissions(req, 'delete');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { error } = await supabaseAdmin
      .from('content_examples')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting content example:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Successfully deleted content example:', id);
    return NextResponse.json({ message: 'Content example deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/content-examples:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
