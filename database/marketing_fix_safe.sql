-- Safe marketing fix that doesn't touch the global trigger function
-- This only fixes the permission function without breaking other departments

-- 1. Drop and recreate the get_user_module_permissions function with correct signature
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT);

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
    
    -- Return permissions
    RETURN QUERY
    SELECT 
        COALESCE(rp.can_view, false),
        COALESCE(rp.can_create, false),
        COALESCE(rp.can_edit, false),
        COALESCE(rp.can_delete, false)
    FROM role_permissions rp
    WHERE rp.role = user_role AND rp.module_id = module_id;
    
    -- If no permissions found, return all false
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, false, false, false;
    END IF;
END;
$$;

-- 2. Grant proper permissions
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO anon;

-- 3. Ensure marketing permissions exist (using direct UPDATE to avoid triggers)
DO $$
DECLARE
    marketing_module_id UUID;
BEGIN
    SELECT id INTO marketing_module_id FROM modules WHERE name = 'marketing';
    
    IF marketing_module_id IS NOT NULL THEN
        -- Use direct UPDATE instead of INSERT...ON CONFLICT to avoid trigger issues
        UPDATE role_permissions 
        SET can_view = true, can_create = true, can_edit = true, can_delete = true
        WHERE role = 'marketing' AND module_id = marketing_module_id;
        
        -- If no row was updated, insert it
        IF NOT FOUND THEN
            INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
            VALUES ('marketing', marketing_module_id, true, true, true, true);
        END IF;
        
        -- Same for admin role
        UPDATE role_permissions 
        SET can_view = true, can_create = true, can_edit = true, can_delete = true
        WHERE role = 'admin' AND module_id = marketing_module_id;
        
        IF NOT FOUND THEN
            INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
            VALUES ('admin', marketing_module_id, true, true, true, true);
        END IF;
            
        RAISE NOTICE '✅ Marketing permissions restored safely';
    END IF;
END $$;

SELECT '🎉 Marketing kanban should work now (without breaking other departments)!' as result;
