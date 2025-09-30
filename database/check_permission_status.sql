-- Check current status of get_user_module_permissions function
-- This will help diagnose what's wrong

-- 1. Check if function exists and what signature it has
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type,
    p.prosrc as source_code
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_module_permissions'
AND n.nspname = 'public';

-- 2. Check if modules table exists and has marketing
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'modules')
        THEN '✅ modules table exists'
        ELSE '❌ modules table missing'
    END as modules_status;

-- 3. Check if role_permissions table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'role_permissions')
        THEN '✅ role_permissions table exists'
        ELSE '❌ role_permissions table missing'
    END as role_permissions_status;

-- 4. Check if user_roles table exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_roles')
        THEN '✅ user_roles table exists'
        ELSE '❌ user_roles table missing'
    END as user_roles_status;

-- 5. Test the function if it exists
DO $$
DECLARE
    test_result RECORD;
    function_exists BOOLEAN;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'get_user_module_permissions'
        AND n.nspname = 'public'
    ) INTO function_exists;
    
    IF function_exists THEN
        RAISE NOTICE 'Function exists, testing...';
        
        -- Try to call the function
        BEGIN
            FOR test_result IN 
                SELECT * FROM get_user_module_permissions('00000000-0000-0000-0000-000000000000'::UUID, 'marketing')
            LOOP
                RAISE NOTICE 'Test result: can_view=%, can_create=%, can_edit=%, can_delete=%', 
                    test_result.can_view, test_result.can_create, test_result.can_edit, test_result.can_delete;
            END LOOP;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Function test failed: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Function does not exist!';
    END IF;
END $$;

SELECT 'Diagnostic complete - check the output above' as status;
