-- Copy the actual PDF file during reservation to invoice conversion
-- This ensures the original reservation PDF is preserved regardless of DocuSign changes

-- Add a function to copy PDF files during conversion
-- This will be called by the application layer, not the trigger

-- First, let's see what we're working with
SELECT 
    document_number,
    original_reservation_number,
    customer_name,
    pdf_url,
    original_reservation_pdf_url,
    CASE 
        WHEN pdf_url IS NOT NULL AND original_reservation_pdf_url IS NOT NULL THEN 'Both PDFs exist'
        WHEN pdf_url IS NOT NULL THEN 'Only current PDF'
        WHEN original_reservation_pdf_url IS NOT NULL THEN 'Only original PDF'
        ELSE 'No PDFs'
    END as pdf_status,
    created_at,
    updated_at
FROM vehicle_reservations 
WHERE document_type = 'invoice'
AND original_reservation_number IS NOT NULL
ORDER BY updated_at DESC;

-- Create a log table to track PDF preservation attempts
CREATE TABLE IF NOT EXISTS pdf_preservation_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reservation_id UUID REFERENCES vehicle_reservations(id),
    original_pdf_url TEXT,
    preserved_pdf_url TEXT,
    preservation_status TEXT, -- 'success', 'failed', 'pending'
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE pdf_preservation_log IS 'Tracks PDF file preservation during reservation to invoice conversion';

-- Show current state
DO $$
BEGIN
    RAISE NOTICE '=== PDF PRESERVATION STRATEGY ===';
    RAISE NOTICE 'Problem: Original reservation PDFs get replaced/expired during DocuSign process';
    RAISE NOTICE 'Solution: Copy actual PDF file content during conversion, not just URL reference';
    RAISE NOTICE 'Implementation: Application layer will handle file copying to permanent storage';
    RAISE NOTICE '=====================================';
END $$;
