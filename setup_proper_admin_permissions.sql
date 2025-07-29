-- Setup Proper Admin Permissions - Controllable through Admin Interface
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Ensure inventory module exists
INSERT INTO modules (name, display_name, description) VALUES
('inventory', 'Inventory', 'Vehicle inventory management and tracking')
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- Step 2: Give current admin user full permissions to admin panel (this should always be allowed)
WITH admin_module AS (
  SELECT id FROM modules WHERE name = 'admin'
),
current_user_role AS (
  SELECT role FROM user_roles WHERE user_id = auth.uid()
)
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  cur.role,
  am.id,
  true, true, true, true
FROM current_user_role cur, admin_module am
WHERE cur.role = 'admin'
ON CONFLICT (role, module_id) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true,
  updated_at = NOW();

-- Step 3: Give admin role default access to other modules (but these can be modified in admin settings)
WITH admin_modules AS (
  SELECT id, name FROM modules WHERE name IN ('uv_crm', 'inventory', 'marketing', 'workshop', 'leasing')
)
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  'admin',
  am.id,
  true, true, true, true
FROM admin_modules am
ON CONFLICT (role, module_id) DO UPDATE SET
  can_view = true,
  can_create = true,
  can_edit = true,
  can_delete = true,
  updated_at = NOW();

-- Step 4: Verification
SELECT 'Current user info:' as info, 
       ur.role, 
       au.email
FROM user_roles ur
JOIN auth.users au ON ur.user_id = au.id
WHERE ur.user_id = auth.uid();

SELECT 'Admin permissions:' as info,
       m.display_name as module,
       rp.can_view, rp.can_create, rp.can_edit, rp.can_delete
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE rp.role = 'admin'
ORDER BY m.display_name;

SELECT 'All modules:' as info, name, display_name FROM modules ORDER BY name;

COMMIT; 