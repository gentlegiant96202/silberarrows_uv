-- Add receipt columns to uv_payments table
-- Run this in Supabase SQL Editor

-- Add receipt_url column to store the generated PDF
ALTER TABLE uv_payments
ADD COLUMN IF NOT EXISTS receipt_url TEXT;

-- Add receipt_number column for unique receipt identifiers
ALTER TABLE uv_payments
ADD COLUMN IF NOT EXISTS receipt_number TEXT UNIQUE;

-- Create sequence for receipt numbers starting at 1000
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1000;

-- Function to auto-generate receipt number on insert
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    -- Generate receipt number (RCP-XXXX) for new payments
    IF NEW.receipt_number IS NULL THEN
        NEW.receipt_number := 'RCP-' || nextval('receipt_number_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_generate_receipt_number ON uv_payments;

CREATE TRIGGER trigger_generate_receipt_number
    BEFORE INSERT ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_number();

-- Backfill existing payments with receipt numbers
DO $$
DECLARE
    rec RECORD;
    rcp_counter INTEGER := 1000;
BEGIN
    FOR rec IN
        SELECT id
        FROM uv_payments
        WHERE receipt_number IS NULL
        ORDER BY created_at ASC
    LOOP
        UPDATE uv_payments
        SET receipt_number = 'RCP-' || rcp_counter
        WHERE id = rec.id;
        rcp_counter := rcp_counter + 1;
    END LOOP;
    
    -- Update sequence to continue from where we left off
    PERFORM setval('receipt_number_seq', rcp_counter);
END $$;

-- Verify the changes
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'uv_payments' 
AND column_name IN ('receipt_url', 'receipt_number');

