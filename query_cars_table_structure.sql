-- Query to understand the current structure of the cars table
-- This will show all columns, their data types, nullability, and defaults

SELECT 
    ordinal_position as position,
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'cars' 
ORDER BY ordinal_position;

-- Also show total column count
SELECT COUNT(*) as total_columns 
FROM information_schema.columns 
WHERE table_name = 'cars';

-- Show any existing constraints on the cars table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'cars'
ORDER BY tc.constraint_type, tc.constraint_name;
