-- =====================================================
-- FIX: INVOICE BALANCE TO INCLUDE REFUNDS
-- =====================================================
-- Problem: Invoice balance_due doesn't account for refunds
-- Solution: Add refund_total column, update balance_due formula
-- 
-- Accounting Logic:
--   balance_due = total_amount - credit_note_total - paid_amount + refund_total
--
-- Why ADD refund_total?
--   - Customer pays 150,000 for 155,000 invoice → balance 5,000
--   - We refund 5,000 (maybe wrong payment) → balance goes to 10,000
--   - OR: Customer overpays, gets credit, refund returns their credit to 0
-- =====================================================

-- 1. Add refund_total column to invoices
ALTER TABLE uv_invoices 
ADD COLUMN IF NOT EXISTS refund_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Drop and recreate balance_due with refunds included
ALTER TABLE uv_invoices DROP COLUMN IF EXISTS balance_due;

ALTER TABLE uv_invoices 
ADD COLUMN balance_due NUMERIC(12,2) GENERATED ALWAYS AS (
    total_amount - credit_note_total - paid_amount + refund_total
) STORED;

-- 3. Populate refund_total from existing refunds
UPDATE uv_invoices inv
SET refund_total = COALESCE((
    SELECT SUM(amount) 
    FROM uv_adjustments adj 
    WHERE adj.invoice_id = inv.id 
    AND adj.adjustment_type = 'refund'
), 0);

-- 4. Create trigger function for refunds (apply)
CREATE OR REPLACE FUNCTION apply_refund_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_type = 'refund' AND NEW.invoice_id IS NOT NULL THEN
        -- Add to refund_total
        UPDATE uv_invoices
        SET refund_total = refund_total + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger function for refunds (reverse on delete)
CREATE OR REPLACE FUNCTION reverse_refund_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.adjustment_type = 'refund' AND OLD.invoice_id IS NOT NULL THEN
        UPDATE uv_invoices
        SET refund_total = refund_total - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 6. Create triggers
DROP TRIGGER IF EXISTS trg_apply_refund ON uv_adjustments;
CREATE TRIGGER trg_apply_refund
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_type = 'refund')
    EXECUTE FUNCTION apply_refund_to_invoice();

DROP TRIGGER IF EXISTS trg_reverse_refund ON uv_adjustments;
CREATE TRIGGER trg_reverse_refund
    BEFORE DELETE ON uv_adjustments
    FOR EACH ROW
    WHEN (OLD.adjustment_type = 'refund')
    EXECUTE FUNCTION reverse_refund_on_delete();

-- 7. Add comments
COMMENT ON COLUMN uv_invoices.refund_total IS 'Sum of all refunds applied to this invoice';
COMMENT ON COLUMN uv_invoices.balance_due IS 'Auto-calculated: total_amount - credit_note_total - paid_amount + refund_total';

-- 8. Verify
SELECT 'Refund tracking added to invoices successfully' AS status;

-- Show updated invoice structure
SELECT 
    invoice_number,
    total_amount,
    credit_note_total,
    paid_amount,
    refund_total,
    balance_due,
    status
FROM uv_invoices
ORDER BY created_at DESC
LIMIT 5;

