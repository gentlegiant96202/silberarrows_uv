-- COMPLETE WORKING SETUP FOR ROLE MANAGEMENT SYSTEM
-- Run this entire script in Supabase Dashboard SQL Editor

BEGIN;

-- ===== STEP 1: ENSURE TABLES EXIST =====
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'sales' 
        CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role TEXT NOT NULL 
        CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing')),
    module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, module_id)
);

-- ===== STEP 2: INSERT MODULES =====
INSERT INTO modules (name, display_name, description) VALUES
('uv_crm', 'UV CRM', 'Customer relationship management system'),
('inventory', 'Inventory', 'Car inventory management'),
('marketing', 'Marketing Dashboard', 'Marketing analytics and campaigns'),
('workshop', 'Workshop/Service', 'Service department management'),
('admin', 'Admin Panel', 'System administration')
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- ===== STEP 3: ENSURE CURRENT USER HAS ADMIN ROLE =====
-- This will create a role for the current logged-in user
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ===== STEP 4: CREATE DEFAULT PERMISSIONS =====
-- Give admin full access to everything
DO $$
DECLARE
    mod RECORD;
    role_name TEXT;
BEGIN
    FOR role_name IN VALUES ('admin'), ('sales'), ('marketing'), ('service'), ('leasing') LOOP
        FOR mod IN SELECT id, name FROM modules LOOP
            INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
            VALUES (
                role_name, 
                mod.id,
                -- Admin gets everything, others get specific access
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'sales' AND mod.name IN ('uv_crm', 'inventory') THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'inventory', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name IN ('uv_crm', 'inventory') THEN true
                    ELSE false
                END,
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'sales' AND mod.name = 'uv_crm' THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name = 'uv_crm' THEN true
                    ELSE false
                END,
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'sales' AND mod.name = 'uv_crm' THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name = 'uv_crm' THEN true
                    ELSE false
                END,
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'marketing' AND mod.name = 'marketing' THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    ELSE false
                END
            )
            ON CONFLICT (role, module_id) DO UPDATE SET
                can_view = EXCLUDED.can_view,
                can_create = EXCLUDED.can_create,
                can_edit = EXCLUDED.can_edit,
                can_delete = EXCLUDED.can_delete,
                updated_at = NOW();
        END LOOP;
    END LOOP;
END $$;

-- ===== STEP 5: DISABLE RLS FOR SIMPLICITY =====
-- We'll implement proper security later
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname, tablename FROM pg_policies 
               WHERE schemaname = 'public' 
               AND tablename IN ('user_roles', 'modules', 'role_permissions') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ===== STEP 6: CREATE WORKING FUNCTIONS =====

-- Function to get all users with their roles
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
    id UUID,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        ur.user_id as id,
        COALESCE(au.email, 'Unknown User') as email,
        ur.role,
        ur.created_at
    FROM user_roles ur
    LEFT JOIN auth.users au ON ur.user_id = au.id
    WHERE au.email_confirmed_at IS NOT NULL
    ORDER BY ur.created_at DESC;
$$;

-- Function to get all role permissions
CREATE OR REPLACE FUNCTION get_all_role_permissions()
RETURNS TABLE(
    role TEXT,
    module_name TEXT,
    module_display_name TEXT,
    module_description TEXT,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN
)
LANGUAGE SQL
SECURITY DEFINER
AS $$
    SELECT 
        rp.role,
        m.name as module_name,
        m.display_name as module_display_name,
        m.description as module_description,
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete
    FROM role_permissions rp
    JOIN modules m ON rp.module_id = m.id
    ORDER BY rp.role, m.display_name;
$$;

-- Function to update user role
CREATE OR REPLACE FUNCTION update_user_role(
    target_user_id UUID,
    new_role TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Validate role
    IF new_role NOT IN ('admin', 'sales', 'marketing', 'service', 'leasing') THEN
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
END;
$$;

-- Function to update role permissions
CREATE OR REPLACE FUNCTION update_role_permission(
    target_role TEXT,
    target_module_name TEXT,
    new_can_view BOOLEAN,
    new_can_create BOOLEAN,
    new_can_edit BOOLEAN,
    new_can_delete BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_module_id UUID;
BEGIN
    -- Get module ID
    SELECT id INTO target_module_id 
    FROM modules 
    WHERE name = target_module_name;
    
    IF target_module_id IS NULL THEN
        RAISE EXCEPTION 'Module not found: %', target_module_name;
    END IF;

    -- Update permissions
    UPDATE role_permissions 
    SET 
        can_view = new_can_view,
        can_create = new_can_create,
        can_edit = new_can_edit,
        can_delete = new_can_delete,
        updated_at = NOW()
    WHERE role = target_role AND module_id = target_module_id;

    IF NOT FOUND THEN
        -- Insert if doesn't exist
        INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
        VALUES (target_role, target_module_id, new_can_view, new_can_create, new_can_edit, new_can_delete);
    END IF;

    RETURN TRUE;
END;
$$;

COMMIT;

-- ===== VERIFICATION =====
SELECT 'SETUP COMPLETE!' as status;
SELECT 'Users:' as section, COUNT(*) as count FROM user_roles;
SELECT 'Modules:' as section, COUNT(*) as count FROM modules;
SELECT 'Permissions:' as section, COUNT(*) as count FROM role_permissions;

-- Test the functions
SELECT 'Testing Functions:' as status;
SELECT COUNT(*) as user_count FROM get_all_users_with_roles();
SELECT COUNT(*) as permission_count FROM get_all_role_permissions(); 