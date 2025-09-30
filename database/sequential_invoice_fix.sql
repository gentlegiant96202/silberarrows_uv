-- 🎯 SEQUENTIAL INVOICE FIX - PROPER INV-LE-XXXX FORMAT

-- 1. Check existing invoices and find gaps
WITH invoice_numbers AS (
    SELECT CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER) as num
    FROM ifrs_lease_accounting 
    WHERE invoice_number LIKE 'INV-LE-%' 
    AND deleted_at IS NULL
),
number_series AS (
    SELECT generate_series(1000, 20000) as num
)
SELECT 
    'First available number:' as info,
    MIN(ns.num) as first_available
FROM number_series ns
LEFT JOIN invoice_numbers inv ON ns.num = inv.num
WHERE inv.num IS NULL;

-- 2. Drop and recreate function with proper sequential logic
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
BEGIN
    -- Generate invoice ID
    v_invoice_id := gen_random_uuid();
    
    -- Lock the table to prevent concurrent access during number generation
    LOCK TABLE ifrs_lease_accounting IN EXCLUSIVE MODE;
    
    -- Find the first available sequential number starting from 1000
    WITH existing_numbers AS (
        SELECT CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER) as num
        FROM ifrs_lease_accounting 
        WHERE invoice_number LIKE 'INV-LE-%' 
        AND deleted_at IS NULL
    ),
    available_numbers AS (
        SELECT generate_series(1000, 99999) as num
        EXCEPT
        SELECT num FROM existing_numbers
    )
    SELECT num INTO v_invoice_sequence
    FROM available_numbers
    ORDER BY num
    LIMIT 1;
    
    -- Generate invoice number
    v_invoice_number := 'INV-LE-' || v_invoice_sequence::TEXT;
    
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
    
    -- Update sequence to stay in sync
    PERFORM setval('lease_invoice_sequence', v_invoice_sequence, true);
    
    -- Return invoice details
    RETURN json_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'sequence', v_invoice_sequence,
        'charges_updated', v_affected_rows
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Sequential invoice generation with gap-filling logic implemented! ✅' as result;
