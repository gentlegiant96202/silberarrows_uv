-- 🔍 CHECK ALL CONSTRAINTS ON ifrs_lease_accounting TABLE
-- This will show us all existing constraints to identify any remaining issues

SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'ifrs_lease_accounting'::regclass 
ORDER BY conname;
