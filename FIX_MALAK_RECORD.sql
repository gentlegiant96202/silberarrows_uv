-- Fix the MALAK record that has wrong numbers after conversion

-- Current broken state: document_type='invoice', document_number='RES-1000', original_reservation_number=null
-- Should be: document_type='invoice', document_number='INV-1000', original_reservation_number='RES-1000'

-- Fix MALAK record manually
UPDATE vehicle_reservations 
SET 
    document_number = 'INV-' || nextval('invoice_number_seq'),
    original_reservation_number = 'RES-1000'
WHERE customer_name = 'MALAK' 
AND document_type = 'invoice' 
AND document_number = 'RES-1000';

-- Check the result
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name
FROM vehicle_reservations 
WHERE customer_name = 'MALAK';

-- Check sequence state after fix
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;
