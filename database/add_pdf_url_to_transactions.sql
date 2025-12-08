-- Add pdf_url column to uv_payments table for storing receipt PDFs
ALTER TABLE uv_payments 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add pdf_url column to uv_adjustments table for storing credit note and refund PDFs
ALTER TABLE uv_adjustments 
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comments for documentation
COMMENT ON COLUMN uv_payments.pdf_url IS 'URL to the generated receipt PDF stored in Supabase storage';
COMMENT ON COLUMN uv_adjustments.pdf_url IS 'URL to the generated credit note or refund PDF stored in Supabase storage';
