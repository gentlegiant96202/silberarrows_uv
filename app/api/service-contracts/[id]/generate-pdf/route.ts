import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to validate user permissions
async function validateUserPermissions(request: NextRequest, requiredPermission: 'edit') {
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
    const hasPermission = perms.can_edit;

    if (!hasPermission) {
      return { error: `Insufficient permissions for ${requiredPermission} operation`, status: 403 };
    }

    return { user, permissions: perms };
  } catch (error) {
    console.error('Permission validation error:', error);
    return { error: 'Permission validation failed', status: 500 };
  }
}

// POST - Generate PDF for existing contract
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Validate edit permissions (generating PDF is considered editing)
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
    const type = body.type || 'service';

    console.log('🔄 Generating PDF for existing contract:', contractId, '- DocuSign fields ready');

    // Get contract data from database
    const tableName = type === 'warranty' ? 'warranty_contracts' : 'service_contracts';
    
    const { data: contract, error: fetchError } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', contractId)
      .single();

    if (fetchError) {
      console.error('Error fetching contract:', fetchError);
      return NextResponse.json(
        { error: 'Contract not found', details: fetchError.message },
        { status: 404 }
      );
    }

    console.log('✅ Contract data retrieved:', contract.reference_no);

    // Prepare data for PDF generation (matching the format expected by the PDF service)
    const pdfData = {
      referenceNo: contract.reference_no,
      ownerName: contract.owner_name,
      mobileNo: contract.mobile_no,
      email: contract.email,
      customerIdType: contract.customer_id_type,
      customerIdNumber: contract.customer_id_number,
      dealerName: contract.dealer_name || 'SilberArrows',
      dealerPhone: contract.dealer_phone || '+971 4 380 5515',
      dealerEmail: contract.dealer_email || 'service@silberarrows.com',
      vin: contract.vin,
      make: contract.make,
      model: contract.model,
      modelYear: contract.model_year,
      currentOdometer: contract.current_odometer,
      exteriorColour: contract.exterior_colour,
      interiorColour: contract.interior_colour,
      serviceType: contract.service_type,
      startDate: contract.start_date,
      endDate: contract.end_date,
      cutOffKm: contract.cut_off_km,
      invoiceAmount: contract.invoice_amount,
      salesExecutive: contract.sales_executive,
      notes: contract.notes || ''
    };

    console.log('📄 Calling PDF generation service...');

    // Generate PDF using the existing service agreement generator
    const baseUrl = process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : process.env.NODE_ENV === 'development' 
        ? 'http://localhost:3000'
        : `https://${request.headers.get('host')}`;
    
    const pdfResponse = await fetch(`${baseUrl}/api/generate-service-agreement`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...pdfData,
        skipDatabase: true // Skip database operations since contract already exists
      }),
    });

    if (!pdfResponse.ok) {
      console.error('PDF generation failed:', await pdfResponse.text());
      return NextResponse.json(
        { error: 'Failed to generate PDF' },
        { status: 500 }
      );
    }

    console.log('✅ PDF generated successfully');

    // Get the PDF as buffer
    const pdfBuffer = await pdfResponse.arrayBuffer();
    const buffer = Buffer.from(pdfBuffer);

    // Generate unique filename for storage
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, '');
    const filename = `${type}_contract_${contract.reference_no}_${timestamp}.pdf`;
    const filePath = `service-documents/${filename}`;

    console.log('📤 Uploading PDF to storage:', filePath);

    // Upload to Supabase storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-documents')
      .upload(filePath, buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Still return the PDF even if storage fails
      console.log('⚠️ Storage failed, returning PDF without saving URL');
      
      return new NextResponse(buffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    console.log('✅ PDF uploaded to storage:', uploadData.path);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-documents')
      .getPublicUrl(filePath);

    const publicUrl = urlData.publicUrl;
    console.log('🔗 Public URL generated:', publicUrl);

    // Update contract with PDF URL and reset signing status
    // When regenerating PDF, we need to reset all signing-related fields
    // so the contract can be sent for signing again with the new PDF
    console.log('🔄 Attempting database update for contract:', contractId, 'in table:', tableName);
    
    const updateData = { 
      pdf_url: publicUrl,
      updated_at: new Date().toISOString(),
      // Reset signing fields when new PDF is generated
      signing_status: 'pending',
      docusign_envelope_id: null,
      signed_pdf_url: null,
      sent_for_signing_at: null
    };
    
    console.log('📝 Update data:', updateData);
    
    const { error: updateError } = await supabase
      .from(tableName)
      .update(updateData)
      .eq('id', contractId);

    if (updateError) {
      console.error('💥 Database update error:', updateError);
      console.error('💥 Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code,
        tableName,
        contractId
      });
      // Continue without failing - PDF is still generated
    } else {
      console.log('✅ Contract updated with PDF URL and signing status reset to pending');
    }

    // Log activity
    try {
      await supabase
        .from('contract_activities')
        .insert({
          contract_id: contractId,
          contract_type: type,
          activity_type: 'pdf_generated',
          activity_description: `PDF document regenerated by ${validation.user.email} - signing status reset to pending`,
          activity_data: {
            filename: filename,
            generated_by: validation.user.email,
            generated_at: new Date().toISOString(),
            pdf_url: publicUrl,
            signing_status_reset: true,
            previous_signing_fields_cleared: ['docusign_envelope_id', 'signed_pdf_url', 'sent_for_signing_at']
          }
        });
    } catch (activityError) {
      console.error('Failed to log activity:', activityError);
      // Continue without failing
    }

    console.log('🎉 PDF generation complete');

    // Return the PDF for download
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    const { id } = await params;
    const contractId = id;
    const body = await request.json().catch(() => ({}));
    
    console.error('💥 Error generating PDF:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    console.error('💥 Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      contractId,
      type: body?.type || 'unknown',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to generate PDF',
        details: error instanceof Error ? error.message : 'Unknown error',
        contractId,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 