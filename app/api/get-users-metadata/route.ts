import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Server-side Supabase client with admin privileges
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

export async function GET(request: NextRequest) {
  try {
    // Get all users with their metadata
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch user metadata: ${error.message}` },
        { status: 500 }
      );
    }

    // Extract relevant metadata
    const userMetadata = users.map(user => ({
      id: user.id,
      full_name: user.user_metadata?.full_name || null,
      email: user.email
    }));
    return NextResponse.json({ 
      users: userMetadata 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 