-- Add DocuSign integration fields to service contracts and warranty contracts
-- These fields track the DocuSign envelope status and signed document URLs

-- 1. Add DocuSign fields to service_contracts table
ALTER TABLE service_contracts 
ADD COLUMN docusign_envelope_id VARCHAR(255),
ADD COLUMN signing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN signed_pdf_url TEXT,
ADD COLUMN sent_for_signing_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- 2. Add DocuSign fields to warranty_contracts table  
ALTER TABLE warranty_contracts 
ADD COLUMN docusign_envelope_id VARCHAR(255),
ADD COLUMN signing_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN signed_pdf_url TEXT,
ADD COLUMN sent_for_signing_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE;

-- 3. Create index for faster DocuSign envelope lookups
CREATE INDEX IF NOT EXISTS idx_service_contracts_docusign_envelope 
ON service_contracts(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_warranty_contracts_docusign_envelope 
ON warranty_contracts(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

-- 4. Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name IN ('service_contracts', 'warranty_contracts')
    AND column_name IN ('docusign_envelope_id', 'signing_status', 'signed_pdf_url', 'sent_for_signing_at', 'completed_at')
ORDER BY table_name, column_name;

-- 5. Show sample data structure
SELECT 
    'service_contracts' as table_name,
    reference_no,
    owner_name,
    workflow_status,
    signing_status,
    docusign_envelope_id,
    created_at
FROM service_contracts 
ORDER BY created_at DESC 
LIMIT 3;

-- SUCCESS MESSAGE
DO $$
BEGIN
    RAISE NOTICE '✅ Successfully added DocuSign fields to both tables:';
    RAISE NOTICE '   - docusign_envelope_id (VARCHAR(255)) - Tracks DocuSign envelope';
    RAISE NOTICE '   - signing_status (VARCHAR(50)) - pending/sent/delivered/company_signed/completed';
    RAISE NOTICE '   - signed_pdf_url (TEXT) - URL of the signed document';
    RAISE NOTICE '   - sent_for_signing_at (TIMESTAMP) - When sent to DocuSign';
    RAISE NOTICE '   - completed_at (TIMESTAMP) - When signing completed';
    RAISE NOTICE '';
    RAISE NOTICE '📋 DocuSign Integration Ready:';
    RAISE NOTICE '   - Same fields as vehicle_reservations';
    RAISE NOTICE '   - Indexed for fast envelope lookups';
    RAISE NOTICE '   - Compatible with existing DocuSign API';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps: Create DocuSign API endpoint for service contracts';
END
$$;
