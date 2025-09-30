-- Quick fix for broken marketing kanban (after recent permission system changes)

-- 1. Check if get_user_module_permissions function exists and works
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.routines 
            WHERE routine_name = 'get_user_module_permissions'
        ) 
        THEN '✅ get_user_module_permissions function exists'
        ELSE '❌ MISSING: get_user_module_permissions function'
    END as function_status;

-- 2. Check if marketing module exists
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM modules WHERE name = 'marketing')
        THEN '✅ Marketing module exists'
        ELSE '❌ MISSING: Marketing module'
    END as marketing_status;

-- 3. Check if design_tasks table exists and has required columns
SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('requested_by', 'task_type', 'media_files', 'created_by', 'acknowledged_at') 
        THEN '← Required by API'
        ELSE ''
    END as api_requirement
FROM information_schema.columns 
WHERE table_name = 'design_tasks' 
ORDER BY ordinal_position;

-- 4. Drop and recreate the function with correct signature
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

-- 5. Grant proper permissions
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO anon;

-- 6. Fix the trigger function first
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 7. Ensure marketing permissions exist for marketing role
DO $$
DECLARE
    marketing_module_id UUID;
BEGIN
    SELECT id INTO marketing_module_id FROM modules WHERE name = 'marketing';
    
    IF marketing_module_id IS NOT NULL THEN
        -- Marketing role should have full access to marketing module
        INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
        VALUES ('marketing', marketing_module_id, true, true, true, true)
        ON CONFLICT (role, module_id) DO UPDATE SET
            can_view = true,
            can_create = true,
            can_edit = true,
            can_delete = true,
            updated_at = NOW();
        
        -- Admin role should have full access
        INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
        VALUES ('admin', marketing_module_id, true, true, true, true)
        ON CONFLICT (role, module_id) DO UPDATE SET
            can_view = true,
            can_create = true,
            can_edit = true,
            can_delete = true,
            updated_at = NOW();
            
        RAISE NOTICE '✅ Marketing permissions restored';
    END IF;
END $$;

SELECT '🎉 Marketing kanban should work now!' as result;
