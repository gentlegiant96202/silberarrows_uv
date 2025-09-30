-- Correct fix for get_user_module_permissions function
-- Based on deep dive analysis of API expectations and existing implementations

-- Drop all possible versions of the function
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN);
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT BOOLEAN, OUT TEXT, OUT TEXT);

-- Create the function with the exact signature the API expects
-- API expects: permissions?.[0] with can_view, can_create, can_edit, can_delete fields
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
    user_role_var TEXT;
    module_id_var UUID;
BEGIN
    -- Get user's role (using _var suffix to avoid naming conflicts)
    SELECT role INTO user_role_var FROM user_roles WHERE user_id = check_user_id;
    IF user_role_var IS NULL THEN
        user_role_var := 'sales'; -- Default role
    END IF;
    
    -- Get module ID (using _var suffix to avoid naming conflicts)
    SELECT id INTO module_id_var FROM modules WHERE name = module_name;
    IF module_id_var IS NULL THEN
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
    WHERE rp.role = user_role_var AND rp.module_id = module_id_var;
    
    -- If no permissions found, return all false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false::BOOLEAN, false::BOOLEAN, false::BOOLEAN, false::BOOLEAN;
    END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO anon;

-- Test the function with a real admin user if possible
SELECT 'Function recreated successfully!' as status;
