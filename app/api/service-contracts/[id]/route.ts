import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return { error: 'Invalid authorization token', status: 401 };
    }

    // Get user permissions for service module
    const { data: permissions, error: permError } = await supabase
      .rpc('get_user_module_permissions', {
        check_user_id: user.id,
        module_name: 'service'
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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate edit permissions
  const validation = await validateUserPermissions(request, 'edit');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const contractId = id;
    const body = await request.json();
    const { action, type = 'service' } = body;

    console.log('🛠️ Update contract PUT:', {
      contractId,
      action,
      type,
      keys: Object.keys(body || {}),
      hasNotes: 'notes' in (body || {}),
      notesPreview: body?.notes?.slice?.(0, 120) || body?.notes || null
    });

    // Determine which table to update
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';

    let updateData: any = {
      updated_at: new Date().toISOString()
    };

    let activityType: string;
    let activityDescription: string;
    let activityData: any = {};

    if (action === 'update_details') {
      // Full contract details update
      const {
        owner_name,
        mobile_no,
        email,
        dealer_name,
        dealer_phone,
        dealer_email,
        vin,
        make,
        model,
        model_year,
        current_odometer,
        start_date,
        end_date,
        cut_off_km,
        workflow_status,
        notes
      } = body;

      updateData = {
        ...updateData,
        owner_name,
        mobile_no,
        email,
        dealer_name,
        dealer_phone,
        dealer_email,
        vin,
        make,
        model,
        model_year,
        current_odometer: current_odometer || null,
        start_date,
        end_date,
        cut_off_km: cut_off_km || null,
        workflow_status,
        notes: notes || null
      };

      activityType = 'updated';
      activityDescription = `Contract details updated by ${validation.user.email}`;
      activityData = {
        updated_fields: Object.keys(body).filter(key => 
          !['action', 'type', 'updated_at'].includes(key)
        ),
        updated_by: validation.user.email,
        updated_at: new Date().toISOString()
      };

    } else if (action === 'update_contract') {
      // General contract update (includes all fields)
      const {
        service_type,
        owner_name,
        mobile_no,
        email,
        customer_id_type,
        customer_id_number,
        dealer_name,
        dealer_phone,
        dealer_email,
        vin,
        make,
        model,
        model_year,
        current_odometer,
        exterior_colour,
        interior_colour,
        start_date,
        end_date,
        cut_off_km,
        workflow_status,
        invoice_amount,
        notes
      } = body;

      updateData = {
        ...updateData,
        ...(service_type !== undefined && { 
          // Map service_type to warranty_type for warranty contracts
          [type === 'warranty' ? 'warranty_type' : 'service_type']: service_type 
        }),
        ...(owner_name !== undefined && { owner_name }),
        ...(mobile_no !== undefined && { mobile_no }),
        ...(email !== undefined && { email }),
        ...(customer_id_type !== undefined && { customer_id_type }),
        ...(customer_id_number !== undefined && { customer_id_number }),
        ...(dealer_name !== undefined && { dealer_name }),
        ...(dealer_phone !== undefined && { dealer_phone }),
        ...(dealer_email !== undefined && { dealer_email }),
        ...(vin !== undefined && { vin }),
        ...(make !== undefined && { make }),
        ...(model !== undefined && { model }),
        ...(model_year !== undefined && { model_year }),
        ...(current_odometer !== undefined && { current_odometer: current_odometer || null }),
        ...(exterior_colour !== undefined && { exterior_colour }),
        ...(interior_colour !== undefined && { interior_colour }),
        ...(start_date !== undefined && { start_date }),
        ...(end_date !== undefined && { end_date }),
        ...(cut_off_km !== undefined && { cut_off_km: cut_off_km || null }),
        ...(workflow_status !== undefined && { workflow_status }),
        ...(invoice_amount !== undefined && { invoice_amount: invoice_amount || null }),
        ...(notes !== undefined && { notes: notes || null })
      };

      activityType = 'contract_updated';
      activityDescription = `Contract updated by ${validation.user.email}`;
      activityData = {
        updated_fields: Object.keys(body).filter(key => !['action', 'type'].includes(key)),
        updated_by: validation.user.email,
        updated_at: new Date().toISOString()
      };

      // Debug logging for problematic fields
      console.log('🔍 Field debugging:', {
        customer_id_number_in_body: customer_id_number,
        exterior_colour_in_body: exterior_colour,
        interior_colour_in_body: interior_colour,
        notes_in_body: notes,
        customer_id_number_in_updateData: updateData.customer_id_number,
        exterior_colour_in_updateData: updateData.exterior_colour,
        interior_colour_in_updateData: updateData.interior_colour,
        notes_in_updateData: updateData.notes,
        tableName: tableName,
        all_updateData_keys: Object.keys(updateData)
      });
    } else {
      // Legacy status change - no longer supported
      return NextResponse.json(
        { error: 'Status changes are no longer supported. Use workflow_status instead.' },
        { status: 400 }
      );
    }

    // Update contract
    const { data: updatedContract, error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Database update error:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: (updateError as any).code,
        tableName,
        fieldsAttempted: Object.keys(updateData)
      });
      return NextResponse.json(
        { error: 'Failed to update contract', details: updateError.message },
        { status: 500 }
      );
    }

    // Activity logging removed - contract_activities table deleted

    // Add calculated fields (same as GET endpoint)
    const enhancedContract = {
      ...updatedContract,
      formatted_start_date: updatedContract.start_date ? new Date(updatedContract.start_date).toLocaleDateString('en-GB') : '',
      formatted_end_date: updatedContract.end_date ? new Date(updatedContract.end_date).toLocaleDateString('en-GB') : '',
      vehicle_info: `${updatedContract.make} ${updatedContract.model} (${updatedContract.model_year})`
    };

    console.log('✅ Contract updated. Field values now:', {
      notes: (enhancedContract as any)?.notes ?? null,
      customer_id_number: (enhancedContract as any)?.customer_id_number ?? null,
      exterior_colour: (enhancedContract as any)?.exterior_colour ?? null,
      interior_colour: (enhancedContract as any)?.interior_colour ?? null
    });

    return NextResponse.json({
      contract: enhancedContract,
      message: 'Contract updated successfully'
    });

  } catch (error) {
    console.error('Error updating contract:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate view permissions
  const validation = await validateUserPermissions(request, 'view');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const contractId = id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'service';

    // Determine which table to query
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';

    const { data: contract, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', contractId)
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Contract not found', details: error.message },
        { status: 404 }
      );
    }

    // Add calculated fields (simplified - no health status)
    const enhancedContract = {
      ...contract,
      formatted_start_date: new Date(contract.start_date).toLocaleDateString('en-GB'),
      formatted_end_date: new Date(contract.end_date).toLocaleDateString('en-GB'),
      vehicle_info: `${contract.make} ${contract.model} (${contract.model_year})`
    };

    return NextResponse.json({ contract: enhancedContract });

  } catch (error) {
    console.error('Error fetching contract:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate delete permissions
  const validation = await validateUserPermissions(request, 'delete');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const { id } = await params;
    const contractId = id;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'service';

    // Determine which table to update
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';

    // Hard delete since status field no longer exists
    const { data: deletedContract, error: deleteError } = await supabase
      .from(tableName)
      .delete()
      .eq('id', contractId)
      .select()
      .single();

    if (deleteError) {
      console.error('Database delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete contract', details: deleteError.message },
        { status: 500 }
      );
    }

    // Activity logging removed - contract_activities table deleted

    return NextResponse.json({
      contract: deletedContract,
      message: 'Contract deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting contract:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 