-- Backfill missing document numbers for existing records

-- Fix reservations with NULL document_number
UPDATE vehicle_reservations 
SET document_number = 'RES-' || nextval('reservation_number_seq')
WHERE document_type = 'reservation' 
AND document_number IS NULL;

-- Fix invoices with NULL document_number  
UPDATE vehicle_reservations 
SET document_number = 'INV-' || nextval('invoice_number_seq')
WHERE document_type = 'invoice' 
AND document_number IS NULL;

-- Show final result
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    CASE 
        WHEN reservation_pdf_url IS NOT NULL THEN '📄 Has Res PDF'
        WHEN invoice_pdf_url IS NOT NULL THEN '📄 Has Inv PDF'
        ELSE '❌ No PDFs'
    END as pdf_status
FROM vehicle_reservations 
ORDER BY created_at;
