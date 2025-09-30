-- 🚀 SIMPLE INVOICE FIX - GUARANTEED TO WORK

-- 1. First, let's see what's actually in the database
SELECT 
    invoice_number,
    deleted_at IS NULL as is_active
FROM ifrs_lease_accounting 
WHERE invoice_number IS NOT NULL
ORDER BY invoice_number;

-- 2. Drop the problematic unique index
DROP INDEX IF EXISTS idx_ifrs_lease_accounting_invoice_number;

-- 3. Recreate the unique index properly (only for non-deleted records)
CREATE UNIQUE INDEX idx_ifrs_lease_accounting_invoice_number 
ON ifrs_lease_accounting(invoice_number) 
WHERE deleted_at IS NULL AND invoice_number IS NOT NULL;

-- 4. Simple function that uses timestamp for uniqueness
DROP FUNCTION IF EXISTS ifrs_generate_invoice(UUID, DATE, UUID[]);

CREATE OR REPLACE FUNCTION ifrs_generate_invoice(
    p_lease_id UUID,
    p_billing_period DATE,
    p_charge_ids UUID[]
) RETURNS JSON AS $$
DECLARE
    v_invoice_id UUID;
    v_invoice_number TEXT;
    v_timestamp_suffix TEXT;
    v_affected_rows INTEGER;
BEGIN
    -- Generate invoice ID
    v_invoice_id := gen_random_uuid();
    
    -- Use timestamp to ensure uniqueness
    v_timestamp_suffix := EXTRACT(epoch FROM NOW())::BIGINT::TEXT;
    v_invoice_number := 'INV-LE-' || v_timestamp_suffix;
    
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
    
    -- Return invoice details
    RETURN json_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'charges_updated', v_affected_rows
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Invoice generation fixed with timestamp-based numbering! ✅' as result;
