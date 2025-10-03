import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Create admin client for permission checking with cache-busting headers
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
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
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    console.log('📦 API: Fetched pillars count:', pillars?.length || 0);
    console.log('📋 API: First 5 pillar titles:', pillars?.slice(0, 5).map(p => p.title) || []);
    
    // Debug form fields in first pillar
    if (pillars && pillars.length > 0) {
      const firstPillar = pillars[0];
      console.log('🔍 API: First pillar form fields:', {
        titlefontsize: firstPillar.titlefontsize,
        imagefit: firstPillar.imagefit,
        imagealignment: firstPillar.imagealignment,
        imagezoom: firstPillar.imagezoom,
        imageverticalposition: firstPillar.imageverticalposition
      });
    }
    
    // Debug Monday pillars specifically
    const mondayPillars = pillars?.filter(p => p.day_of_week === 'monday') || [];
    console.log('📅 API: Monday pillars count:', mondayPillars.length);
    console.log('📅 API: Monday pillar titles:', mondayPillars.map(p => p.title));

    console.log(`✅ API: Successfully fetched ${pillars.length} content pillars`);
    return NextResponse.json(pillars);
  } catch (error: any) {
    console.error('Error in GET /api/content-pillars:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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

    const { title, description, content_type, day_of_week, media_files, media_files_a, media_files_b, badge_text, subtitle, myth, fact, problem, solution, difficulty, tools_needed, warning, titleFontSize, imageFit, imageAlignment, imageZoom, imageVerticalPosition } = body;
    
    console.log('📝 Extracted fields:', { title, subtitle, myth, fact, badge_text });

    // Validate and sanitize media files
    const sanitizedMediaFiles = Array.isArray(media_files) ? media_files.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : [];
    
    const sanitizedMediaFilesA = Array.isArray(media_files_a) ? media_files_a.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : null;
    
    const sanitizedMediaFilesB = Array.isArray(media_files_b) ? media_files_b.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : null;

    const pillarData: any = {
      title,
      description,
      content_type,
      day_of_week,
      media_files: sanitizedMediaFiles,
      media_files_a: sanitizedMediaFilesA,
      media_files_b: sanitizedMediaFilesB,
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

    // Only add form fields if they exist in the request (using lowercase column names)
    if (titleFontSize !== undefined) pillarData.titlefontsize = titleFontSize;
    if (imageFit !== undefined) pillarData.imagefit = imageFit;
    if (imageAlignment !== undefined) pillarData.imagealignment = imageAlignment;
    if (imageZoom !== undefined) pillarData.imagezoom = imageZoom;
    if (imageVerticalPosition !== undefined) pillarData.imageverticalposition = imageVerticalPosition;
    
    console.log('📊 Media files validation:', {
      original_count: media_files?.length || 0,
      sanitized_count: sanitizedMediaFiles.length,
      template_a_count: sanitizedMediaFilesA?.length || 0,
      template_b_count: sanitizedMediaFilesB?.length || 0
    });

    console.log('Content pillar data to insert:', pillarData);

    let data: any, error: any;
    
    try {
      // Create a fresh Supabase client to bypass schema cache
      // Use the same URL as the main client to ensure we're hitting the custom domain
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      console.log('🔗 Using Supabase URL:', supabaseUrl);
      
      // If using custom domain, also try with original Supabase URL as fallback
      const originalSupabaseUrl = supabaseUrl.replace('database.silberarrows.com', 'rrxfvdtubynlsanplbta.supabase.co');
      console.log('🔗 Original Supabase URL (fallback):', originalSupabaseUrl);
      
      const freshClient = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
          db: { schema: 'public' },
          global: {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Forwarded-Host': 'database.silberarrows.com'
            }
          }
        }
      );
      
      console.log('🔄 Using fresh Supabase client for insert to bypass schema cache');
      console.log('📝 Insert data being sent:', pillarData);
      
      const result = await freshClient
        .from('content_pillars')
        .insert([pillarData])
        .select()
        .single();
      
      data = result.data;
      error = result.error;
      
      if (error) {
        console.error('❌ Fresh client insert failed:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // Try with original Supabase URL if custom domain fails
        if (error.message.includes('schema cache') || error.message.includes('column') || error.message.includes('imageAlignment')) {
          console.log('🔄 Trying with original Supabase URL for insert...');
          const originalClient = createClient(
            'https://rrxfvdtubynlsanplbta.supabase.co',
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
              auth: { autoRefreshToken: false, persistSession: false },
              db: { schema: 'public' }
            }
          );
          
          const originalResult = await originalClient
            .from('content_pillars')
            .insert([pillarData])
            .select()
            .single();
          
          data = originalResult.data;
          error = originalResult.error;
          
          if (!error) {
            console.log('✅ Insert succeeded with original Supabase URL');
          } else {
            console.error('❌ Original URL insert also failed:', error);
            // If still failing, try without form fields
            console.log('⚠️ Trying without form fields...');
            
            const { titleFontSize, imageFit, imageAlignment, imageZoom, imageVerticalPosition, ...safePillarData } = pillarData;
            
            const retryResult = await originalClient
              .from('content_pillars')
              .insert([safePillarData])
              .select()
              .single();
            
            data = retryResult.data;
            error = retryResult.error;
            
            if (!error) {
              console.log('✅ Insert succeeded without form fields');
            }
          }
        }
      } else {
        console.log('✅ Insert succeeded with fresh client');
      }
    } catch (err) {
      console.error('Insert failed:', err);
      error = err;
    }

    if (error) {
      console.error('Error creating content pillar:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    console.log('✅ Successfully created content pillar:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/content-pillars:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

// PUT - Update an existing content pillar
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    console.log('Updating content pillar:', body);

    const { id, title, description, content_type, day_of_week, media_files, media_files_a, media_files_b, badge_text, subtitle, myth, fact, problem, solution, difficulty, tools_needed, warning, titleFontSize, imageFit, imageAlignment, imageZoom, imageVerticalPosition } = body;
    
    console.log('📝 PUT - Raw body received:', body);
    console.log('📝 PUT - Extracted fields:', { title, subtitle, myth, fact, badge_text });
    console.log('📝 PUT - Form fields received:', { 
      titleFontSize, 
      imageFit, 
      imageAlignment, 
      imageZoom, 
      imageVerticalPosition 
    });
    
    // Declare variables at the top to avoid scoping issues
    let data: any, error: any;
    
    // Validate user has edit permission
    const authResult = await validateUserPermissions(req, 'edit');
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    // Validate and sanitize media files for update
    const sanitizedMediaFiles = Array.isArray(media_files) ? media_files.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : [];
    
    const sanitizedMediaFilesA = Array.isArray(media_files_a) ? media_files_a.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : undefined;
    
    const sanitizedMediaFilesB = Array.isArray(media_files_b) ? media_files_b.filter(file => 
      file && typeof file === 'object' && file.url && file.name
    ) : undefined;

    const updateData: any = {
      title,
      description,
      content_type,
      day_of_week,
      media_files: sanitizedMediaFiles,
      media_files_a: sanitizedMediaFilesA,
      media_files_b: sanitizedMediaFilesB,
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

    // Only add form fields if they exist in the request (using lowercase column names)
    if (titleFontSize !== undefined) updateData.titlefontsize = titleFontSize;
    if (imageFit !== undefined) updateData.imagefit = imageFit;
    if (imageAlignment !== undefined) updateData.imagealignment = imageAlignment;
    if (imageZoom !== undefined) updateData.imagezoom = imageZoom;
    if (imageVerticalPosition !== undefined) updateData.imageverticalposition = imageVerticalPosition;
    
    console.log('📝 PUT - Final updateData being sent to database:', updateData);
    console.log('📝 PUT - Form fields in updateData:', {
      titlefontsize: updateData.titlefontsize,
      imagefit: updateData.imagefit,
      imagealignment: updateData.imagealignment,
      imagezoom: updateData.imagezoom,
      imageverticalposition: updateData.imageverticalposition
    });
    
    // Simple test - try to select just one column
    try {
      console.log('🧪 Testing single column access...');
      const singleColumnTest = await supabaseAdmin
        .from('content_pillars')
        .select('imagealignment')
        .limit(1);
      console.log('🧪 Single column test result:', singleColumnTest);
    } catch (e) {
      console.error('🧪 Single column test failed:', e);
    }
    
    // Test database connection and column existence
    try {
      console.log('🔍 Testing column existence with main client...');
      const testQuery = await supabaseAdmin
        .from('content_pillars')
        .select('id, titlefontsize, imagefit, imagealignment, imagezoom, imageverticalposition')
        .limit(1);
      
      console.log('🔍 Test query result:', testQuery);
      if (testQuery.error) {
        console.error('❌ Test query failed:', testQuery.error);
        console.error('❌ Error details:', JSON.stringify(testQuery.error, null, 2));
        
        // Try with original Supabase URL if custom domain fails
        console.log('🔄 Trying with original Supabase URL...');
        const originalClient = createClient(
          'https://rrxfvdtubynlsanplbta.supabase.co',
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: { autoRefreshToken: false, persistSession: false },
            db: { schema: 'public' }
          }
        );
        
        const originalTestQuery = await originalClient
          .from('content_pillars')
          .select('id, titlefontsize, imagefit, imagealignment, imagezoom, imageverticalposition')
          .limit(1);
        
        console.log('🔍 Original URL test query result:', originalTestQuery);
        if (originalTestQuery.error) {
          console.error('❌ Original URL test also failed:', originalTestQuery.error);
        } else {
          console.log('✅ Original URL test succeeded - using original URL for update');
          // Use original client for the actual update
          const originalResult = await originalClient
            .from('content_pillars')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
          
          data = originalResult.data;
          error = originalResult.error;
          
          if (!error) {
            console.log('✅ Update succeeded with original Supabase URL');
            return NextResponse.json(data);
          }
        }
      } else {
        console.log('✅ Test query succeeded, columns exist');
        console.log('📊 Sample data:', testQuery.data?.[0]);
      }
    } catch (testError) {
      console.error('❌ Test query exception:', testError);
    }
    
    console.log('📊 PUT - Media files validation:', {
      original_count: media_files?.length || 0,
      sanitized_count: sanitizedMediaFiles.length,
      template_a_count: sanitizedMediaFilesA?.length || 0,
      template_b_count: sanitizedMediaFilesB?.length || 0
    });

    // Update with all fields including form fields
    try {
      // Create a fresh Supabase client to bypass schema cache
      // Use the same URL as the main client to ensure we're hitting the custom domain
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      console.log('🔗 Using Supabase URL for update:', supabaseUrl);
      
      // If using custom domain, also try with original Supabase URL as fallback
      const originalSupabaseUrl = supabaseUrl.replace('database.silberarrows.com', 'rrxfvdtubynlsanplbta.supabase.co');
      console.log('🔗 Original Supabase URL (fallback):', originalSupabaseUrl);
      
      const freshClient = createClient(
        supabaseUrl,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: { autoRefreshToken: false, persistSession: false },
          db: { schema: 'public' },
          global: {
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0',
              'X-Forwarded-Host': 'database.silberarrows.com'
            }
          }
        }
      );
      
      console.log('🔄 Using fresh Supabase client to bypass schema cache');
      console.log('📝 Update data being sent:', updateData);
      
      const result = await freshClient
        .from('content_pillars')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      data = result.data;
      error = result.error;
      
      if (error) {
        console.error('❌ Fresh client update failed:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        
        // If still failing, try without form fields
        if (error.message.includes('schema cache') || error.message.includes('column') || error.message.includes('imageAlignment')) {
          console.log('⚠️ Still getting schema cache error, trying without form fields...');
          
          const { titleFontSize, imageFit, imageAlignment, imageZoom, imageVerticalPosition, ...safeUpdateData } = updateData;
          
          const retryResult = await freshClient
            .from('content_pillars')
            .update(safeUpdateData)
            .eq('id', id)
            .select()
            .single();
          
          data = retryResult.data;
          error = retryResult.error;
          
          if (!error) {
            console.log('✅ Main update succeeded, but form fields were skipped');
          }
        }
      } else {
        console.log('✅ Update succeeded with fresh client');
      }
    } catch (err) {
      console.error('Update failed:', err);
      error = err;
    }

    if (error) {
      console.error('Error updating content pillar:', error);
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    console.log('✅ Successfully updated content pillar:', data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in PUT /api/content-pillars:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }

    console.log('✅ Successfully deleted content pillar:', id);
    return NextResponse.json({ message: 'Content pillar deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /api/content-pillars:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
