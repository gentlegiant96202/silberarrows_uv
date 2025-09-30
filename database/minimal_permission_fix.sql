-- Minimal fix for get_user_module_permissions function
-- This addresses the 400 errors without touching anything else

-- Check what the current function signature looks like
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_user_module_permissions'
AND n.nspname = 'public';

-- Drop all versions of the function
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN);
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT TEXT, OUT TEXT);

-- Create the function with the exact signature the API expects
CREATE OR REPLACE FUNCTION get_user_module_permissions(
    check_user_id UUID,
    module_name TEXT
)
RETURNS TABLE(
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT;
    module_id UUID;
BEGIN
    -- Get user's role
    SELECT role INTO user_role FROM user_roles WHERE user_id = check_user_id;
    IF user_role IS NULL THEN
        user_role := 'sales'; -- Default role
    END IF;
    
    -- Get module ID
    SELECT id INTO module_id FROM modules WHERE name = module_name;
    IF module_id IS NULL THEN
        -- Return no permissions if module doesn't exist
        RETURN QUERY SELECT false, false, false, false;
        RETURN;
    END IF;
    
    -- Return permissions from role_permissions table
    RETURN QUERY
    SELECT 
        COALESCE(rp.can_view, false)::BOOLEAN,
        COALESCE(rp.can_create, false)::BOOLEAN,
        COALESCE(rp.can_edit, false)::BOOLEAN,
        COALESCE(rp.can_delete, false)::BOOLEAN
    FROM role_permissions rp
    WHERE rp.role = user_role AND rp.module_id = module_id;
    
    -- If no permissions found, return all false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, false::BOOLEAN;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO anon;

-- Test the function
SELECT 'Testing function...' as status;

-- Verify the function works by testing it
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- Test with a sample user (replace with actual user ID if needed)
    FOR test_result IN 
        SELECT * FROM get_user_module_permissions('00000000-0000-0000-0000-000000000000'::UUID, 'marketing')
    LOOP
        RAISE NOTICE 'Function test result: can_view=%, can_create=%, can_edit=%, can_delete=%', 
            test_result.can_view, test_result.can_create, test_result.can_edit, test_result.can_delete;
    END LOOP;
END $$;

SELECT '✅ Permission function recreated - 400 errors should be fixed!' as result;
