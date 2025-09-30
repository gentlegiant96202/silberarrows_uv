-- Simple diagnostic to check permission function status

-- 1. Check if function exists
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE p.proname = 'get_user_module_permissions'
            AND n.nspname = 'public'
        ) 
        THEN '✅ Function EXISTS'
        ELSE '❌ Function MISSING'
    END as function_status;

-- 2. Check function signature if it exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_module_permissions'
AND n.nspname = 'public';

-- 3. Check if required tables exist
SELECT 'modules' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules')
    THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'role_permissions' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions')
    THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 'user_roles' as table_name,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles')
    THEN 'EXISTS' ELSE 'MISSING' END as status;

-- 4. Test function call (this will show error if function is broken)
SELECT 'Testing function call...' as test_status;

-- Try to call the function
SELECT * FROM get_user_module_permissions('00000000-0000-0000-0000-000000000000'::UUID, 'marketing');

