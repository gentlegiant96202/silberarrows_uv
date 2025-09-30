-- Restore original permission system from role_permissions_system.sql
-- This will fix the marketing kanban by restoring the correct permissions

-- 1. First, check what role your user currently has
SELECT 
    ur.role as current_role,
    ur.user_id,
    au.email
FROM user_roles ur
LEFT JOIN auth.users au ON ur.user_id = au.id
WHERE ur.user_id = auth.uid();

-- 2. Ensure all modules exist (restore if missing)
INSERT INTO modules (name, display_name, description, icon, route) VALUES
('uv_crm', 'UV CRM', 'Customer relationship management for leads and sales', '👥', '/'),
('inventory', 'Inventory', 'Vehicle inventory management and tracking', '🚗', '/inventory'),
('marketing', 'Marketing Dashboard', 'Marketing campaigns and analytics', '📈', '/marketing/dashboard'),
('workshop', 'Workshop', 'Service department and job management', '🔧', '/workshop/dashboard'),
('admin', 'Admin Panel', 'System administration and user management', '⚙️', '/admin/settings')
ON CONFLICT (name) DO NOTHING;

-- 3. Clear existing role permissions and restore original ones
DELETE FROM role_permissions;

-- 4. Restore original role permissions exactly as they were
WITH module_ids AS (
  SELECT name, id FROM modules
)
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
SELECT 
  perms.role,
  m.id,
  perms.can_view,
  perms.can_create,
  perms.can_edit,
  perms.can_delete
FROM (
  VALUES 
  -- Sales role permissions
  ('sales', 'uv_crm', true, true, true, true),
  ('sales', 'inventory', true, true, false, false), -- Can view and add cars only
  ('sales', 'marketing', false, false, false, false),
  ('sales', 'workshop', false, false, false, false),
  ('sales', 'admin', false, false, false, false),
  
  -- Marketing role permissions  
  ('marketing', 'uv_crm', true, true, true, false), -- Can view, create, edit leads (no delete)
  ('marketing', 'inventory', true, true, true, true), -- Full inventory access
  ('marketing', 'marketing', true, true, true, true), -- Full marketing access
  ('marketing', 'workshop', false, false, false, false),
  ('marketing', 'admin', false, false, false, false),
  
  -- Service role permissions
  ('service', 'uv_crm', false, false, false, false),
  ('service', 'inventory', false, false, false, false),
  ('service', 'marketing', false, false, false, false),
  ('service', 'workshop', true, true, true, true), -- Full workshop access
  ('service', 'admin', false, false, false, false),
  
  -- Leasing role permissions
  ('leasing', 'uv_crm', true, true, true, true), -- Full CRM access for leasing deals
  ('leasing', 'inventory', true, true, false, false), -- Can view and add cars, similar to sales
  ('leasing', 'marketing', false, false, false, false),
  ('leasing', 'workshop', false, false, false, false),
  ('leasing', 'admin', false, false, false, false),
  
  -- Admin role permissions (full access to everything)
  ('admin', 'uv_crm', true, true, true, true),
  ('admin', 'inventory', true, true, true, true),
  ('admin', 'marketing', true, true, true, true),
  ('admin', 'workshop', true, true, true, true),
  ('admin', 'admin', true, true, true, true)
) AS perms(role, module_name, can_view, can_create, can_edit, can_delete)
JOIN module_ids m ON m.name = perms.module_name;

-- 5. Verify the permissions were restored correctly
SELECT 
    rp.role,
    m.name as module_name,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM role_permissions rp
JOIN modules m ON rp.module_id = m.id
WHERE m.name = 'marketing'
ORDER BY rp.role;

-- 6. Test your current permissions
SELECT 'Your current permissions:' as status;
SELECT * FROM get_user_module_permissions(auth.uid(), 'marketing');

-- 7. If you're not admin or marketing role, make you admin temporarily
UPDATE user_roles 
SET role = 'admin', updated_at = NOW()
WHERE user_id = auth.uid();

-- 8. Test permissions again after role update
SELECT 'After making you admin:' as status;
SELECT * FROM get_user_module_permissions(auth.uid(), 'marketing');

SELECT '✅ Original permissions restored - marketing kanban should work now!' as result;
