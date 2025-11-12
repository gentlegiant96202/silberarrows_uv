import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { taskId, pinned } = await request.json();
    
    // Validate input
    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (typeof pinned !== 'boolean') {
      return NextResponse.json(
        { error: 'Pinned must be a boolean value' },
        { status: 400 }
      );
    }
    // Update the task's pinned status in the database
    const { data, error } = await supabase
      .from('design_tasks')
      .update({ 
        pinned: pinned,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId)
      .select('id, title, pinned')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update task: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }
    return NextResponse.json({
      message: `Task ${pinned ? 'pinned' : 'unpinned'} successfully`,
      task: data
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// GET endpoint to check pinned status of a task (optional)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('design_tasks')
      .select('id, title, pinned')
      .eq('id', taskId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch task: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 