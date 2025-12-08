import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Server-side Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key for admin operations
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export async function POST(request: NextRequest) {
  try {
    const { userId, fullName } = await request.json();
    // Validate input
    if (!userId || !fullName) {
      return NextResponse.json(
        { error: 'Missing userId or fullName' },
        { status: 400 }
      );
    }

    // Update user metadata using admin client
    const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { full_name: fullName }
    });

    if (error) {
      return NextResponse.json(
        { error: `Failed to update user name: ${error.message}` },
        { status: 500 }
      );
    }
    return NextResponse.json({ 
      success: true, 
      message: `User name updated to "${fullName}"` 
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 