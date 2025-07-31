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
    console.log('📌 Pin API: Received request');
    
    const { taskId, pinned } = await request.json();
    
    // Validate input
    if (!taskId) {
      console.error('❌ Pin API: Missing taskId');
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    if (typeof pinned !== 'boolean') {
      console.error('❌ Pin API: Invalid pinned value');
      return NextResponse.json(
        { error: 'Pinned must be a boolean value' },
        { status: 400 }
      );
    }

    console.log(`📌 Pin API: ${pinned ? 'Pinning' : 'Unpinning'} task ${taskId}`);

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
      console.error('❌ Pin API: Database error:', error);
      return NextResponse.json(
        { error: `Failed to update task: ${error.message}` },
        { status: 500 }
      );
    }

    if (!data) {
      console.error('❌ Pin API: Task not found');
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Pin API: Successfully ${pinned ? 'pinned' : 'unpinned'} task:`, data);

    return NextResponse.json({
      message: `Task ${pinned ? 'pinned' : 'unpinned'} successfully`,
      task: data
    });

  } catch (error: any) {
    console.error('❌ Pin API: Unexpected error:', error);
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
      console.error('❌ Pin API GET: Database error:', error);
      return NextResponse.json(
        { error: `Failed to fetch task: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ task: data });

  } catch (error: any) {
    console.error('❌ Pin API GET: Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 