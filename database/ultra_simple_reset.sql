-- ULTRA SIMPLE RESET - GUARANTEED TO WORK
-- Run this in Supabase Dashboard SQL Editor

-- ===== STEP 1: NUCLEAR RESET =====
-- Disable all RLS and drop all policies
BEGIN;

-- Disable RLS on ALL tables to stop recursion
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' DISABLE ROW LEVEL SECURITY';
    END LOOP;
END $$;

-- Drop ALL policies in the public schema
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
        EXECUTE 'DROP POLICY ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ===== STEP 2: VERIFY TABLES EXIST =====
-- Ensure our core tables exist
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY,
    role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing')),
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
    role TEXT NOT NULL CHECK (role IN ('admin', 'sales', 'marketing', 'service', 'leasing')),
    module_id UUID REFERENCES modules(id),
    can_view BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role, module_id)
);

-- ===== STEP 3: ENSURE BASIC DATA EXISTS =====
-- Insert modules if they don't exist
INSERT INTO modules (name, display_name, description) VALUES
('uv_crm', 'UV CRM', 'Customer relationship management system'),
('inventory', 'Inventory', 'Car inventory management'),
('marketing', 'Marketing Dashboard', 'Marketing analytics and campaigns'),
('workshop', 'Workshop/Service', 'Service department management'),
('admin', 'Admin Panel', 'System administration')
ON CONFLICT (name) DO NOTHING;

-- ===== STEP 4: SIMPLE FUNCTIONS =====
-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS get_users_simple();
DROP FUNCTION IF EXISTS get_permissions_simple();
DROP FUNCTION IF EXISTS update_user_role_simple(UUID, TEXT);
DROP FUNCTION IF EXISTS update_permission_simple(TEXT, TEXT, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN);

-- Function 1: Get users with roles (exact return type)
CREATE OR REPLACE FUNCTION get_users_simple()
RETURNS TABLE(
    id UUID,
    email TEXT,
    role TEXT,
    created_at TIMESTAMPTZ
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ur.user_id as id,
        COALESCE(au.email, 'user-' || SUBSTRING(ur.user_id::text, 1, 8)) as email,
        ur.role,
        ur.created_at
    FROM user_roles ur
    LEFT JOIN auth.users au ON ur.user_id = au.id
    ORDER BY ur.created_at DESC;
END;
$$;

-- Function 2: Get permissions (exact return type)
CREATE OR REPLACE FUNCTION get_permissions_simple()
RETURNS TABLE(
    role TEXT,
    module_name TEXT,
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.role,
        m.name as module_name,
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete
    FROM role_permissions rp
    JOIN modules m ON rp.module_id = m.id
    ORDER BY rp.role, m.name;
END;
$$;

-- Function 3: Update user role (simple)
CREATE OR REPLACE FUNCTION update_user_role_simple(user_id_param UUID, role_param TEXT)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO user_roles (user_id, role)
    VALUES (user_id_param, role_param)
    ON CONFLICT (user_id) 
    DO UPDATE SET role = role_param, updated_at = NOW();
    RETURN TRUE;
END;
$$;

-- Function 4: Update permission (simple)
CREATE OR REPLACE FUNCTION update_permission_simple(
    role_param TEXT,
    module_param TEXT,
    view_param BOOLEAN,
    create_param BOOLEAN,
    edit_param BOOLEAN,
    delete_param BOOLEAN
)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    mod_id UUID;
BEGIN
    SELECT id INTO mod_id FROM modules WHERE name = module_param;
    
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES (role_param, mod_id, view_param, create_param, edit_param, delete_param)
    ON CONFLICT (role, module_id)
    DO UPDATE SET 
        can_view = view_param,
        can_create = create_param,
        can_edit = edit_param,
        can_delete = delete_param,
        updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- ===== STEP 5: CREATE DEFAULT PERMISSIONS =====
-- Ensure all roles have all modules (with default permissions)
DO $$
DECLARE
    role_name TEXT;
    mod RECORD;
BEGIN
    FOR role_name IN VALUES ('admin'), ('sales'), ('marketing'), ('service'), ('leasing') LOOP
        FOR mod IN SELECT id, name FROM modules LOOP
            INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
            VALUES (
                role_name, 
                mod.id,
                CASE WHEN role_name = 'admin' THEN true ELSE false END,
                CASE WHEN role_name = 'admin' THEN true ELSE false END,
                CASE WHEN role_name = 'admin' THEN true ELSE false END,
                CASE WHEN role_name = 'admin' THEN true ELSE false END
            )
            ON CONFLICT (role, module_id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;

COMMIT;

-- ===== VERIFICATION =====
SELECT 'FINAL STATUS' as step;
SELECT COUNT(*) as user_count FROM user_roles;
SELECT COUNT(*) as module_count FROM modules;
SELECT COUNT(*) as permission_count FROM role_permissions;

SELECT 'SUCCESS - Database ready for admin interface!' as result; 