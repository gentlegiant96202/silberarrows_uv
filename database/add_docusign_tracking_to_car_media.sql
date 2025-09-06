-- Add DocuSign tracking columns to car_media table
-- These columns will track the signing status of consignment agreements

ALTER TABLE car_media 
ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
ADD COLUMN IF NOT EXISTS signing_status TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sent_for_signing_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN IF NOT EXISTS signed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add check constraint for signing status (safe method)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_signing_status' 
        AND table_name = 'car_media'
    ) THEN
        ALTER TABLE car_media 
        ADD CONSTRAINT check_signing_status 
        CHECK (signing_status IN ('sent', 'delivered', 'signed', 'completed', 'declined', 'voided', NULL));
    END IF;
END $$;

-- Add comments to document the purpose of these fields
COMMENT ON COLUMN car_media.docusign_envelope_id IS 'DocuSign envelope ID for tracking document signing';
COMMENT ON COLUMN car_media.signing_status IS 'Current status of the document signing process';
COMMENT ON COLUMN car_media.sent_for_signing_at IS 'When the document was sent to customer for signing';
COMMENT ON COLUMN car_media.signed_at IS 'When the customer completed signing the document';

-- Create index for faster queries on envelope ID
CREATE INDEX IF NOT EXISTS idx_car_media_docusign_envelope 
ON car_media(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;
