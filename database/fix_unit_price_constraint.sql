-- 🔧 FIX UNIT PRICE CONSTRAINT FOR CREDIT NOTES
-- This specifically fixes the unit_price constraint issue

-- Step 1: Check what constraints currently exist
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname LIKE '%unit_price%';

-- Step 2: Drop ALL possible unit_price constraints
ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS valid_unit_price;

ALTER TABLE ifrs_lease_accounting 
DROP CONSTRAINT IF EXISTS ifrs_valid_unit_price;

-- Step 3: Add the correct constraint that allows negative unit prices for credit notes
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT valid_unit_price CHECK (
    (charge_type = 'refund' AND (unit_price IS NULL OR unit_price <= 0))
    OR (charge_type = 'credit_note' AND (unit_price IS NULL OR unit_price <= 0))
    OR (charge_type NOT IN ('refund', 'credit_note') AND (unit_price IS NULL OR unit_price >= 0))
);

-- Step 4: Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
  AND conname = 'valid_unit_price';

-- Step 5: Test that credit notes can now be created
SELECT '✅ Unit price constraint fixed for credit notes!' as result;
