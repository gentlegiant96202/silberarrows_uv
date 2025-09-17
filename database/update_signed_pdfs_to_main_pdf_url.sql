-- Update existing signed PDFs to replace main pdf_url
-- This ensures accounting module shows signed PDFs for completed documents

-- Update vehicle_reservations where signed_pdf_url exists but pdf_url hasn't been replaced
UPDATE vehicle_reservations 
SET pdf_url = signed_pdf_url
WHERE signed_pdf_url IS NOT NULL 
  AND signing_status = 'completed'
  AND (pdf_url IS NULL OR pdf_url != signed_pdf_url);

-- Log the changes
DO $$
DECLARE
    updated_count INTEGER;
    rec RECORD;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % vehicle reservation records to use signed PDF as main PDF', updated_count;
    
    -- Show current status
    RAISE NOTICE 'Current signed document status:';
    
    FOR rec IN 
        SELECT id, document_type, customer_name, signing_status, 
               CASE WHEN pdf_url = signed_pdf_url THEN 'MATCHED' ELSE 'DIFFERENT' END as pdf_status
        FROM vehicle_reservations 
        WHERE signed_pdf_url IS NOT NULL
    LOOP
        RAISE NOTICE 'ID: %, Type: %, Customer: %, Status: %, PDF Status: %', 
            rec.id, rec.document_type, rec.customer_name, rec.signing_status, rec.pdf_status;
    END LOOP;
END $$;
