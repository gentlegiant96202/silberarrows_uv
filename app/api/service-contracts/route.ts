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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contractType = searchParams.get('type') || 'service'; // 'service' or 'warranty'
    const status = searchParams.get('status'); // optional filter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query;
    
    if (contractType === 'service') {
      query = supabase
        .from('service_contracts')
        .select(`
          id,
          reference_no,
          status,
          service_type,
          workflow_status,
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
          invoice_amount,
          notes,
          pdf_url,
          created_at,
          updated_at
        `);
    } else if (contractType === 'warranty') {
      query = supabase
        .from('warranty_contracts')
        .select(`
          id,
          reference_no,
          status,
          workflow_status,
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
          coverage_details,
          warranty_type,
          notes,
          pdf_url,
          created_at,
          updated_at
        `);
    } else {
      return NextResponse.json(
        { error: 'Invalid contract type. Use "service" or "warranty"' },
        { status: 400 }
      );
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    } else {
      // By default, exclude cancelled contracts (soft deleted)
      query = query.neq('status', 'cancelled');
    }

    // Apply pagination and sorting
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: contracts, error, count } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch contracts', details: error.message },
        { status: 500 }
      );
    }

    // Add calculated fields (handle date calculations in JavaScript)
    const contractsWithCalculations = contracts?.map(contract => {
      const endDate = new Date(contract.end_date);
      const currentDate = new Date();
      
      // Calculate days until expiry
      const timeDiff = endDate.getTime() - currentDate.getTime();
      const daysUntilExpiry = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Determine contract health
      let contractHealth = 'Active';
      if (endDate < currentDate) {
        contractHealth = 'Expired';
      } else if (daysUntilExpiry <= 30) {
        contractHealth = 'Expiring Soon';
      }

      return {
        ...contract,
        contract_health: contractHealth,
        days_until_expiry: daysUntilExpiry,
        formatted_start_date: new Date(contract.start_date).toLocaleDateString('en-GB'),
        formatted_end_date: new Date(contract.end_date).toLocaleDateString('en-GB'),
        vehicle_info: `${contract.make} ${contract.model} (${contract.model_year})`
      };
    }) || [];

    return NextResponse.json({
      contracts: contractsWithCalculations,
      pagination: {
        offset,
        limit,
        total: count || contractsWithCalculations.length
      },
      contractType
    });

  } catch (error) {
    console.error('Error fetching contracts:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch contracts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Optional: Add POST method for creating contracts directly (if needed)
export async function POST(request: NextRequest) {
  // Validate create permissions
  const validation = await validateUserPermissions(request, 'create');
  if ('error' in validation) {
    return NextResponse.json(
      { error: validation.error },
      { status: validation.status }
    );
  }

  try {
    const data = await request.json();
    const { type, ...contractData } = data;

    let result;
    
    if (type === 'service') {
      result = await supabase
        .from('service_contracts')
        .insert(contractData)
        .select()
        .single();
    } else if (type === 'warranty') {
      result = await supabase
        .from('warranty_contracts')
        .insert(contractData)
        .select()
        .single();
    } else {
      return NextResponse.json(
        { error: 'Invalid contract type. Use "service" or "warranty"' },
        { status: 400 }
      );
    }

    if (result.error) {
      console.error('Database error:', result.error);
      return NextResponse.json(
        { error: 'Failed to create contract', details: result.error.message },
        { status: 500 }
      );
    }

    // Log activity
    await supabase
      .from('contract_activities')
      .insert({
        contract_id: result.data.id,
        contract_type: type,
        activity_type: 'created',
        activity_description: `${type} contract ${contractData.reference_no} created for ${contractData.owner_name}`,
        activity_data: {
          reference_no: contractData.reference_no,
          vehicle: `${contractData.make} ${contractData.model} (${contractData.model_year})`,
          vin: contractData.vin
        }
      });

    return NextResponse.json({
      contract: result.data,
      message: `${type} contract created successfully`
    });

  } catch (error) {
    console.error('Error creating contract:', error);
    return NextResponse.json(
      { 
        error: 'Failed to create contract',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 