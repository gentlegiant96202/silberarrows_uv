-- Add Accounts Role to User System
-- This script adds "accounts" as a valid user role and sets up default permissions

-- Step 1: Update the role validation function to include "accounts"
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate role (now includes "accounts")
    IF new_role NOT IN ('admin', 'sales', 'marketing', 'service', 'leasing', 'accounts') THEN
        RAISE EXCEPTION 'Invalid role: %', new_role;
    END IF;

    -- Update or insert user role
    INSERT INTO user_roles (user_id, role, updated_at)
    VALUES (target_user_id, new_role, NOW())
    ON CONFLICT (user_id) 
    DO UPDATE SET 
        role = new_role,
        updated_at = NOW();

    RETURN TRUE;
END $$;

-- Step 2: Update the user_roles table constraint to include "accounts"
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_role_check;
ALTER TABLE user_roles ADD CONSTRAINT user_roles_role_check 
    CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing', 'accounts'));

-- Step 3: Add default permissions for the accounts role for all modules
DO $$
DECLARE
    accounts_module_uuid UUID := '550e8400-e29b-41d4-a716-446655440000'; -- Accounts module UUID
    module_rec RECORD;
BEGIN
    -- Add permissions for accounts role to access all modules
    FOR module_rec IN 
        SELECT id, name FROM modules 
    LOOP
        -- Default permissions for accounts role
        INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
        VALUES (
            'accounts', 
            module_rec.id, 
            CASE 
                WHEN module_rec.name = 'accounts' THEN true -- Full access to accounts module
                WHEN module_rec.name = 'uv_crm' THEN true   -- View access to CRM
                WHEN module_rec.name = 'inventory' THEN true -- View access to inventory
                ELSE false  -- No access to other modules by default
            END,
            CASE 
                WHEN module_rec.name = 'accounts' THEN true -- Can create in accounts
                ELSE false
            END,
            CASE 
                WHEN module_rec.name = 'accounts' THEN true -- Can edit in accounts
                ELSE false
            END,
            CASE 
                WHEN module_rec.name = 'accounts' THEN true -- Can delete in accounts
                ELSE false
            END,
            NOW(), 
            NOW()
        ) ON CONFLICT (role, module_id) DO UPDATE SET
            can_view = EXCLUDED.can_view,
            can_create = EXCLUDED.can_create,
            can_edit = EXCLUDED.can_edit,
            can_delete = EXCLUDED.can_delete,
            updated_at = NOW();
    END LOOP;

    RAISE NOTICE 'Added accounts role with appropriate permissions';
END $$;

-- Step 4: Verify the setup
SELECT 'Accounts role permissions:' as info;
SELECT 
    m.display_name as module,
    rp.can_view,
    rp.can_create,
    rp.can_edit,
    rp.can_delete
FROM role_permissions rp 
JOIN modules m ON rp.module_id = m.id 
WHERE rp.role = 'accounts'
ORDER BY m.display_name;

SELECT 'Setup complete! Users can now be assigned to the "accounts" role.' as status; 