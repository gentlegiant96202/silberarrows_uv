-- Add QR code support to business_cards table
ALTER TABLE business_cards ADD COLUMN qr_generated_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE business_cards ADD COLUMN slug_locked BOOLEAN DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_business_cards_qr_generated ON business_cards(qr_generated_at);
CREATE INDEX IF NOT EXISTS idx_business_cards_slug_locked ON business_cards(slug_locked);

-- Comment explaining the QR system
COMMENT ON COLUMN business_cards.qr_generated_at IS 'Timestamp when QR code was first generated - locks the slug permanently';
COMMENT ON COLUMN business_cards.slug_locked IS 'Whether the slug is locked due to QR code generation - prevents URL changes';

-- Verify the changes
SELECT id, slug, name, qr_generated_at, slug_locked FROM business_cards LIMIT 5;
