-- Emergency fix for credit note constraint
-- This completely removes the constraint temporarily so credit notes can be created

-- Step 1: Remove the problematic constraint entirely
ALTER TABLE ifrs_lease_accounting DROP CONSTRAINT IF EXISTS ifrs_valid_amount;
ALTER TABLE ifrs_lease_accounting DROP CONSTRAINT IF EXISTS valid_amount;

-- Step 2: Check what constraints exist now
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass;

-- Step 3: Add a simpler constraint that just prevents zero amounts
ALTER TABLE ifrs_lease_accounting 
ADD CONSTRAINT simple_amount_check CHECK (total_amount != 0);

-- This allows credit notes to work while we debug the main constraint later
