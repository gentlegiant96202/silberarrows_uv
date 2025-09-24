-- =====================================================
-- DEBUG LEASING INVENTORY TABLE
-- =====================================================
-- Check if table exists and what columns it has

-- 1. Check if leasing_inventory table exists
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_name = 'leasing_inventory';

-- 2. Check all columns in leasing_inventory table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
ORDER BY ordinal_position;

-- 3. Check if JSON columns exist
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_name = 'leasing_inventory' 
AND data_type = 'jsonb';

-- 4. Check ENUMs related to leasing
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%leasing%' OR t.typname LIKE '%vehicle%'
ORDER BY t.typname, e.enumsortorder;

-- 5. Check RLS policies on leasing_inventory
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- 6. Check if table has any data
SELECT COUNT(*) as row_count FROM leasing_inventory;

-- 7. Show sample of first few rows if any exist
SELECT * FROM leasing_inventory LIMIT 3;
