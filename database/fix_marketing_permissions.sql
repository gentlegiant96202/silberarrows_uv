-- Fix marketing permissions for your user
-- This will give you edit access to marketing module

-- 1. Check current user's role
SELECT 
    ur.role,
    ur.user_id,
    au.email
FROM user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.user_id = auth.uid();

-- 2. Check current marketing permissions for your role
SELECT 
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete,
    m.name as module_name
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing';

-- 3. Update marketing permissions to allow editing
UPDATE role_permissions 
SET 
    can_view = true,
    can_create = true,
    can_edit = true,  -- This is what you need for drag-and-drop
    can_delete = false,
    updated_at = NOW()
WHERE role = (
    SELECT role FROM user_roles WHERE user_id = auth.uid()
)
AND module_id = (
    SELECT id FROM modules WHERE name = 'marketing'
);

-- 4. Verify the fix
SELECT 
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete,
    m.name as module_name
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing'
AND rp.role = (
    SELECT role FROM user_roles WHERE user_id = auth.uid()
);

-- 5. Test the function again
SELECT 'Testing updated permissions...' as status;
SELECT * FROM get_user_module_permissions(auth.uid(), 'marketing');

SELECT '✅ Marketing edit permissions granted - kanban should work now!' as result;
