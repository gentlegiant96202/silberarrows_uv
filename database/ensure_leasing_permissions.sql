-- Ensure Leasing Module and Permissions Exist
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Ensure leasing module exists (using proper UUID)
INSERT INTO modules (id, name, display_name, description, icon)
VALUES (gen_random_uuid(), 'leasing', 'Leasing Department', 'Vehicle leasing and financing management', 'users')
ON CONFLICT (name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Step 2: Ensure role permissions exist for leasing module
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
    perms.role_name, 
    m.id, 
    perms.can_view, 
    perms.can_create, 
    perms.can_edit, 
    perms.can_delete
FROM (VALUES 
    ('admin', true, true, true, true),
    ('sales', true, true, false, false),
    ('marketing', true, false, false, false),
    ('service', false, false, false, false),
    ('leasing', true, true, true, true)
) AS perms(role_name, can_view, can_create, can_edit, can_delete)
CROSS JOIN modules m 
WHERE m.name = 'leasing'
ON CONFLICT (role, module_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

-- Step 3: Check what modules and permissions exist
SELECT 'Modules:' as table_name, name as module_name, display_name FROM modules
UNION ALL
SELECT 'Permissions:' as table_name, rp.role || ' -> ' || m.display_name as module_name, 
       CASE WHEN rp.can_view THEN 'view' ELSE '' END ||
       CASE WHEN rp.can_create THEN ',create' ELSE '' END ||
       CASE WHEN rp.can_edit THEN ',edit' ELSE '' END ||
       CASE WHEN rp.can_delete THEN ',delete' ELSE '' END as display_name
FROM role_permissions rp 
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'leasing'
ORDER BY table_name, module_name;

-- Step 4: Verification - show your current role and permissions
SELECT 
    'Your Info:' as info_type,
    ur.role as current_role,
    ur.user_id::text as user_id
FROM user_roles ur
WHERE ur.user_id = auth.uid()
LIMIT 1; 