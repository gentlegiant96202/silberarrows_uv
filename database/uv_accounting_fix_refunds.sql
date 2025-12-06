-- =====================================================
-- FIX: REFUNDS - Should Reduce Invoice Paid Amount
-- =====================================================
-- Refunds are the opposite of payments
-- They should reduce paid_amount on the invoice
-- =====================================================

-- 1. Create trigger function to apply refund to invoice
CREATE OR REPLACE FUNCTION apply_refund_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_type = 'refund' AND NEW.invoice_id IS NOT NULL THEN
        -- Reduce the paid_amount on the invoice
        UPDATE uv_invoices
        SET paid_amount = GREATEST(0, paid_amount - NEW.amount),
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger for refund application
DROP TRIGGER IF EXISTS trg_apply_refund ON uv_adjustments;
CREATE TRIGGER trg_apply_refund
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    WHEN (NEW.adjustment_type = 'refund' AND NEW.invoice_id IS NOT NULL)
    EXECUTE FUNCTION apply_refund_to_invoice();

-- 3. Create function to reverse refund effect if deleted
CREATE OR REPLACE FUNCTION reverse_refund_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.adjustment_type = 'refund' AND OLD.invoice_id IS NOT NULL THEN
        UPDATE uv_invoices
        SET paid_amount = paid_amount + OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Create trigger for refund deletion
DROP TRIGGER IF EXISTS trg_reverse_refund ON uv_adjustments;
CREATE TRIGGER trg_reverse_refund
    BEFORE DELETE ON uv_adjustments
    FOR EACH ROW
    WHEN (OLD.adjustment_type = 'refund' AND OLD.invoice_id IS NOT NULL)
    EXECUTE FUNCTION reverse_refund_on_delete();

-- 5. Fix any existing refunds that should have affected invoices
-- (If you already created refunds without invoice_id, you may need to manually fix them)

-- 6. Add comment
COMMENT ON COLUMN uv_adjustments.invoice_id IS 'For credit notes: reduces invoice total. For refunds: reduces paid_amount.';

-- 7. Verify
SELECT 'Refund fix applied successfully' AS status;

