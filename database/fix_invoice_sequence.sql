-- Fix invoice sequence to match existing invoices
-- Check current state and update sequence accordingly

-- First, let's see what invoices actually exist
SELECT 
    document_number,
    document_type,
    created_at
FROM vehicle_reservations 
WHERE document_type = 'invoice' 
    AND document_number IS NOT NULL
ORDER BY document_number;

-- Count total invoices
SELECT COUNT(*) as total_invoices
FROM vehicle_reservations 
WHERE document_type = 'invoice' 
    AND document_number IS NOT NULL;

-- Get the highest invoice number
SELECT 
    document_number,
    CAST(SUBSTRING(document_number FROM 'INV-(.*)') AS INTEGER) as invoice_num
FROM vehicle_reservations 
WHERE document_type = 'invoice' 
    AND document_number IS NOT NULL
ORDER BY CAST(SUBSTRING(document_number FROM 'INV-(.*)') AS INTEGER) DESC
LIMIT 1;

-- Update the sequence to continue from the highest existing invoice number
DO $$
DECLARE
    max_invoice_num INTEGER;
BEGIN
    -- Get the highest existing invoice number
    SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 'INV-(.*)') AS INTEGER)), 999)
    INTO max_invoice_num
    FROM vehicle_reservations 
    WHERE document_type = 'invoice' 
        AND document_number IS NOT NULL;
    
    -- Set the sequence to continue from the next number
    PERFORM setval('invoice_number_seq', max_invoice_num + 1);
    
    RAISE NOTICE 'Updated invoice sequence to: %', max_invoice_num + 1;
    RAISE NOTICE 'Next invoice will be: INV-%', max_invoice_num + 1;
END $$;

-- Verify the sequence is now correct
SELECT 
    'invoice_number_seq' as sequence_name,
    currval('invoice_number_seq') as current_value,
    nextval('invoice_number_seq') as next_value;

-- Reset the sequence back (since we just used nextval to peek)
SELECT setval('invoice_number_seq', currval('invoice_number_seq') - 1);

-- Final verification
SELECT 
    'invoice_number_seq' as sequence_name,
    currval('invoice_number_seq') as current_value;
