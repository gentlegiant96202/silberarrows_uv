import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET: Fetch working days configuration
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    let query = supabase
      .from('working_days_config') // Use the view
      .select('*');

    // Apply filters
    if (year) {
      query = query.eq('config_year', parseInt(year));
    }
    
    if (month) {
      query = query.eq('config_month', parseInt(month));
    }

    // Order by year and month (most recent first)
    query = query
      .order('config_year', { ascending: false })
      .order('config_month', { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch working days config', details: error.message },
        { status: 500 }
      );
    }

    // Transform data to match frontend expectations
    const transformedData = data?.map(config => ({
      id: config.id,
      year: config.config_year,
      month: config.config_month,
      workingDays: config.working_days,
      totalDays: config.total_days,
      created_at: config.created_at,
      updated_at: config.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: transformedData || []
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch working days config' },
      { status: 500 }
    );
  }
}

// POST: Create or update working days configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { year, month, workingDays, totalDays } = body;

    // Validate required fields
    if (!year || !month || workingDays === undefined) {
      return NextResponse.json(
        { error: 'Year, month, and working days are required' },
        { status: 400 }
      );
    }

    // Calculate total days for the month if not provided
    const calculatedTotalDays = totalDays || new Date(year, month, 0).getDate();

    // Manually upsert: update if exists for (year, month, record_type), else insert
    const { data: existing, error: findError } = await supabase
      .from('call_management')
      .select('id')
      .eq('record_type', 'working_days_config')
      .eq('config_year', year)
      .eq('config_month', month)
      .maybeSingle();

    if (findError) {
      return NextResponse.json(
        { error: 'Failed to check existing configuration', details: findError.message },
        { status: 500 }
      );
    }

    let data;
    let error;

    if (existing?.id) {
      // Update existing row
      ({ data, error } = await supabase
        .from('call_management')
        .update({
          working_days: workingDays,
          total_days: calculatedTotalDays,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .eq('record_type', 'working_days_config')
        .select()
        .single());
    } else {
      // Insert new row
      ({ data, error } = await supabase
        .from('call_management')
        .insert({
          record_type: 'working_days_config',
          config_year: year,
          config_month: month,
          working_days: workingDays,
          total_days: calculatedTotalDays,
        })
        .select()
        .single());
    }

    if (error) {
      return NextResponse.json(
        { error: 'Failed to save working days config', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Working days configuration saved successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save working days config' },
      { status: 500 }
    );
  }
}

// PUT: Update working days configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, workingDays, totalDays } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (workingDays !== undefined) updateData.working_days = workingDays;
    if (totalDays !== undefined) updateData.total_days = totalDays;

    const { data, error } = await supabase
      .from('call_management')
      .update(updateData)
      .eq('id', id)
      .eq('record_type', 'working_days_config')
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update working days config', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'Working days configuration updated successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update working days config' },
      { status: 500 }
    );
  }
}

// DELETE: Remove working days configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Configuration ID is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('call_management')
      .delete()
      .eq('id', id)
      .eq('record_type', 'working_days_config')
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to delete configuration', details: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Configuration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Working days configuration deleted successfully'
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete working days config' },
      { status: 500 }
    );
  }
} 