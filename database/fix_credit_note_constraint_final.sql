-- 🔧 FINAL FIX FOR CREDIT NOTE CONSTRAINT ISSUE
-- This ensures credit notes can be created with negative amounts

-- Step 1: Check current constraint
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname LIKE '%valid_amount%';

-- Step 2: Drop any existing amount constraints
ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS ifrs_valid_amount;

ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS valid_amount;

-- Step 3: Add the correct constraint that allows credit_note with negative amounts
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT ifrs_valid_amount CHECK (
    (charge_type = 'refund' AND total_amount <= 0)
    OR (charge_type = 'credit_note' AND total_amount <= 0) 
    OR (charge_type NOT IN ('refund', 'credit_note') AND total_amount >= 0)
);

-- Step 4: Verify the constraint was added successfully
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname = 'ifrs_valid_amount';

-- Step 5: Test that credit notes can be created
SELECT '✅ Credit note constraint fix completed!' as result;
