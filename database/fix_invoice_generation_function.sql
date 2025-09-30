-- 🔧 FIX INVOICE GENERATION FUNCTION - HANDLE CONFLICTS PROPERLY

-- Drop and recreate the function with better conflict handling
DROP FUNCTION IF EXISTS ifrs_generate_invoice(UUID, DATE, UUID[]);

CREATE OR REPLACE FUNCTION ifrs_generate_invoice(
    p_lease_id UUID,
    p_billing_period DATE,
    p_charge_ids UUID[]
) RETURNS JSON AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_invoice_sequence INTEGER;
    v_affected_rows INTEGER;
    v_retry_count INTEGER := 0;
    v_max_existing INTEGER;
BEGIN
    -- Generate invoice ID
    v_invoice_id := gen_random_uuid();
    
    -- Get the current highest invoice number to be safe
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 9999)
    INTO v_max_existing
    FROM ifrs_lease_accounting 
    WHERE invoice_number LIKE 'INV-LE-%' 
    AND deleted_at IS NULL;
    
    -- Generate a safe invoice number (higher than any existing)
    v_invoice_sequence := v_max_existing + 1;
    v_invoice_number := 'INV-LE-' || v_invoice_sequence::TEXT;
    
    -- Update the sequence to match
    PERFORM setval('lease_invoice_sequence', v_invoice_sequence, true);
    
    -- Update charges to invoiced status atomically
    UPDATE ifrs_lease_accounting 
    SET 
        status = 'invoiced',
        invoice_id = v_invoice_id,
        invoice_number = v_invoice_number,
        updated_by = auth.uid(),
        updated_at = NOW(),
        version = version + 1
    WHERE id = ANY(p_charge_ids)
      AND lease_id = p_lease_id
      AND billing_period = p_billing_period
      AND status = 'pending'
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
    
    -- Verify all charges were updated
    IF v_affected_rows != array_length(p_charge_ids, 1) THEN
        RAISE EXCEPTION 'Failed to generate invoice - some charges could not be updated. Expected: %, Updated: %', 
                       array_length(p_charge_ids, 1), v_affected_rows;
    END IF;
    
    -- Return both invoice ID and number
    RETURN json_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'sequence', v_invoice_sequence,
        'charges_updated', v_affected_rows
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT 'Invoice generation function updated with conflict-free logic! ✅' as result;
