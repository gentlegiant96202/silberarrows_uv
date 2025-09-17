-- Check the current trigger function definition
SELECT routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'generate_document_number';

-- Also check what triggers exist on the table
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'vehicle_reservations';

-- Test the trigger manually with a direct update
DO $$
DECLARE
    test_record RECORD;
BEGIN
    -- Find the MALAK record
    SELECT * INTO test_record
    FROM vehicle_reservations 
    WHERE customer_name = 'MALAK';
    
    IF test_record.id IS NOT NULL THEN
        RAISE NOTICE 'MALAK record: Type=%, Number=%, Original=%', 
            test_record.document_type, test_record.document_number, test_record.original_reservation_number;
        
        -- Force trigger to fire by updating document_type to invoice
        UPDATE vehicle_reservations 
        SET document_type = 'invoice', updated_at = NOW()
        WHERE customer_name = 'MALAK';
        
        -- Check result
        SELECT * INTO test_record
        FROM vehicle_reservations 
        WHERE customer_name = 'MALAK';
        
        RAISE NOTICE 'AFTER manual update: Type=%, Number=%, Original=%', 
            test_record.document_type, test_record.document_number, test_record.original_reservation_number;
    END IF;
END $$;
