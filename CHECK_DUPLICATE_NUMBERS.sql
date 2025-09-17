-- Check what records have INV-1000 and other numbers

-- Show all current document numbers
SELECT 
    document_number,
    document_type,
    customer_name,
    created_at,
    updated_at
FROM vehicle_reservations 
WHERE document_number IS NOT NULL
ORDER BY document_number;

-- Specifically check for INV-1000
SELECT 
    id,
    document_number,
    original_reservation_number,
    document_type,
    customer_name
FROM vehicle_reservations 
WHERE document_number = 'INV-1000';

-- Check current sequence values
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
