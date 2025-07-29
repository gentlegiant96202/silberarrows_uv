-- Add Accounts Module to Database (Final Version)
-- This script uses standard SQL commands that work in Supabase SQL editor

-- Step 1: Check the current modules table structure
SELECT 'Current modules table columns:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'modules' 
ORDER BY ordinal_position;

-- Step 2: Show existing modules to understand the ID format
SELECT 'Existing modules:' as info;
SELECT id, name, description FROM modules ORDER BY name;

-- Step 3: Check role_permissions table structure
SELECT 'Role permissions table columns:' as info;
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
ORDER BY ordinal_position;

-- Step 4: Show existing permissions to understand the module reference format
SELECT 'Sample role permissions:' as info;
SELECT role, module_id, can_view, can_create, can_edit, can_delete 
FROM role_permissions 
LIMIT 5;

-- Step 5: Add accounts module with string ID (matching existing pattern)
-- This should work if other modules use string IDs
INSERT INTO modules (id, name, description, created_at, updated_at)
VALUES (
  'accounts',
  'Accounts Department',
  'Financial reporting, accounting, and business analytics',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Step 6: Add permissions for the accounts module
INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
VALUES 
  ('admin', 'accounts', true, true, true, true, NOW(), NOW()),
  ('manager', 'accounts', true, true, true, true, NOW(), NOW()),
  ('supervisor', 'accounts', true, false, true, false, NOW(), NOW()),
  ('sales', 'accounts', true, false, false, false, NOW(), NOW())
ON CONFLICT (role, module_id) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- Step 7: Verify the setup
SELECT 'Verification - Accounts module was added:' as info;
SELECT * FROM modules WHERE id = 'accounts' OR name = 'Accounts Department';

SELECT 'Verification - Accounts permissions were added:' as info;
SELECT * FROM role_permissions WHERE module_id = 'accounts';

-- Step 8: Show all current modules for reference
SELECT 'All current modules:' as info;
SELECT id, name, description FROM modules ORDER BY name;

-- Step 9: Show the complete permission structure
SELECT 'Complete permission overview:' as info;
SELECT 
    m.name as module_name,
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM modules m
LEFT JOIN role_permissions rp ON m.id = rp.module_id
ORDER BY m.name, rp.role;

SELECT 'Setup complete! The accounts module should now be available.' as status; 