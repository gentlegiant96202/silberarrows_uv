-- Test the exact trigger logic to see why INV numbers aren't being generated

-- Check current MALAK state
SELECT 
    id,
    document_type,
    document_number,
    original_reservation_number,
    customer_name
FROM vehicle_reservations 
WHERE customer_name = 'MALAK';

-- Manual trigger test with detailed logging
DO $$
DECLARE
    malak_id UUID;
    before_doc_type TEXT;
    before_doc_number TEXT;
    after_doc_type TEXT;
    after_doc_number TEXT;
    after_original TEXT;
BEGIN
    -- Get MALAK's ID and current state
    SELECT id, document_type, document_number 
    INTO malak_id, before_doc_type, before_doc_number
    FROM vehicle_reservations 
    WHERE customer_name = 'MALAK';
    
    RAISE NOTICE 'BEFORE: Type=%, Number=%', before_doc_type, before_doc_number;
    
    -- Force conversion (this should trigger the function)
    UPDATE vehicle_reservations 
    SET document_type = 'invoice'
    WHERE id = malak_id;
    
    -- Check what happened
    SELECT document_type, document_number, original_reservation_number
    INTO after_doc_type, after_doc_number, after_original
    FROM vehicle_reservations 
    WHERE id = malak_id;
    
    RAISE NOTICE 'AFTER: Type=%, Number=%, Original=%', after_doc_type, after_doc_number, after_original;
    
    -- Check sequence state
    RAISE NOTICE 'Invoice sequence after: last_value=%, is_called=%', 
        (SELECT last_value FROM invoice_number_seq),
        (SELECT is_called FROM invoice_number_seq);
END $$;
