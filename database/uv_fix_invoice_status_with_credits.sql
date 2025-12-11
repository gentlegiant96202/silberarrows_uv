-- =====================================================
-- Fix Invoice Status to Account for Credit Notes
-- 
-- Problem: Status only updates based on paid_amount, ignoring credit_note_total
-- Solution: Create trigger that checks (paid_amount + credit_note_total) >= total_amount
-- =====================================================

-- 1. Create the function to update invoice status
CREATE OR REPLACE FUNCTION update_uv_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total_applied NUMERIC(12,2);
BEGIN
    -- Don't change status if invoice is reversed
    IF NEW.status = 'reversed' THEN
        RETURN NEW;
    END IF;
    
    -- Calculate total amount applied (payments + credit notes)
    v_total_applied := COALESCE(NEW.paid_amount, 0) + COALESCE(NEW.credit_note_total, 0);
    
    -- Update status based on total applied vs total amount
    IF v_total_applied >= NEW.total_amount AND NEW.total_amount > 0 THEN
        NEW.status := 'paid';
    ELSIF v_total_applied > 0 AND v_total_applied < NEW.total_amount THEN
        NEW.status := 'partial';
    ELSIF NEW.status NOT IN ('reversed', 'refunded') THEN
        NEW.status := 'pending';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Drop existing trigger if any
DROP TRIGGER IF EXISTS trg_update_uv_invoice_status ON uv_invoices;

-- 3. Create trigger that fires BEFORE UPDATE
CREATE TRIGGER trg_update_uv_invoice_status
    BEFORE UPDATE ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_uv_invoice_status();

-- 4. Add comment
COMMENT ON FUNCTION update_uv_invoice_status() IS 'Auto-updates invoice status based on (paid_amount + credit_note_total) vs total_amount';

-- 5. Fix existing invoices that should be marked as paid
UPDATE uv_invoices
SET status = 'paid',
    updated_at = NOW()
WHERE status != 'reversed'
  AND status != 'paid'
  AND total_amount > 0
  AND (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) >= total_amount;

-- 6. Fix existing invoices that should be marked as partial
UPDATE uv_invoices
SET status = 'partial',
    updated_at = NOW()
WHERE status != 'reversed'
  AND status != 'paid'
  AND status != 'partial'
  AND total_amount > 0
  AND (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) > 0
  AND (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) < total_amount;

-- 7. Verify the fix
SELECT 'Invoice status trigger created successfully' AS status;

-- Show invoices with their status calculation
SELECT 
    invoice_number,
    total_amount,
    paid_amount,
    credit_note_total,
    (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) AS total_applied,
    balance_due,
    status,
    CASE 
        WHEN status = 'reversed' THEN 'OK (reversed)'
        WHEN (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) >= total_amount AND status = 'paid' THEN 'OK'
        WHEN (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) > 0 
             AND (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) < total_amount 
             AND status = 'partial' THEN 'OK'
        WHEN (COALESCE(paid_amount, 0) + COALESCE(credit_note_total, 0)) = 0 AND status = 'pending' THEN 'OK'
        ELSE 'CHECK!'
    END AS validation
FROM uv_invoices
ORDER BY created_at DESC
LIMIT 10;

