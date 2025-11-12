import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch staff directory
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    let query = supabase
      .from('staff_directory') // Use the view
      .select('*');

    // Apply filters
    if (department && department !== 'all') {
      query = query.eq('department', department);
    }
    
    if (status && status !== 'all') {
      query = query.eq('staff_status', status);
    }

    if (search) {
      query = query.or(`staff_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Order by status, then by department, then by name
    query = query
      .order('staff_status', { ascending: true })
      .order('department', { ascending: true })
      .order('staff_name', { ascending: true });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch staff directory', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const transformedData = data?.map(staff => ({
      id: staff.id,
      name: staff.staff_name,
      department: staff.department,
      status: staff.staff_status,
      joinDate: staff.join_date,
      leaveDate: staff.leave_date,
      email: staff.email,
      phone: staff.staff_phone
    }));

    return NextResponse.json({
      success: true,
      data: transformedData || []
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch staff directory' },
      { status: 500 }
    );
  }
}

// POST: Create new staff member
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const insertData = {
      record_type: 'staff_member',
      staff_name: body.name,
      department: body.department,
      staff_status: body.status || 'Active',
      join_date: body.joinDate || null,
      leave_date: body.leaveDate || null,
      email: body.email || null,
      staff_phone: body.phone || null
    };

    const { data, error } = await supabase
      .from('call_management')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create staff member', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Staff member created successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create staff member' },
      { status: 500 }
    );
  }
}

// PUT: Update staff member
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateFields } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Staff member ID is required' },
        { status: 400 }
      );
    }

    // Map frontend fields to database fields
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updateFields.name) updateData.staff_name = updateFields.name;
    if (updateFields.department) updateData.department = updateFields.department;
    if (updateFields.status) updateData.staff_status = updateFields.status;
    if (updateFields.joinDate !== undefined) updateData.join_date = updateFields.joinDate;
    if (updateFields.leaveDate !== undefined) updateData.leave_date = updateFields.leaveDate;
    if (updateFields.email !== undefined) updateData.email = updateFields.email;
    if (updateFields.phone !== undefined) updateData.staff_phone = updateFields.phone;

    const { data, error } = await supabase
      .from('call_management')
      .update(updateData)
      .eq('id', id)
      .eq('record_type', 'staff_member')
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update staff member', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Staff member not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Staff member updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update staff member' },
      { status: 500 }
    );
  }
} 