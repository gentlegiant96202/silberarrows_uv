-- Add the missing get_user_module_permissions function
-- This function is called by useModulePermissions hook in the frontend

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
LANGUAGE SQL
SECURITY DEFINER
AS $$
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
$$; 