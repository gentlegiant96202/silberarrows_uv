-- =====================================================
-- UV LEDGER - FIX DUPLICATE REVERSAL ENTRIES
-- =====================================================
-- Run this if you already ran the ledger migration
-- and have duplicate invoice_reversal entries
-- =====================================================

-- 1. Remove the invoice_reversal trigger (if exists)
DROP TRIGGER IF EXISTS trg_ledger_invoice_reversed ON uv_invoices;
DROP FUNCTION IF EXISTS ledger_on_invoice_reversed();

-- 2. Delete all invoice_reversal entries
-- (Credit Notes already handle the reversal accounting)
DELETE FROM uv_ledger_entries 
WHERE entry_type = 'invoice_reversal';

-- 3. Update the CHECK constraint to exclude invoice_reversal
-- Note: This requires recreating the constraint
ALTER TABLE uv_ledger_entries 
DROP CONSTRAINT IF EXISTS uv_ledger_entries_entry_type_check;

ALTER TABLE uv_ledger_entries 
ADD CONSTRAINT uv_ledger_entries_entry_type_check 
CHECK (entry_type IN ('invoice', 'payment', 'credit_note', 'refund'));

-- 4. Verify
SELECT 'Removed invoice_reversal entries and trigger' AS status;
SELECT entry_type, COUNT(*) as count 
FROM uv_ledger_entries 
GROUP BY entry_type 
ORDER BY entry_type;

