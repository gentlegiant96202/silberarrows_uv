import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

// Create temp admin client for auth validation only
const tempSupabaseAdmin = createClient(
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
    const { data: { user }, error: userError } = await tempSupabaseAdmin.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // Get user permissions for marketing module
    const { data: permissions, error: permError } = await tempSupabaseAdmin
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

// POST - Generate QR code for business card
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    
    // Validate permissions
    const validation = await validateUserPermissions(request, 'edit');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
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
      console.error('Database error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    // Generate QR code URL (using simple ID URL)
    const qrUrl = `${request.nextUrl.origin}/business-card/${params.id}`;
    
    // Generate QR code as PNG buffer
    const qrCodeBuffer = await QRCode.toBuffer(qrUrl, {
      type: 'png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H' // High error correction for printing
    });

    // Mark QR as generated and lock the slug
    const { error: updateError } = await supabaseAdmin
      .from('business_cards')
      .update({
        qr_generated_at: new Date().toISOString(),
        slug_locked: true
      })
      .eq('id', params.id);

    if (updateError) {
      console.error('Error updating QR status:', updateError);
      // Continue anyway - QR generation succeeded
    }

    // Return the QR code as PNG
    return new NextResponse(qrCodeBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${existingCard.name.replace(/\s+/g, '_')}_QR.png"`,
        'Content-Length': qrCodeBuffer.length.toString()
      }
    });

  } catch (error) {
    console.error('POST /api/business-cards/[id]/qr-code error:', error);
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500 });
  }
}

// GET - Get QR code info (check if generated)
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const params = await context.params;
    
    // Validate permissions
    const validation = await validateUserPermissions(request, 'view');
    if ('error' in validation) {
      return NextResponse.json({ error: validation.error }, { status: validation.status });
    }

    // Check business card QR status
    const { data: businessCard, error } = await supabaseAdmin
      .from('business_cards')
      .select('id, name, qr_generated_at, slug_locked')
      .eq('id', params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Business card not found' }, { status: 404 });
      }
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch business card' }, { status: 500 });
    }

    const qrUrl = `${request.nextUrl.origin}/business-card/${params.id}`;

    return NextResponse.json({
      qr_generated: !!businessCard.qr_generated_at,
      qr_generated_at: businessCard.qr_generated_at,
      slug_locked: businessCard.slug_locked,
      qr_url: qrUrl
    });

  } catch (error) {
    console.error('GET /api/business-cards/[id]/qr-code error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
