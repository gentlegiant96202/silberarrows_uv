-- Test the reservation to invoice conversion with number preservation
-- This will demonstrate how RES-1004 converts to INV-1007 while preserving RES-1004

-- First, let's see the current state of RES-1004
SELECT 
    id,
    document_number,
    original_reservation_number,
    document_type,
    customer_name
FROM vehicle_reservations 
WHERE document_number = 'RES-1004';

-- Now let's simulate converting RES-1004 to an invoice
-- Find the RES-1004 record and convert it
DO $$
DECLARE
    reservation_id UUID;
BEGIN
    -- Get the ID of RES-1004
    SELECT id INTO reservation_id
    FROM vehicle_reservations 
    WHERE document_number = 'RES-1004';
    
    IF reservation_id IS NOT NULL THEN
        -- Convert reservation to invoice (this will trigger our preservation logic)
        UPDATE vehicle_reservations 
        SET document_type = 'invoice'
        WHERE id = reservation_id;
        
        RAISE NOTICE 'Converted RES-1004 to invoice for customer RAHMAN';
    ELSE
        RAISE NOTICE 'RES-1004 not found';
    END IF;
END $$;

-- Check the result - should show:
-- - document_number: INV-1007 (new invoice number)
-- - original_reservation_number: RES-1004 (preserved)
-- - document_type: invoice
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    'AFTER CONVERSION' as status
FROM vehicle_reservations 
WHERE customer_name = 'RAHMAN';

-- Show all recent records to see the full picture
SELECT 
    document_number,
    original_reservation_number,
    document_type,
    customer_name,
    created_at
FROM vehicle_reservations 
ORDER BY created_at DESC
LIMIT 8;

