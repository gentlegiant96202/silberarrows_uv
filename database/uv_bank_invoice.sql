-- Add bank invoice columns to uv_bank_finance_applications
ALTER TABLE uv_bank_finance_applications
ADD COLUMN IF NOT EXISTS bank_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS bank_invoice_pdf_url TEXT;

-- Add document counter for bank invoices
INSERT INTO uv_document_counters (document_type, prefix, last_number)
VALUES ('bank_invoice', 'UV-BI-', 1000)
ON CONFLICT (document_type) DO NOTHING;

-- Verify
SELECT 'Bank invoice columns added' AS status;

