import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Type definitions for our unified call management system
type RecordType = 'call_entry' | 'staff_member' | 'working_days_config';
type Department = 'Service' | 'Sales' | 'Leasing' | 'Admin';
type StaffStatus = 'Active' | 'Inactive';

interface CallEntry {
  id?: string;
  record_type: 'call_entry';
  call_date: string;
  call_time: string;
  customer_name: string;
  phone_number: string;
  reach_out_method: string;
  person_in_charge: string;
  answered_yn: string;
  action_taken: string;
  person_in_charge_2?: string;
  answered_yn_2?: string;
  notes?: string;
}

interface StaffMember {
  id?: string;
  record_type: 'staff_member';
  staff_name: string;
  department: Department;
  staff_status: StaffStatus;
  join_date?: string;
  leave_date?: string;
  email?: string;
  staff_phone?: string;
}

interface WorkingDaysConfig {
  id?: string;
  record_type: 'working_days_config';
  config_year: number;
  config_month: number;
  working_days: number;
  total_days: number;
}

// Helper function to validate user permissions (simplified for call management)
async function validateUserPermissions(request: NextRequest, requiredPermission: 'view' | 'create' | 'edit' | 'delete') {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { error: 'Authorization header missing', status: 401 };
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Get user from token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // For call management, allow all operations for authenticated marketing users
    // In the future, you can add more granular permissions here
    return { user };
  } catch (error) {
    return { error: 'Permission validation failed', status: 500 };
  }
}

// GET: Fetch call management records
export async function GET(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'view');
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const recordType = searchParams.get('type') as RecordType;
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    
    // Specific filters based on record type
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase.from('call_management').select('*');

    // Filter by record type if specified
    if (recordType) {
      query = query.eq('record_type', recordType);
    }

    // Apply specific filters based on record type
    if (recordType === 'call_entry') {
      if (startDate) query = query.gte('call_date', startDate);
      if (endDate) query = query.lte('call_date', endDate);
      query = query.order('call_date', { ascending: false }).order('call_time', { ascending: false });
    } else if (recordType === 'staff_member') {
      if (department) query = query.eq('department', department);
      if (status) query = query.eq('staff_status', status);
      query = query.order('staff_status', { ascending: true }).order('staff_name', { ascending: true });
    } else if (recordType === 'working_days_config') {
      if (year) query = query.eq('config_year', parseInt(year));
      if (month) query = query.eq('config_month', parseInt(month));
      query = query.order('config_year', { ascending: false }).order('config_month', { ascending: false });
    } else {
      // No specific type - return all with general ordering
      query = query.order('created_at', { ascending: false });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch records', details: error.message },
        { status: 500 }
      );
    }

    // Format the response based on record type
    let formattedData = data;
    if (recordType === 'call_entry') {
      formattedData = data?.map(record => ({
        id: record.id,
        date: record.call_date,
        time: record.call_time,
        customer_name: record.customer_name,
        phone_number: record.phone_number,
        reach_out_method: record.reach_out_method,
        person_in_charge: record.person_in_charge,
        answered_yn: record.answered_yn,
        action_taken: record.action_taken,
        person_in_charge_2: record.person_in_charge_2 || '',
        answered_yn_2: record.answered_yn_2 || '',
        notes: record.notes || '',
        created_at: record.created_at,
        updated_at: record.updated_at
      }));
    } else if (recordType === 'staff_member') {
      formattedData = data?.map(record => ({
        id: record.id,
        name: record.staff_name,
        department: record.department,
        status: record.staff_status,
        joinDate: record.join_date,
        leaveDate: record.leave_date,
        email: record.email,
        phone: record.staff_phone,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));
    } else if (recordType === 'working_days_config') {
      formattedData = data?.map(record => ({
        id: record.id,
        year: record.config_year,
        month: record.config_month,
        workingDays: record.working_days,
        totalDays: record.total_days,
        created_at: record.created_at,
        updated_at: record.updated_at
      }));
    }

    return NextResponse.json({
      success: true,
      data: formattedData || [],
      pagination: {
        offset,
        limit,
        total: count || 0
      },
      recordType: recordType || 'all'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to fetch records',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST: Create new call management record
export async function POST(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'create');
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { record_type } = body;

    if (!record_type || !['call_entry', 'staff_member', 'working_days_config'].includes(record_type)) {
      return NextResponse.json(
        { error: 'Invalid or missing record_type' },
        { status: 400 }
      );
    }

    let insertData: any = {
      record_type,
      created_by: validation.user.id
    };

    // Prepare data based on record type
    if (record_type === 'call_entry') {
      const {
        call_date, call_time, customer_name, phone_number, reach_out_method,
        person_in_charge, answered_yn, action_taken, person_in_charge_2,
        answered_yn_2, notes
      } = body;

      // Validate required fields
      if (!call_date || !customer_name || !person_in_charge) {
        return NextResponse.json(
          { error: 'Missing required fields for call entry' },
          { status: 400 }
        );
      }

      insertData = {
        ...insertData,
        call_date,
        call_time,
        customer_name,
        phone_number,
        reach_out_method,
        person_in_charge,
        answered_yn,
        action_taken,
        person_in_charge_2: person_in_charge_2 || null,
        answered_yn_2: answered_yn_2 || null,
        notes: notes || null
      };
    } else if (record_type === 'staff_member') {
      const {
        staff_name, department, staff_status, join_date, leave_date,
        email, staff_phone
      } = body;

      // Validate required fields
      if (!staff_name || !department || !staff_status) {
        return NextResponse.json(
          { error: 'Missing required fields for staff member' },
          { status: 400 }
        );
      }

      insertData = {
        ...insertData,
        staff_name,
        department,
        staff_status,
        join_date: join_date || null,
        leave_date: leave_date || null,
        email: email || null,
        staff_phone: staff_phone || null
      };
    } else if (record_type === 'working_days_config') {
      const { config_year, config_month, working_days, total_days } = body;

      // Validate required fields
      if (!config_year || !config_month || working_days === undefined) {
        return NextResponse.json(
          { error: 'Missing required fields for working days config' },
          { status: 400 }
        );
      }

      insertData = {
        ...insertData,
        config_year,
        config_month,
        working_days,
        total_days
      };
    }

    const { data, error } = await supabase
      .from('call_management')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create record', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: `${record_type.replace('_', ' ')} created successfully`
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to create record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT: Update existing call management record
export async function PUT(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'edit');
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const body = await request.json();
    const { id, record_type, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Prepare update data with timestamp
    const finalUpdateData = {
      ...updateData,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('call_management')
      .update(finalUpdateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update record', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Record updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to update record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE: Remove call management record
export async function DELETE(request: NextRequest) {
  try {
    // Validate permissions
    const validation = await validateUserPermissions(request, 'delete');
    if ('error' in validation) {
      return NextResponse.json(
        { error: validation.error },
        { status: validation.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Record ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('call_management')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete record', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Record deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to delete record',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 