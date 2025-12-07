-- =====================================================
-- FIX: INVOICE BALANCE - STANDARD ACCOUNTING
-- =====================================================
-- Problem: Refunds were included in invoice balance_due
-- Fix: Refunds are CUSTOMER-level, not invoice-level
-- 
-- Standard Accounting:
--   Invoice balance = total_amount - credit_note_total - paid_amount
--   (Refunds are NOT part of invoice balance)
--
-- Refunds appear in:
--   ✅ SOA (Statement of Account) - customer level
--   ❌ Invoice balance_due - NOT here
-- =====================================================

-- 1. Drop the incorrect balance_due column
ALTER TABLE uv_invoices DROP COLUMN IF EXISTS balance_due;

-- 2. Recreate with CORRECT formula (no refunds)
ALTER TABLE uv_invoices 
ADD COLUMN balance_due NUMERIC(12,2) GENERATED ALWAYS AS (
    total_amount - credit_note_total - paid_amount
) STORED;

-- 3. Keep refund_total column for tracking, but it won't affect balance
-- (Column already exists from previous migration, no action needed)

-- 4. Update comment
COMMENT ON COLUMN uv_invoices.balance_due IS 'Auto-calculated: total_amount - credit_note_total - paid_amount (refunds are customer-level, not invoice-level)';
COMMENT ON COLUMN uv_invoices.refund_total IS 'Sum of refunds linked to this invoice (for reference only, does NOT affect balance_due)';

-- 5. Verify
SELECT 'Invoice balance formula corrected (refunds removed)' AS status;

-- Show updated invoices
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

