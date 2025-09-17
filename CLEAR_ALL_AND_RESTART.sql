-- Clear ALL numbers and PDFs, restart sequences from 1000

-- Step 1: Clear all document numbers and PDF URLs
UPDATE vehicle_reservations 
SET 
    document_number = NULL,
    original_reservation_number = NULL,
    pdf_url = NULL,
    reservation_pdf_url = NULL,
    invoice_pdf_url = NULL;

-- Step 2: Reset sequences to 1000
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
    invoice_pdf_url
FROM vehicle_reservations 
ORDER BY created_at;

-- Step 4: Check sequences are reset
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
