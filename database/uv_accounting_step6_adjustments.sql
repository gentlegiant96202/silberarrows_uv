-- =====================================================
-- UV SALES ACCOUNTING - STEP 6: CREDIT NOTES & REFUNDS
-- =====================================================
-- Credit Notes: Reduce invoice balance (discount/adjustment)
-- Refunds: Money returned to customer (cash movement)
-- =====================================================

-- 1. Add counters for credit notes and refunds
INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('credit_note', 1000, 'UV-CN-')
ON CONFLICT (document_type) DO NOTHING;

INSERT INTO uv_document_counters (document_type, last_number, prefix)
VALUES ('refund', 1000, 'UV-REF-')
ON CONFLICT (document_type) DO NOTHING;

-- 2. Create ENUM for adjustment types
DO $$ BEGIN
    CREATE TYPE uv_adjustment_type AS ENUM (
        'credit_note',  -- Reduces invoice balance
        'refund'        -- Money returned to customer
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Create the Adjustments table
CREATE TABLE IF NOT EXISTS uv_adjustments (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    adjustment_number TEXT UNIQUE NOT NULL,  -- UV-CN-1001 or UV-REF-1001
    
    -- Type
    adjustment_type uv_adjustment_type NOT NULL,
    
    -- Links
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES uv_invoices(id) ON DELETE SET NULL,  -- For credit notes
    
    -- Amount (always positive in DB, interpreted based on type)
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    
    -- Reason/Description
    reason TEXT NOT NULL,
    
    -- For refunds: how was it refunded?
    refund_method TEXT,  -- cash, bank_transfer, cheque, etc.
    refund_reference TEXT,  -- Cheque number, transfer ref, etc.
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. Create trigger function to auto-generate adjustment number
CREATE OR REPLACE FUNCTION generate_uv_adjustment_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_number IS NULL THEN
        IF NEW.adjustment_type = 'credit_note' THEN
            NEW.adjustment_number := get_next_document_number('credit_note');
        ELSE
            NEW.adjustment_number := get_next_document_number('refund');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for auto-numbering
DROP TRIGGER IF EXISTS trg_generate_uv_adjustment_number ON uv_adjustments;
CREATE TRIGGER trg_generate_uv_adjustment_number
    BEFORE INSERT ON uv_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION generate_uv_adjustment_number();

-- 6. Create function to update invoice when credit note is applied
CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_type = 'credit_note' AND NEW.invoice_id IS NOT NULL THEN
        -- Reduce the invoice total by the credit note amount
        -- We do this by increasing paid_amount (effectively reducing balance)
        UPDATE uv_invoices
        SET paid_amount = paid_amount + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for credit note application
DROP TRIGGER IF EXISTS trg_apply_credit_note ON uv_adjustments;
CREATE TRIGGER trg_apply_credit_note
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_type = 'credit_note' AND NEW.invoice_id IS NOT NULL)
    EXECUTE FUNCTION apply_credit_note_to_invoice();

-- 8. Create function to reverse credit note effect if deleted
CREATE OR REPLACE FUNCTION reverse_credit_note_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.adjustment_type = 'credit_note' AND OLD.invoice_id IS NOT NULL THEN
        UPDATE uv_invoices
        SET paid_amount = paid_amount - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for credit note deletion
DROP TRIGGER IF EXISTS trg_reverse_credit_note ON uv_adjustments;
CREATE TRIGGER trg_reverse_credit_note
    BEFORE DELETE ON uv_adjustments
    FOR EACH ROW
    WHEN (OLD.adjustment_type = 'credit_note' AND OLD.invoice_id IS NOT NULL)
    EXECUTE FUNCTION reverse_credit_note_on_delete();

-- 10. Create indexes
CREATE INDEX IF NOT EXISTS idx_uv_adjustments_lead_id ON uv_adjustments(lead_id);
CREATE INDEX IF NOT EXISTS idx_uv_adjustments_invoice_id ON uv_adjustments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_uv_adjustments_type ON uv_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_uv_adjustments_created_at ON uv_adjustments(created_at);

-- 11. Enable RLS
ALTER TABLE uv_adjustments ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
DROP POLICY IF EXISTS "Users can view adjustments" ON uv_adjustments;
CREATE POLICY "Users can view adjustments" ON uv_adjustments
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage adjustments" ON uv_adjustments;
CREATE POLICY "Users can manage adjustments" ON uv_adjustments
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 13. Add comments
COMMENT ON TABLE uv_adjustments IS 'Credit Notes and Refunds for UV Sales';
COMMENT ON COLUMN uv_adjustments.adjustment_type IS 'credit_note reduces invoice balance, refund is cash returned';
COMMENT ON COLUMN uv_adjustments.amount IS 'Always positive - interpretation depends on type';

-- 14. Verify creation
SELECT 'uv_adjustments table created successfully' AS status;

-- Show counter state
SELECT 
    document_type, 
    prefix || (last_number + 1) AS next_number_will_be 
FROM uv_document_counters
WHERE document_type IN ('credit_note', 'refund');

