-- Add Accounts Module to Database (Corrected Version)
-- This script first checks the database structure and then adapts accordingly

-- Step 1: Check the current modules table structure
SELECT 'Current modules table structure:' as info;
\d modules;

-- Step 2: Show existing modules to understand the ID format
SELECT 'Existing modules:' as info;
SELECT id, name, description FROM modules ORDER BY name;

-- Step 3: Check role_permissions table structure
SELECT 'Role permissions table structure:' as info;
\d role_permissions;

-- Step 4: Show existing permissions to understand the module reference format
SELECT 'Sample role permissions:' as info;
SELECT role, module, can_view, can_create, can_edit, can_delete 
FROM role_permissions 
LIMIT 5;

-- Step 5: Attempt to add accounts module with string ID (matching existing pattern)
-- If this fails, we'll know the table expects UUIDs
INSERT INTO modules (id, name, description, created_at, updated_at)
VALUES (
  'accounts',
  'Accounts Department',
  'Financial reporting, accounting, and business analytics',
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Alternative: If the above fails, try with generated UUID
-- (This will be commented out initially)
/*
INSERT INTO modules (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Accounts Department',
  'Financial reporting, accounting, and business analytics',
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;
*/

-- Step 6: Add permissions using string module reference
-- (Adjust based on what the role_permissions.module column expects)
INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
VALUES 
  ('admin', 'accounts', true, true, true, true, NOW(), NOW()),
  ('manager', 'accounts', true, true, true, true, NOW(), NOW()),
  ('supervisor', 'accounts', true, false, true, false, NOW(), NOW()),
  ('sales', 'accounts', true, false, false, false, NOW(), NOW())
ON CONFLICT (role, module) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_create = EXCLUDED.can_create,
  can_edit = EXCLUDED.can_edit,
  can_delete = EXCLUDED.can_delete,
  updated_at = NOW();

-- Step 7: Verify the setup
SELECT 'Verification - Accounts module:' as info;
SELECT * FROM modules WHERE id = 'accounts' OR name = 'Accounts Department';

SELECT 'Verification - Accounts permissions:' as info;
SELECT * FROM role_permissions WHERE module = 'accounts';

-- Step 8: Test the get_user_module_permissions function
SELECT 'Testing the RPC function:' as info;
-- This will show if the function works with 'accounts' as module_name
-- Replace 'your-user-id' with an actual user ID for testing
/*
SELECT * FROM get_user_module_permissions('your-user-id', 'accounts');
*/ 