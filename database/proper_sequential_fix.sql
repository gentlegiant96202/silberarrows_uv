-- 🔧 PROPER SEQUENTIAL INVOICE NUMBER FIX

-- 1. First, let's see what invoice numbers actually exist
SELECT 
    'Existing invoice numbers:' as info,
    invoice_number,
    CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER) as number_part
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%' 
AND deleted_at IS NULL
ORDER BY CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER);

-- 2. Find the actual highest number
SELECT 
    'Actual highest number:' as info,
    MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)) as max_number
FROM ifrs_lease_accounting 
WHERE invoice_number LIKE 'INV-LE-%' 
AND deleted_at IS NULL;

-- 3. Drop and recreate the function with better logic
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
    v_max_existing INTEGER;
    v_attempt_count INTEGER := 0;
BEGIN
    -- Generate invoice ID
    v_invoice_id := gen_random_uuid();
    
    -- Use a transaction-safe approach to get next number
    LOOP
        -- Get the absolute maximum existing invoice number
        SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM 'INV-LE-(\d+)') AS INTEGER)), 0)
        INTO v_max_existing
        FROM ifrs_lease_accounting 
        WHERE invoice_number LIKE 'INV-LE-%' 
        AND deleted_at IS NULL;
        
        -- Generate next sequential number
        v_invoice_sequence := v_max_existing + 1;
        v_invoice_number := 'INV-LE-' || v_invoice_sequence::TEXT;
        
        -- Try to update charges with this invoice number
        BEGIN
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
            
            -- If successful, exit the loop
            EXIT;
            
        EXCEPTION 
            WHEN unique_violation THEN
                -- If there's still a conflict, increment attempt count
                v_attempt_count := v_attempt_count + 1;
                IF v_attempt_count > 50 THEN
                    RAISE EXCEPTION 'Unable to generate unique invoice number after 50 attempts';
                END IF;
                -- Continue loop to try next number
        END;
    END LOOP;
    
    -- Update sequence to match the used number
    PERFORM setval('lease_invoice_sequence', v_invoice_sequence, true);
    
    -- Verify all charges were updated
    IF v_affected_rows != array_length(p_charge_ids, 1) THEN
        RAISE EXCEPTION 'Failed to generate invoice - some charges could not be updated. Expected: %, Updated: %', 
                       array_length(p_charge_ids, 1), v_affected_rows;
    END IF;
    
    -- Return invoice details
    RETURN json_build_object(
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number,
        'sequence', v_invoice_sequence,
        'charges_updated', v_affected_rows,
        'attempts', v_attempt_count + 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Success message
SELECT 'Sequential invoice generation fixed! Will find next available INV-LE-XXXX number! ✅' as result;
