-- Diagnostic script to identify why marketing kanban cards aren't moving
-- Run this to see what's causing the 500 error

-- 1. Check if design_tasks table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_tasks') 
        THEN '✅ design_tasks table exists'
        ELSE '❌ design_tasks table does NOT exist'
    END as table_status;

-- 2. Check table structure and missing columns
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    CASE 
        WHEN column_name = 'requested_by' THEN '← API expects this field'
        WHEN column_name = 'task_type' THEN '← API expects this field'
        WHEN column_name = 'media_files' THEN '← API expects this field'
        WHEN column_name = 'created_by' THEN '← API expects this field'
        WHEN column_name = 'acknowledged_at' THEN '← API expects this field'
        ELSE ''
    END as notes
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position;

-- 3. Check for missing columns that API expects
WITH expected_columns AS (
    SELECT unnest(ARRAY['id', 'title', 'description', 'status', 'requested_by', 'due_date', 'task_type', 'media_files', 'created_at', 'updated_at', 'created_by', 'acknowledged_at']) as column_name
),
existing_columns AS (
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'design_tasks'
)
SELECT 
    ec.column_name as missing_column,
    '❌ Missing - API will fail' as status
FROM expected_columns ec
LEFT JOIN existing_columns ex ON ec.column_name = ex.column_name
WHERE ex.column_name IS NULL;

-- 4. Check if get_user_module_permissions function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_user_module_permissions'
        ) 
        THEN '✅ get_user_module_permissions function exists'
        ELSE '❌ get_user_module_permissions function does NOT exist'
    END as function_status;

-- 5. Check if marketing module exists in modules table
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules') 
        THEN (
            CASE 
                WHEN EXISTS (SELECT 1 FROM modules WHERE name = 'marketing')
                THEN '✅ marketing module exists in modules table'
                ELSE '❌ marketing module does NOT exist in modules table'
            END
        )
        ELSE '❌ modules table does NOT exist'
    END as marketing_module_status;

-- 6. Check current data in design_tasks (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'design_tasks') THEN
        RAISE NOTICE 'Current design_tasks count: %', (SELECT COUNT(*) FROM design_tasks);
        RAISE NOTICE 'Status distribution:';
        
        -- This will only work if status column exists
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'design_tasks' AND column_name = 'status') THEN
            FOR rec IN SELECT status, COUNT(*) as count FROM design_tasks GROUP BY status LOOP
                RAISE NOTICE '  - %: %', rec.status, rec.count;
            END LOOP;
        END IF;
    END IF;
END $$;

-- 7. Summary of issues
SELECT '🔍 DIAGNOSIS COMPLETE - Check the output above for missing components' as summary;
