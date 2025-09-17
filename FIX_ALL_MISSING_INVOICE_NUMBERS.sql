-- Fix all invoices that are missing proper INV numbers

-- Show current invoices and their numbers
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number
FROM vehicle_reservations 
WHERE document_type = 'invoice'
ORDER BY created_at;

-- Fix all invoices that don't have INV numbers
UPDATE vehicle_reservations 
SET 
    document_number = 'INV-' || nextval('invoice_number_seq'),
    original_reservation_number = CASE 
        WHEN document_number LIKE 'RES-%' THEN document_number
        ELSE original_reservation_number
    END
WHERE document_type = 'invoice' 
AND (document_number IS NULL OR document_number NOT LIKE 'INV-%');

-- Show result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    'FIXED' as status
FROM vehicle_reservations 
WHERE document_type = 'invoice'
ORDER BY document_number;

-- Show final sequence state
SELECT 
    'invoice_number_seq' as sequence_name,
    last_value,
    is_called
FROM invoice_number_seq;
