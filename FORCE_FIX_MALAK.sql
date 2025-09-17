-- Force fix MALAK record manually since trigger isn't working as expected

-- Manual fix for MALAK
UPDATE vehicle_reservations 
SET 
    document_number = 'INV-1000',
    original_reservation_number = 'RES-1000'
WHERE customer_name = 'MALAK';

-- Check result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number
FROM vehicle_reservations 
WHERE customer_name = 'MALAK';

-- Reset invoice sequence to 1001 so next invoice will be INV-1001
SELECT setval('invoice_number_seq', 1001);

-- Check sequence state
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;
