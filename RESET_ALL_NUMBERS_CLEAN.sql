-- Complete reset: clear all numbers and restart sequences from 1000

-- Step 1: Clear all document numbers AND PDF URLs for complete fresh start
UPDATE vehicle_reservations 
SET 
    document_number = NULL,
    original_reservation_number = NULL,
    pdf_url = NULL,
    reservation_pdf_url = NULL,
    invoice_pdf_url = NULL;

-- Step 2: Reset both sequences to start at 1000
ALTER SEQUENCE reservation_number_seq RESTART WITH 1000;
ALTER SEQUENCE invoice_number_seq RESTART WITH 1000;

-- Step 3: Verify everything is cleared
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    pdf_url,
    reservation_pdf_url,
    invoice_pdf_url,
    'CLEARED' as status
FROM vehicle_reservations 
ORDER BY created_at;

-- Step 4: Show sequence states (should be 1000, false)
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

-- Step 5: Success message
DO $$
BEGIN
    RAISE NOTICE '=== COMPLETE RESET DONE ===';
    RAISE NOTICE 'All document numbers and PDF URLs cleared';
    RAISE NOTICE 'Both sequences reset to 1000';
    RAISE NOTICE 'Next reservation: RES-1000';
    RAISE NOTICE 'Next invoice: INV-1000';
    RAISE NOTICE '===========================';
END $$;
