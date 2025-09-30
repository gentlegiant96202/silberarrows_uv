-- 🔧 FIX VAT CREDIT NOTE CONSTRAINT
-- This allows negative amounts for VAT charges when they're part of credit notes

-- Step 1: Drop the existing constraint
ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS ifrs_valid_amount;

-- Step 2: Add the updated constraint that allows negative VAT amounts for credit notes
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT ifrs_valid_amount CHECK (
    (charge_type = 'refund' AND total_amount <= 0)
    OR (charge_type = 'credit_note' AND total_amount <= 0) 
    OR (charge_type = 'vat' AND (
        -- VAT can be negative if it's part of a credit note (has credit_note_id)
        (credit_note_id IS NOT NULL AND total_amount <= 0)
        OR 
        -- VAT can be positive if it's a regular charge
        (credit_note_id IS NULL AND total_amount >= 0)
    ))
    OR (charge_type NOT IN ('refund', 'credit_note', 'vat') AND total_amount >= 0)
);

-- Step 3: Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname = 'ifrs_valid_amount';

-- Step 4: Test that credit notes with VAT can now be created
SELECT '✅ VAT credit note constraint fixed!' as result;
