-- =====================================================
-- STEP 5a: Update invoices table for dual PDFs
-- =====================================================
-- Add reservation_pdf_url for reservation document
-- Rename pdf_url to invoice_pdf_url for clarity
-- =====================================================

-- 1. Add reservation_pdf_url column
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS reservation_pdf_url TEXT;

-- 2. Rename pdf_url to invoice_pdf_url (if pdf_url exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'pdf_url'
    ) THEN
        ALTER TABLE invoices RENAME COLUMN pdf_url TO invoice_pdf_url;
        RAISE NOTICE 'Renamed pdf_url to invoice_pdf_url';
    ELSE
        -- If pdf_url doesn't exist, add invoice_pdf_url
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'invoice_pdf_url'
        ) THEN
            ALTER TABLE invoices ADD COLUMN invoice_pdf_url TEXT;
            RAISE NOTICE 'Added invoice_pdf_url column';
        END IF;
    END IF;
END $$;

-- 3. Add reservation signing fields (separate from invoice signing)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS reservation_signed_pdf_url TEXT;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS reservation_docusign_envelope_id TEXT;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS reservation_signing_status TEXT DEFAULT 'pending';

-- 4. Rename existing signing fields to be invoice-specific
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'signed_pdf_url'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_signed_pdf_url'
    ) THEN
        ALTER TABLE invoices RENAME COLUMN signed_pdf_url TO invoice_signed_pdf_url;
        RAISE NOTICE 'Renamed signed_pdf_url to invoice_signed_pdf_url';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'docusign_envelope_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_docusign_envelope_id'
    ) THEN
        ALTER TABLE invoices RENAME COLUMN docusign_envelope_id TO invoice_docusign_envelope_id;
        RAISE NOTICE 'Renamed docusign_envelope_id to invoice_docusign_envelope_id';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'signing_status'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'invoice_signing_status'
    ) THEN
        ALTER TABLE invoices RENAME COLUMN signing_status TO invoice_signing_status;
        RAISE NOTICE 'Renamed signing_status to invoice_signing_status';
    END IF;
END $$;

-- 5. Verify the structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'invoices'
AND column_name IN (
    'reservation_pdf_url',
    'reservation_signed_pdf_url',
    'reservation_docusign_envelope_id',
    'reservation_signing_status',
    'invoice_pdf_url',
    'invoice_signed_pdf_url',
    'invoice_docusign_envelope_id',
    'invoice_signing_status'
)
ORDER BY column_name;

-- =====================================================
-- RESULT: invoices table now has:
-- 
-- RESERVATION DOCUMENT:
-- - reservation_pdf_url
-- - reservation_signed_pdf_url
-- - reservation_docusign_envelope_id
-- - reservation_signing_status
--
-- INVOICE DOCUMENT:
-- - invoice_pdf_url
-- - invoice_signed_pdf_url
-- - invoice_docusign_envelope_id
-- - invoice_signing_status
-- =====================================================

-- 6. Add total_amount column if it doesn't exist (for manual management)
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS subtotal NUMERIC DEFAULT 0;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;

-- Check if total_amount needs to be added (if it's not a generated column)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN total_amount NUMERIC DEFAULT 0;
        RAISE NOTICE 'Added total_amount column';
    END IF;
END $$;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS balance_due NUMERIC DEFAULT 0;

