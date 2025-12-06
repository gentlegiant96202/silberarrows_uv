-- =====================================================
-- FIX: CREDIT NOTES - Proper Balance Calculation
-- =====================================================
-- Credit Notes should reduce invoice balance via separate field,
-- NOT by faking a payment
-- =====================================================

-- 1. Add credit_note_total column to invoices
ALTER TABLE uv_invoices 
ADD COLUMN IF NOT EXISTS credit_note_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- 2. Drop the old balance_due generated column and recreate with correct formula
ALTER TABLE uv_invoices DROP COLUMN IF EXISTS balance_due;

ALTER TABLE uv_invoices 
ADD COLUMN balance_due NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - credit_note_total - paid_amount) STORED;

-- 3. Fix any existing data - move credit note amounts from paid_amount to credit_note_total
-- First, calculate the credit note totals per invoice
UPDATE uv_invoices inv
SET credit_note_total = COALESCE((
    SELECT SUM(amount) 
    FROM uv_adjustments adj 
    WHERE adj.invoice_id = inv.id 
    AND adj.adjustment_type = 'credit_note'
), 0);

-- 4. Then subtract what was wrongly added to paid_amount
-- (Only if there were credit notes that added to paid_amount)
UPDATE uv_invoices inv
SET paid_amount = paid_amount - credit_note_total
WHERE credit_note_total > 0
AND paid_amount >= credit_note_total;

-- 5. Replace the trigger function to use credit_note_total
CREATE OR REPLACE FUNCTION apply_credit_note_to_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.adjustment_type = 'credit_note' AND NEW.invoice_id IS NOT NULL THEN
        -- Add to credit_note_total (NOT paid_amount)
        UPDATE uv_invoices
        SET credit_note_total = credit_note_total + NEW.amount,
            updated_at = NOW()
        WHERE id = NEW.invoice_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Replace the reverse trigger function
CREATE OR REPLACE FUNCTION reverse_credit_note_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.adjustment_type = 'credit_note' AND OLD.invoice_id IS NOT NULL THEN
        UPDATE uv_invoices
        SET credit_note_total = credit_note_total - OLD.amount,
            updated_at = NOW()
        WHERE id = OLD.invoice_id;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 7. Add comment
COMMENT ON COLUMN uv_invoices.credit_note_total IS 'Sum of all credit notes applied to this invoice';
COMMENT ON COLUMN uv_invoices.balance_due IS 'Auto-calculated: total_amount - credit_note_total - paid_amount';

-- 8. Verify
SELECT 'Credit note fix applied successfully' AS status;

-- Show updated invoice structure
SELECT 
    invoice_number,
    total_amount,
    credit_note_total,
    paid_amount,
    balance_due
FROM uv_invoices
ORDER BY created_at DESC
LIMIT 5;

