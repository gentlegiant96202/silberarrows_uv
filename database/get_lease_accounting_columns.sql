-- Get all columns in the lease_accounting table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'lease_accounting' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
