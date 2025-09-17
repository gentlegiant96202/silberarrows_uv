-- Fix MALAK record properly by giving it the next available invoice number

-- First, see who has INV-1000
SELECT 
    document_number,
    customer_name,
    document_type
FROM vehicle_reservations 
WHERE document_number = 'INV-1000';

-- Fix MALAK with the next invoice number (INV-1001)
UPDATE vehicle_reservations 
SET 
    document_number = 'INV-' || nextval('invoice_number_seq'),
    original_reservation_number = 'RES-1000'
WHERE customer_name = 'MALAK' 
AND document_type = 'invoice';

-- Check MALAK's final state
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name
FROM vehicle_reservations 
WHERE customer_name = 'MALAK';

-- Show current sequence state
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;
