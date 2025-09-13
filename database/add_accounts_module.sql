-- Add Accounts Module to Database
-- This script adds the new "accounts" module and sets up proper permissions

-- Step 1: Add the accounts module to the modules table with proper UUID
INSERT INTO modules (id, name, description, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Accounts Department',
  'Financial reporting, accounting, and business analytics',
  NOW(),
  NOW()
) ON CONFLICT (name) DO NOTHING;

-- Get the UUID of the accounts module for subsequent operations
-- Note: We'll reference by name since we can't predict the UUID

-- Step 2: Grant default permissions to admin role for accounts module
-- First, let's check what the actual module structure looks like
DO $$
DECLARE
    accounts_module_id UUID;
BEGIN
    -- Get the accounts module ID
    SELECT id INTO accounts_module_id FROM modules WHERE name = 'Accounts Department';
    
    IF accounts_module_id IS NOT NULL THEN
        -- Grant admin permissions
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
        VALUES (
          'admin',
          accounts_module_id,
          true,
          true,
          true,
          true,
          NOW(),
          NOW()
        ) ON CONFLICT (role, module) DO UPDATE SET
          can_view = EXCLUDED.can_view,
          can_create = EXCLUDED.can_create,
          can_edit = EXCLUDED.can_edit,
          can_delete = EXCLUDED.can_delete,
          updated_at = NOW();

        -- Grant sales role view-only access
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
        VALUES (
          'sales',
          accounts_module_id,
          true,
          false,
          false,
          false,
          NOW(),
          NOW()
        ) ON CONFLICT (role, module) DO NOTHING;

        -- Grant manager role full access
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
        VALUES (
          'manager',
          accounts_module_id,
          true,
          true,
          true,
          true,
          NOW(),
          NOW()
        ) ON CONFLICT (role, module) DO NOTHING;

        -- Grant supervisor role view and edit access
        INSERT INTO role_permissions (role, module, can_view, can_create, can_edit, can_delete, created_at, updated_at)
        VALUES (
          'supervisor',
          accounts_module_id,
          true,
          false,
          true,
          false,
          NOW(),
          NOW()
        ) ON CONFLICT (role, module) DO NOTHING;

        RAISE NOTICE 'Accounts module added successfully with ID: %', accounts_module_id;
    ELSE
        RAISE NOTICE 'Failed to find or create accounts module';
    END IF;
END $$;

-- Step 3: Display current modules and their structure for reference
SELECT 'Current modules:' as info;
SELECT id, name, description FROM modules ORDER BY name;

-- Check permissions for accounts module
SELECT 'Accounts module permissions:' as info;
SELECT rp.role, rp.can_view, rp.can_create, rp.can_edit, rp.can_delete 
FROM role_permissions rp 
JOIN modules m ON rp.module = m.id 
WHERE m.name = 'Accounts Department';

-- Show the accounts module UUID for frontend reference
SELECT 'Accounts Module UUID (for frontend):' as info, id as accounts_uuid 
FROM modules 
WHERE name = 'Accounts Department'; 