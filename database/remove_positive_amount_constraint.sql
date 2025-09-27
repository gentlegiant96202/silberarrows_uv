-- Remove the constraint that prevents negative amounts
-- This allows refunds/credits to use negative amounts naturally

-- First, check if the constraint exists
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'lease_accounting'::regclass 
    AND conname LIKE '%amount%';

-- Remove the constraint (if it exists)
ALTER TABLE lease_accounting DROP CONSTRAINT IF EXISTS valid_amount;

-- Verify constraint is removed
SELECT 
    'Remaining constraints on lease_accounting:' as info,
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'lease_accounting'::regclass;
