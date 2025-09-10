import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch all email signature templates
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const activeOnly = searchParams.get('active') === 'true';

    let query = supabase
      .from('email_signatures')
      .select('*')
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    if (department) {
      query = query.or(`department.eq.${department},department.eq.All Departments`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching email signatures:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signatures: data || [] });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new email signature template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      name,
      description,
      facebook_url,
      instagram_url,
      linkedin_url,
      youtube_url,
      banner_image_1_url,
      banner_image_2_url,
      banner_link_1_url,
      banner_link_2_url,
      logo_image_url,
      icon_email_url,
      icon_phone_url,
      icon_mobile_url,
      icon_address_url,
      icon_facebook_url,
      icon_instagram_url,
      icon_linkedin_url,
      icon_youtube_url,
      template_html,
      department,
      is_default = false
    } = body;

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('email_signatures')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy ID for new records
    }

    const { data, error } = await supabase
      .from('email_signatures')
      .insert({
        name,
        description,
        facebook_url,
        instagram_url,
        linkedin_url,
        youtube_url,
        banner_image_1_url,
        banner_image_2_url,
        banner_link_1_url,
        banner_link_2_url,
        logo_image_url,
        icon_email_url,
        icon_phone_url,
        icon_mobile_url,
        icon_address_url,
        icon_facebook_url,
        icon_instagram_url,
        icon_linkedin_url,
        icon_youtube_url,
        template_html,
        department: department || 'All Departments',
        is_default,
        created_by: 'user' // TODO: Get from auth context
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating email signature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signature: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update existing email signature template
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    const {
      id,
      name,
      description,
      facebook_url,
      instagram_url,
      linkedin_url,
      youtube_url,
      banner_image_1_url,
      banner_image_2_url,
      banner_link_1_url,
      banner_link_2_url,
      logo_image_url,
      icon_email_url,
      icon_phone_url,
      icon_mobile_url,
      icon_address_url,
      icon_facebook_url,
      icon_instagram_url,
      icon_linkedin_url,
      icon_youtube_url,
      template_html,
      department,
      is_active,
      is_default
    } = body;

    // If setting as default, unset other defaults first
    if (is_default) {
      await supabase
        .from('email_signatures')
        .update({ is_default: false })
        .neq('id', id);
    }

    const { data, error } = await supabase
      .from('email_signatures')
      .update({
        name,
        description,
        facebook_url,
        instagram_url,
        linkedin_url,
        youtube_url,
        banner_image_1_url,
        banner_image_2_url,
        banner_link_1_url,
        banner_link_2_url,
        logo_image_url,
        icon_email_url,
        icon_phone_url,
        icon_mobile_url,
        icon_address_url,
        icon_facebook_url,
        icon_instagram_url,
        icon_linkedin_url,
        icon_youtube_url,
        template_html,
        department,
        is_active,
        is_default
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating email signature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ signature: data });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete existing email signature template
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json({ error: 'Missing template id' }, { status: 400 });
    }

    const { error } = await supabase
      .from('email_signatures')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting email signature:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
