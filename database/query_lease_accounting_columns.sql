-- Query all columns in the lease_accounting table
-- This will show column names, data types, nullability, and defaults

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'lease_accounting' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- Also show any constraints on the table
SELECT 
    'Constraints:' as info,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'lease_accounting' 
    AND table_schema = 'public';

-- Show any indexes on the table
SELECT 
    'Indexes:' as info,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'lease_accounting' 
    AND schemaname = 'public';

-- Check if the table exists and show basic info
SELECT 
    'Table Info:' as info,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name = 'lease_accounting' 
    AND table_schema = 'public';
