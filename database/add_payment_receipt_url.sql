-- Add receipt_url column to ifrs_payments table
-- This will store the PDF receipt URL for each payment

DO $$ BEGIN
    ALTER TABLE ifrs_payments ADD COLUMN receipt_url TEXT NULL;
EXCEPTION
    WHEN duplicate_column THEN NULL;
END $$;

-- Add index for receipt_url lookups
CREATE INDEX IF NOT EXISTS idx_ifrs_payments_receipt_url 
ON ifrs_payments(receipt_url) WHERE receipt_url IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'ifrs_payments' 
AND column_name = 'receipt_url';
