-- =====================================================
-- UV SALES ACCOUNTING - GAPLESS NUMBERING MIGRATION
-- =====================================================
-- Run this AFTER Step 1, 2, 3 to enable gapless numbering
-- for all document types
-- =====================================================

-- 1. Create counter table if not exists
CREATE TABLE IF NOT EXISTS uv_document_counters (
    document_type TEXT PRIMARY KEY,
    last_number INTEGER NOT NULL DEFAULT 1000,
    prefix TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add RLS
ALTER TABLE uv_document_counters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view counters" ON uv_document_counters;
CREATE POLICY "Users can view counters" ON uv_document_counters
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update counters" ON uv_document_counters;
CREATE POLICY "Users can update counters" ON uv_document_counters
    FOR UPDATE USING (auth.uid() IS NOT NULL);

-- 3. Initialize counters for all document types
-- Check existing data and set counter to max existing number

-- Sales Orders counter
INSERT INTO uv_document_counters (document_type, last_number, prefix)
SELECT 
    'sales_order',
    COALESCE(
        (SELECT MAX(CAST(REPLACE(order_number, 'UV-SO-', '') AS INTEGER)) FROM uv_sales_orders),
        1000
    ),
    'UV-SO-'
ON CONFLICT (document_type) 
DO UPDATE SET 
    last_number = GREATEST(
        uv_document_counters.last_number,
        COALESCE(
            (SELECT MAX(CAST(REPLACE(order_number, 'UV-SO-', '') AS INTEGER)) FROM uv_sales_orders),
            1000
        )
    );

-- Invoice counter
INSERT INTO uv_document_counters (document_type, last_number, prefix)
SELECT 
    'invoice',
    COALESCE(
        (SELECT MAX(CAST(REPLACE(invoice_number, 'UV-INV-', '') AS INTEGER)) FROM uv_invoices),
        1000
    ),
    'UV-INV-'
ON CONFLICT (document_type) 
DO UPDATE SET 
    last_number = GREATEST(
        uv_document_counters.last_number,
        COALESCE(
            (SELECT MAX(CAST(REPLACE(invoice_number, 'UV-INV-', '') AS INTEGER)) FROM uv_invoices),
            1000
        )
    );

-- Payment counter (for Step 4)
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('payment', 1000, 'UV-PMT-')
ON CONFLICT (document_type) DO NOTHING;

-- Credit Note counter (for Step 6)
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('credit_note', 1000, 'UV-CN-')
ON CONFLICT (document_type) DO NOTHING;

-- Refund counter (for Step 6)
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('refund', 1000, 'UV-REF-')
ON CONFLICT (document_type) DO NOTHING;

-- 4. Create/Replace the gapless number generator function
CREATE OR REPLACE FUNCTION get_next_document_number(p_document_type TEXT)
RETURNS TEXT AS $$
DECLARE
    v_next_number INTEGER;
    v_prefix TEXT;
BEGIN
    -- Lock the row and increment in one atomic operation
    -- This prevents gaps even with concurrent transactions
    UPDATE uv_document_counters
    SET last_number = last_number + 1,
        updated_at = NOW()
    WHERE document_type = p_document_type
    RETURNING last_number, prefix INTO v_next_number, v_prefix;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Document type "%" not found in counters table', p_document_type;
    END IF;
    
    RETURN v_prefix || v_next_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Update Sales Order number generator to use gapless counter
CREATE OR REPLACE FUNCTION generate_uv_sales_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL THEN
        NEW.order_number := get_next_document_number('sales_order');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Update Invoice number generator to use gapless counter
CREATE OR REPLACE FUNCTION generate_uv_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := get_next_document_number('invoice');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Verify setup
SELECT '✅ Gapless numbering migration complete!' AS status;

SELECT 
    document_type,
    prefix,
    last_number AS current_last_number,
    prefix || (last_number + 1) AS next_number_will_be
FROM uv_document_counters
ORDER BY document_type;

