-- Add DocuSign tracking columns to vehicle_reservations table
-- This enables signature workflow for reservation and invoice documents

-- Add DocuSign tracking columns
ALTER TABLE vehicle_reservations 
ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
ADD COLUMN IF NOT EXISTS signing_status TEXT DEFAULT 'pending' CHECK (signing_status IN ('pending', 'sent', 'delivered', 'completed', 'declined', 'voided')),
ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS sent_for_signing_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Add comments for documentation
COMMENT ON COLUMN vehicle_reservations.docusign_envelope_id IS 'DocuSign envelope ID for tracking document signing';
COMMENT ON COLUMN vehicle_reservations.signing_status IS 'Current status of DocuSign signing process';
COMMENT ON COLUMN vehicle_reservations.signed_pdf_url IS 'URL to the final signed PDF document';
COMMENT ON COLUMN vehicle_reservations.sent_for_signing_at IS 'Timestamp when document was sent for signing';
COMMENT ON COLUMN vehicle_reservations.completed_at IS 'Timestamp when signing was completed';

-- Create index for efficient DocuSign queries
CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_docusign_envelope 
ON vehicle_reservations(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_vehicle_reservations_signing_status 
ON vehicle_reservations(signing_status) 
WHERE signing_status != 'pending';

-- Log the changes
DO $$
BEGIN
    RAISE NOTICE 'Successfully added DocuSign tracking columns to vehicle_reservations table';
    RAISE NOTICE 'Columns added: docusign_envelope_id, signing_status, signed_pdf_url, sent_for_signing_at, completed_at';
    RAISE NOTICE 'Indexes created for efficient DocuSign tracking';
END $$;
