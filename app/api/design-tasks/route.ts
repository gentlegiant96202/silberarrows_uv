import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

// GET - Fetch all design tasks
export async function GET() {
  try {
    console.log('Fetching design tasks...');
    
    const { data: tasks, error } = await supabase
      .from('design_tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching design tasks:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log(`Returning tasks count: ${tasks?.length || 0}`);
    if (tasks && tasks.length > 0) {
      console.log('Sample task structure:', Object.keys(tasks[0]));
    }

    // Transform data to match frontend expectations
    const transformedTasks = tasks?.map(task => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      assignee: task.requested_by,
      due_date: task.due_date,
      created_at: task.created_at,
      updated_at: task.updated_at,
      media_files: task.media_files || [],
      annotations: task.annotations || [], // Include annotations field
      pinned: task.pinned || false, // Include pinned field
      priority: 'medium', // Default since we don't store this
      content_type: 'post', // Default since we don't store this
      tags: [] // Default since we don't store this
    })) || [];

    return NextResponse.json(transformedTasks);
  } catch (error) {
    console.error('Fetch design tasks error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch design tasks' },
      { status: 500 }
    );
  }
}

// POST - Create new design task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Creating design task:', body);

    const { title, headline, description, status = 'intake', assignee, due_date, media_files = [] } = body;

    const taskData = {
      title: title || headline, // Handle both title and headline fields
      description,
      status,
      requested_by: assignee,
      due_date: due_date || undefined, // Use undefined instead of null for optional dates
      media_files
    };

    const { data, error } = await supabase
      .from('design_tasks')
      .insert([taskData])
      .select()
      .single();

    if (error) {
      console.error('Error creating design task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform response to match frontend expectations
    const transformedTask = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      assignee: data.requested_by,
      due_date: data.due_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      media_files: data.media_files || [],
      annotations: data.annotations || [], // Include annotations field
      pinned: data.pinned || false, // Include pinned field
      priority: 'medium',
      content_type: 'post',
      tags: []
    };

    return NextResponse.json(transformedTask, { status: 201 });
  } catch (error) {
    console.error('Create design task error:', error);
    return NextResponse.json(
      { error: 'Failed to create design task' },
      { status: 500 }
    );
  }
}

// PUT - Update existing design task
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Updating design task:', body);

    const { id, title, headline, description, status, assignee, due_date, media_files } = body;

    const updates: any = {};
    if (title !== undefined || headline !== undefined) updates.title = title || headline;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (assignee !== undefined) updates.requested_by = assignee;
    if (due_date !== undefined) updates.due_date = due_date || undefined;
    if (media_files !== undefined) updates.media_files = media_files;

    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('design_tasks')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating design task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform response to match frontend expectations
    const transformedTask = {
      id: data.id,
      title: data.title,
      description: data.description,
      status: data.status,
      assignee: data.requested_by,
      due_date: data.due_date,
      created_at: data.created_at,
      updated_at: data.updated_at,
      media_files: data.media_files || [],
      annotations: data.annotations || [], // Include annotations field
      pinned: data.pinned || false, // Include pinned field
      priority: 'medium',
      content_type: 'post',
      tags: []
    };

    return NextResponse.json(transformedTask);
  } catch (error) {
    console.error('Update design task error:', error);
    return NextResponse.json(
      { error: 'Failed to update design task' },
      { status: 500 }
    );
  }
}

// DELETE - Delete design task
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('design_tasks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting design task:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete design task error:', error);
    return NextResponse.json(
      { error: 'Failed to delete design task' },
      { status: 500 }
    );
  }
} 