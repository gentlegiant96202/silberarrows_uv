-- Add DocuSign integration fields to service contracts and warranty contracts
-- Safe migration that checks for existing columns before adding them

-- 1. Add DocuSign fields to service_contracts table
DO $$
BEGIN
    -- Add docusign_envelope_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'docusign_envelope_id'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN docusign_envelope_id VARCHAR(255);
        RAISE NOTICE 'Added docusign_envelope_id to service_contracts';
    END IF;

    -- Add signing_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'signing_status'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN signing_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added signing_status to service_contracts';
    END IF;

    -- Add signed_pdf_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'signed_pdf_url'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN signed_pdf_url TEXT;
        RAISE NOTICE 'Added signed_pdf_url to service_contracts';
    END IF;

    -- Add sent_for_signing_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'sent_for_signing_at'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN sent_for_signing_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added sent_for_signing_at to service_contracts';
    END IF;

    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_contracts' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE service_contracts ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at to service_contracts';
    END IF;
END
$$;

-- 2. Add DocuSign fields to warranty_contracts table
DO $$
BEGIN
    -- Add docusign_envelope_id if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'docusign_envelope_id'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN docusign_envelope_id VARCHAR(255);
        RAISE NOTICE 'Added docusign_envelope_id to warranty_contracts';
    END IF;

    -- Add signing_status if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'signing_status'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN signing_status VARCHAR(50) DEFAULT 'pending';
        RAISE NOTICE 'Added signing_status to warranty_contracts';
    END IF;

    -- Add signed_pdf_url if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'signed_pdf_url'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN signed_pdf_url TEXT;
        RAISE NOTICE 'Added signed_pdf_url to warranty_contracts';
    END IF;

    -- Add sent_for_signing_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'sent_for_signing_at'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN sent_for_signing_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added sent_for_signing_at to warranty_contracts';
    END IF;

    -- Add completed_at if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'warranty_contracts' AND column_name = 'completed_at'
    ) THEN
        ALTER TABLE warranty_contracts ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added completed_at to warranty_contracts';
    END IF;
END
$$;

-- 3. Create indexes for faster DocuSign envelope lookups
CREATE INDEX IF NOT EXISTS idx_service_contracts_docusign_envelope 
ON service_contracts(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warranty_contracts_docusign_envelope 
ON warranty_contracts(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

-- 4. Add comments to document the fields
COMMENT ON COLUMN service_contracts.docusign_envelope_id IS 'DocuSign envelope ID for tracking document signing';
COMMENT ON COLUMN service_contracts.signing_status IS 'Current status of DocuSign signing process';
COMMENT ON COLUMN service_contracts.signed_pdf_url IS 'URL to the final signed PDF document';
COMMENT ON COLUMN service_contracts.sent_for_signing_at IS 'Timestamp when document was sent for signing';
COMMENT ON COLUMN service_contracts.completed_at IS 'Timestamp when signing was completed';

COMMENT ON COLUMN warranty_contracts.docusign_envelope_id IS 'DocuSign envelope ID for tracking document signing';
COMMENT ON COLUMN warranty_contracts.signing_status IS 'Current status of DocuSign signing process';
COMMENT ON COLUMN warranty_contracts.signed_pdf_url IS 'URL to the final signed PDF document';
COMMENT ON COLUMN warranty_contracts.sent_for_signing_at IS 'Timestamp when document was sent for signing';
COMMENT ON COLUMN warranty_contracts.completed_at IS 'Timestamp when signing was completed';

-- 5. Success message
DO $$
BEGIN
    RAISE NOTICE '✅ DocuSign fields migration completed successfully!';
    RAISE NOTICE '📋 Added to both service_contracts and warranty_contracts:';
    RAISE NOTICE '   - docusign_envelope_id (VARCHAR(255))';
    RAISE NOTICE '   - signing_status (VARCHAR(50)) - defaults to pending';
    RAISE NOTICE '   - signed_pdf_url (TEXT)';
    RAISE NOTICE '   - sent_for_signing_at (TIMESTAMP)';
    RAISE NOTICE '   - completed_at (TIMESTAMP)';
    RAISE NOTICE '🔍 Indexes created for faster envelope lookups';
END
$$;
