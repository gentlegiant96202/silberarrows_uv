-- Check current sequence state and fix it to start properly

-- Check what RES numbers currently exist
SELECT 
    document_number,
    customer_name,
    document_type,
    created_at
FROM vehicle_reservations 
WHERE document_number LIKE 'RES-%'
ORDER BY document_number;

-- Check current sequence value
SELECT 
    'reservation_number_seq' as sequence_name,
    last_value,
    is_called
FROM reservation_number_seq;

-- Reset sequence to start at 1000 again (since we want clean numbering)
ALTER SEQUENCE reservation_number_seq RESTART WITH 1000;
ALTER SEQUENCE invoice_number_seq RESTART WITH 1000;

-- Verify reset
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

-- Clean up the test record
DELETE FROM vehicle_reservations WHERE customer_name = 'TEST TRIGGER';
