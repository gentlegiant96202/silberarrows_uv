-- Add Accounts Module to Database (UUID Version)
-- This script properly handles UUID for module IDs

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
SELECT id, name, display_name, description FROM modules ORDER BY name;

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

-- Step 5: Add accounts module with a proper UUID and all required fields
-- Generate a specific UUID for accounts module
DO $$
DECLARE
    accounts_uuid UUID := '550e8400-e29b-41d4-a716-446655440000'; -- Fixed UUID for accounts
BEGIN
    -- Insert the accounts module with all required fields
    INSERT INTO modules (id, name, display_name, description, created_at, updated_at)
    VALUES (
      accounts_uuid,
      'accounts',
      'Accounts Department',
      'Financial reporting, accounting, and business analytics',
      NOW(),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert permissions for the accounts module using the UUID
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
    VALUES 
      ('admin', accounts_uuid, true, true, true, true, NOW(), NOW()),
      ('manager', accounts_uuid, true, true, true, true, NOW(), NOW()),
      ('supervisor', accounts_uuid, true, false, true, false, NOW(), NOW()),
      ('sales', accounts_uuid, true, false, false, false, NOW(), NOW())
    ON CONFLICT (role, module_id) DO UPDATE SET
      can_view = EXCLUDED.can_view,
      can_create = EXCLUDED.can_create,
      can_edit = EXCLUDED.can_edit,
      can_delete = EXCLUDED.can_delete,
      updated_at = NOW();

    RAISE NOTICE 'Accounts module added with UUID: %', accounts_uuid;
END $$;

-- Step 6: Verify the setup
SELECT 'Verification - Accounts module was added:' as info;
SELECT * FROM modules WHERE name = 'accounts' OR display_name = 'Accounts Department';

SELECT 'Verification - Accounts permissions were added:' as info;
SELECT rp.* FROM role_permissions rp 
JOIN modules m ON rp.module_id = m.id 
WHERE m.name = 'accounts';

-- Step 7: Show all current modules for reference
SELECT 'All current modules:' as info;
SELECT id, name, display_name, description FROM modules ORDER BY name;

-- Step 8: Show the complete permission structure
SELECT 'Complete permission overview:' as info;
SELECT 
    m.display_name as module_display_name,
    m.name as module_name,
    rp.role,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM modules m
LEFT JOIN role_permissions rp ON m.id = rp.module_id
ORDER BY m.name, rp.role;

-- Step 9: Important note for frontend integration
SELECT 'IMPORTANT: For frontend integration, the system needs to map' as note;
SELECT 'the string "accounts" to the UUID shown above in get_user_module_permissions function' as note2;

SELECT 'Setup complete! The accounts module should now be available.' as status; 