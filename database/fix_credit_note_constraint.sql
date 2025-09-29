-- Fix credit note constraint issue
-- Step 1: First, fix the existing data that violates the constraint

-- Check what data is causing the issue
SELECT id, charge_type, total_amount, comment 
FROM ifrs_lease_accounting 
WHERE charge_type = 'credit_note' AND total_amount > 0;

-- Fix the positive credit_note amounts (make them negative)
UPDATE ifrs_lease_accounting 
SET total_amount = -ABS(total_amount),
    updated_at = NOW(),
    updated_by = auth.uid()
WHERE charge_type = 'credit_note' 
  AND total_amount > 0;

-- Step 2: Drop the old constraint
ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS ifrs_valid_amount;

-- Step 3: Add the new constraint that allows credit_note with negative amounts
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT ifrs_valid_amount CHECK (
    (charge_type = 'refund' AND total_amount <= 0)
    OR (charge_type = 'credit_note' AND total_amount <= 0) 
    OR (charge_type NOT IN ('refund', 'credit_note') AND total_amount >= 0)
);

-- Step 4: Verify the constraint was added successfully
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname = 'ifrs_valid_amount';
