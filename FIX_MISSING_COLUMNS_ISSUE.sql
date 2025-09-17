-- Emergency fix for missing separate PDF columns
-- This addresses the issue where reservation PDFs aren't showing after conversion

-- First, check if the new columns exist
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'vehicle_reservations' 
AND column_name IN ('reservation_pdf_url', 'invoice_pdf_url')
ORDER BY column_name;

-- If columns don't exist, create them immediately
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS reservation_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS invoice_pdf_url TEXT;

-- Emergency data migration for current problematic record
-- Find the RAHMAN record and fix the PDF URLs based on document history
DO $$
DECLARE
    rahman_record RECORD;
BEGIN
    -- Get the RAHMAN record
    SELECT * INTO rahman_record
    FROM vehicle_reservations 
    WHERE customer_name = 'RAHMAN'
    ORDER BY updated_at DESC
    LIMIT 1;
    
    IF rahman_record.id IS NOT NULL THEN
        RAISE NOTICE 'Found RAHMAN record: ID=%, Type=%, PDF=%', 
            rahman_record.id, rahman_record.document_type, rahman_record.pdf_url;
            
        -- If it's currently an invoice but has no separate PDF columns populated
        IF rahman_record.document_type = 'invoice' AND 
           rahman_record.reservation_pdf_url IS NULL AND 
           rahman_record.invoice_pdf_url IS NULL THEN
            
            RAISE NOTICE 'Fixing PDF columns for converted invoice...';
            
            -- For now, we'll assume the current PDF is the invoice PDF
            -- The original reservation PDF may be lost, but we can prevent future issues
            UPDATE vehicle_reservations 
            SET 
                invoice_pdf_url = pdf_url,
                -- Mark that original reservation PDF is missing
                reservation_pdf_url = NULL
            WHERE id = rahman_record.id;
            
            RAISE NOTICE 'Updated invoice_pdf_url to: %', rahman_record.pdf_url;
        END IF;
    END IF;
END $$;

-- Show the current state after fix
SELECT 
    customer_name,
    document_type,
    document_number,
    original_reservation_number,
    pdf_url as legacy_pdf,
    reservation_pdf_url,
    invoice_pdf_url,
    CASE 
        WHEN reservation_pdf_url IS NOT NULL AND invoice_pdf_url IS NOT NULL THEN '✅ Both PDFs'
        WHEN reservation_pdf_url IS NOT NULL THEN '📄 Reservation PDF only'
        WHEN invoice_pdf_url IS NOT NULL THEN '📄 Invoice PDF only'
        WHEN pdf_url IS NOT NULL THEN '⚠️ Legacy PDF only'
        ELSE '❌ No PDFs'
    END as pdf_status
FROM vehicle_reservations 
WHERE customer_name = 'RAHMAN'
ORDER BY created_at DESC;

-- Show instructions
DO $$
BEGIN
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Run STEP9_SEPARATE_PDF_COLUMNS.sql for full migration';
    RAISE NOTICE '2. For future reservations, the PDF preservation will work correctly';
    RAISE NOTICE '3. Current RAHMAN record has been patched to prevent 400 errors';
    RAISE NOTICE '==================';
END $$;
