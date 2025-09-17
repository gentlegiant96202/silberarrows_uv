-- Quick test: Convert a reservation to invoice to see dual PDFs

-- First, check what reservations we have available
SELECT 
    id,
    document_number,
    customer_name,
    pdf_url,
    'Ready to convert' as status
FROM vehicle_reservations 
WHERE document_type = 'reservation'
AND document_number LIKE 'RES-%'
ORDER BY created_at DESC
LIMIT 3;

-- Convert RES-1000 (ABHINAV) to invoice for testing
-- This should trigger the preservation logic
DO $$
DECLARE
    reservation_id UUID;
BEGIN
    -- Get the ID of RES-1000
    SELECT id INTO reservation_id
    FROM vehicle_reservations 
    WHERE document_number = 'RES-1000';
    
    IF reservation_id IS NOT NULL THEN
        -- Convert reservation to invoice
        UPDATE vehicle_reservations 
        SET document_type = 'invoice'
        WHERE id = reservation_id;
        
        RAISE NOTICE 'Converted RES-1000 to invoice - should now show dual PDFs!';
    ELSE
        RAISE NOTICE 'RES-1000 not found';
    END IF;
END $$;

-- Check the result - should show preserved data
SELECT 
    document_number as new_invoice_number,
    original_reservation_number,
    pdf_url as invoice_pdf,
    original_reservation_pdf_url as reservation_pdf,
    customer_name,
    'AFTER CONVERSION' as status
FROM vehicle_reservations 
WHERE customer_name = 'ABHINAV';

-- Show all recent records
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    CASE 
        WHEN original_reservation_pdf_url IS NOT NULL THEN '✅ Has both PDFs'
        WHEN pdf_url IS NOT NULL THEN '📄 Has current PDF only'
        ELSE '❌ No PDFs'
    END as pdf_status
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 8;

