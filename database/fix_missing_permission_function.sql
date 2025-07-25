-- Fix Missing Permission Function - Run in Supabase Dashboard
-- This will fix the infinite loading in module selection

-- Step 1: Create the missing RPC function
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT);

CREATE OR REPLACE FUNCTION get_user_module_permissions(
    check_user_id UUID,
    module_name TEXT
)
RETURNS TABLE(
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    role TEXT,
    module_display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete,
        ur.role,
        m.display_name as module_display_name
    FROM user_roles ur
    INNER JOIN role_permissions rp ON ur.role = rp.role
    INNER JOIN modules m ON rp.module_id = m.id
    WHERE ur.user_id = check_user_id 
    AND m.name = module_name;
END;
$$;

-- Step 2: Test the function (replace with your actual user ID)
-- SELECT * FROM get_user_module_permissions('your-user-id-here', 'uv_crm');

-- Step 3: Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;

-- Step 4: Confirm success
DO $$
BEGIN
    RAISE NOTICE 'Permission function created successfully! Module selection should now work.';
END $$; 