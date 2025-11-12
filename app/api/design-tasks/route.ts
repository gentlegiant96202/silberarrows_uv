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
async function validateUserPermissions(request: NextRequest, requiredPermission: 'view' | 'create' | 'edit' | 'delete', isApprovalAction = false) {
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

    // Special check for approval actions - only admins can approve
    if (isApprovalAction) {
      const { data: roleData } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      const isAdmin = roleData?.role === 'admin';
      if (!isAdmin) {
        return { error: 'Only administrators can approve tasks', status: 403 };
      }
    }

    return { user, permissions: perms };
  } catch (error) {
    return { error: 'Permission validation failed', status: 500 };
  }
}

// GET - Fetch all design tasks
export async function GET(req: NextRequest) {
  try {
    // Validate user has view permission
    const authResult = await validateUserPermissions(req, 'view');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Get query parameters for filtering
    const { searchParams } = new URL(req.url);
    const userTickets = searchParams.get('user_tickets') === 'true';
    const taskId = searchParams.get('id');
    const limit = parseInt(searchParams.get('limit') || '50'); // Default limit of 50
    const offset = parseInt(searchParams.get('offset') || '0'); // Default offset of 0
    const excludeArchived = searchParams.get('exclude_archived') === 'true';
    const statusFilter = searchParams.get('status'); // Filter by specific status

    // If fetching a single task by ID
    if (taskId) {
      const { data: task, error } = await supabase
        .from('design_tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json(task);
    }

    // Build query with optional filters - optimize by selecting only needed columns
    // For kanban board, we use lightweight mode to avoid fetching large JSONB fields
    const lightweight = searchParams.get('lightweight') === 'true';
    
    let query = supabase
      .from('design_tasks')
      .select(
        lightweight 
          ? 'id, title, status, requested_by, due_date, task_type, created_at, updated_at, pinned' // Minimal fields for kanban
          : 'id, title, description, status, requested_by, due_date, task_type, media_files, annotations, created_at, updated_at, created_by, acknowledged_at, pinned' // Full fields for modals
      );

    // Filter by department if user_tickets=true (for "My Department's Marketing Tickets")
    if (userTickets && authResult.user) {
      // Get user's role/department
      const { data: userRole, error: roleError } = await supabaseAdmin
        .from('user_roles')
        .select('role')
        .eq('user_id', authResult.user.id)
        .single();

      if (roleError || !userRole) {
        return NextResponse.json({ error: 'Unable to determine user department' }, { status: 500 });
      }

      // Get all users in the same department
      const { data: departmentUsers, error: usersError } = await supabaseAdmin
        .from('user_roles')
        .select('user_id')
        .eq('role', userRole.role);

      if (usersError || !departmentUsers) {
        return NextResponse.json({ error: 'Unable to get department users' }, { status: 500 });
      }

      const departmentUserIds = departmentUsers.map(u => u.user_id);

      query = query
        .in('created_by', departmentUserIds)
        .is('acknowledged_at', null); // Only show unacknowledged tickets
    }

    // Apply status filtering
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    // Exclude archived tasks if requested
    if (excludeArchived) {
      query = query.neq('status', 'archived');
    }

    // Always order by created_at and apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    const queryStart = Date.now();
    const { data: tasks, error } = await query;
    const queryTime = Date.now() - queryStart;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(tasks);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Create a new design task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate user has create permission
    const authResult = await validateUserPermissions(req, 'create');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { title, headline, description, status = 'planned', assignee, due_date, task_type = 'design', media_files = [] } = body;
    const taskData = {
      title: title || headline, // Handle both title and headline fields
      description,
      status,
      requested_by: assignee, // Map assignee to requested_by
      due_date,
      task_type,
      media_files,
      created_by: authResult.user?.id // Track who created the task
    };
    const { data, error } = await supabase
      .from('design_tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT - Update an existing design task
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, title, headline, description, status, assignee, due_date, task_type, media_files } = body;
    
    // Check if this is an approval action
    const isApprovalAction = status === 'approved';
    
    // Validate user has edit permission (and admin for approval)
    const authResult = await validateUserPermissions(req, 'edit', isApprovalAction);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    // Get current task data to check for admin-only field changes
    const { data: currentTask, error: fetchError } = await supabase
      .from('design_tasks')
      .select('title, due_date, task_type')
      .eq('id', id)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Check if user is admin for admin-only field restrictions
    if (!authResult.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', authResult.user.id)
      .single();
    
    const isAdmin = roleData?.role === 'admin';

    // Admin-only field validation (due_date only)
    const adminOnlyFields = [];
    if (due_date !== undefined && due_date !== currentTask.due_date) adminOnlyFields.push('due_date');

    if (adminOnlyFields.length > 0 && !isAdmin) {
      return NextResponse.json({ 
        error: `Only administrators can modify: ${adminOnlyFields.join(', ')}` 
      }, { status: 403 });
    }
    
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (headline !== undefined) updates.title = headline; // Map headline to title
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (assignee !== undefined) updates.requested_by = assignee; // Map assignee to requested_by
    if (due_date !== undefined) updates.due_date = due_date;
    if (task_type !== undefined) updates.task_type = task_type;
    if (media_files !== undefined) {
      // Defensive programming: Ensure media_files is an array and validate structure
      const validatedMediaFiles = Array.isArray(media_files) ? media_files : [];
      updates.media_files = validatedMediaFiles;
    }

    // Always update the updated_at timestamp
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('design_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Delete a design task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // Validate user has delete permission
    const authResult = await validateUserPermissions(req, 'delete');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }
    const { error } = await supabase
      .from('design_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH - Acknowledge a ticket (mark as seen)
export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    if (action === 'acknowledge') {
      // Validate user has view permission (they can acknowledge their own tickets)
      const authResult = await validateUserPermissions(req, 'view');
      if (authResult.error) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }

      // Verify this is the user's own ticket
      const { data: task, error: fetchError } = await supabase
        .from('design_tasks')
        .select('created_by, status')
        .eq('id', id)
        .single();

      if (fetchError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      // Check if user owns this ticket and it's approved
      if (task.created_by !== authResult.user?.id) {
        return NextResponse.json({ error: 'You can only acknowledge your own tickets' }, { status: 403 });
      }

      if (task.status !== 'approved') {
        return NextResponse.json({ error: 'Only approved tickets can be acknowledged' }, { status: 400 });
      }

      // Acknowledge the ticket
      const { error } = await supabase
        .from('design_tasks')
        .update({ acknowledged_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ message: 'Task acknowledged successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 