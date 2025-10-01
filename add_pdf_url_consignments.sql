-- Add PDF URL field to consignments table
-- This stores the URL of generated PDF quotations

-- Add PDF URL field
ALTER TABLE consignments 
ADD COLUMN IF NOT EXISTS pdf_quotation_url TEXT;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_consignments_pdf_url ON consignments(pdf_quotation_url);

-- Verify the changes
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'consignments' 
AND column_name = 'pdf_quotation_url';

-- Show sample data
SELECT id, status, vehicle_make, vehicle_model, pdf_quotation_url 
FROM consignments 
ORDER BY created_at DESC 
LIMIT 3;
