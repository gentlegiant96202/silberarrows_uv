-- Debug why the conversion isn't showing INV numbers properly

-- 1. Check current state of the MALAK record
SELECT 
    id,
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    created_at,
    updated_at
FROM vehicle_reservations 
WHERE customer_name = 'MALAK'
ORDER BY updated_at DESC;

-- 2. Check if the trigger function exists and is correct
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines 
WHERE routine_name = 'generate_document_number';

-- 3. Check if the trigger is attached
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'generate_document_number_trigger';

-- 4. Check sequence current values
SELECT 
    'reservation_number_seq' as sequence_name,
    last_value,
    is_called
FROM reservation_number_seq
UNION ALL
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;

-- 5. Manual test: try converting a reservation to invoice manually
DO $$
DECLARE
    test_id UUID;
    before_record RECORD;
    after_record RECORD;
BEGIN
    -- Find a reservation to test with
    SELECT id INTO test_id
    FROM vehicle_reservations 
    WHERE document_type = 'reservation' 
    AND customer_name != 'MALAK'  -- Don't mess with the current test case
    LIMIT 1;
    
    IF test_id IS NOT NULL THEN
        -- Get before state
        SELECT * INTO before_record
        FROM vehicle_reservations 
        WHERE id = test_id;
        
        RAISE NOTICE 'BEFORE conversion: ID=%, Type=%, Number=%', 
            before_record.id, before_record.document_type, before_record.document_number;
        
        -- Convert to invoice
        UPDATE vehicle_reservations 
        SET document_type = 'invoice'
        WHERE id = test_id;
        
        -- Get after state
        SELECT * INTO after_record
        FROM vehicle_reservations 
        WHERE id = test_id;
        
        RAISE NOTICE 'AFTER conversion: ID=%, Type=%, Number=%, Original=%', 
            after_record.id, after_record.document_type, after_record.document_number, after_record.original_reservation_number;
            
        -- Revert for safety
        UPDATE vehicle_reservations 
        SET document_type = 'reservation'
        WHERE id = test_id;
        
        RAISE NOTICE 'Test completed and reverted';
    ELSE
        RAISE NOTICE 'No reservation found to test with';
    END IF;
END $$;
