-- Add DocuSign tracking columns to uv_sales_orders table
-- This enables PDF generation and e-signing for Sales Orders

-- Add DocuSign tracking columns
ALTER TABLE uv_sales_orders
ADD COLUMN IF NOT EXISTS signed_pdf_url TEXT,
ADD COLUMN IF NOT EXISTS docusign_envelope_id TEXT,
ADD COLUMN IF NOT EXISTS signing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sent_for_signing_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Add constraint for signing_status values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'uv_sales_orders_signing_status_check'
    ) THEN
        ALTER TABLE uv_sales_orders 
        ADD CONSTRAINT uv_sales_orders_signing_status_check 
        CHECK (signing_status IN ('pending', 'sent', 'delivered', 'company_signed', 'completed', 'declined', 'voided'));
    END IF;
END $$;

-- Add comments
COMMENT ON COLUMN uv_sales_orders.pdf_url IS 'URL to the generated Sales Order PDF document';
COMMENT ON COLUMN uv_sales_orders.signed_pdf_url IS 'URL to the final signed PDF document';
COMMENT ON COLUMN uv_sales_orders.docusign_envelope_id IS 'DocuSign envelope ID for tracking document signing';
COMMENT ON COLUMN uv_sales_orders.signing_status IS 'Current status of DocuSign signing process';
COMMENT ON COLUMN uv_sales_orders.sent_for_signing_at IS 'Timestamp when document was sent for signing';
COMMENT ON COLUMN uv_sales_orders.completed_at IS 'Timestamp when all signatures were completed';

-- Create indexes for efficient DocuSign queries
CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_docusign_envelope 
ON uv_sales_orders(docusign_envelope_id) 
WHERE docusign_envelope_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_uv_sales_orders_signing_status 
ON uv_sales_orders(signing_status) 
WHERE signing_status != 'pending';

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ DocuSign columns added to uv_sales_orders table';
    RAISE NOTICE 'Columns: signed_pdf_url, docusign_envelope_id, signing_status, sent_for_signing_at, completed_at';
END $$;
