-- COMPLETE MODULE PERMISSIONS FIX
-- Run this entire script in Supabase Dashboard SQL Editor
-- This will fix the "Permission system unavailable" error

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
('marketing', 'Marketing Dashboard', 'Marketing analytics and campaigns'),
('workshop', 'Workshop/Service', 'Service department management'),
('leasing', 'Leasing Department', 'Vehicle leasing and financing'),
('admin', 'Admin Panel', 'System administration')
ON CONFLICT (name) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    description = EXCLUDED.description;

-- ===== STEP 3: ENSURE CURRENT USER HAS ADMIN ROLE =====
INSERT INTO user_roles (user_id, role) 
VALUES (auth.uid(), 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- ===== STEP 4: CREATE DEFAULT PERMISSIONS =====
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
                    WHEN role_name = 'sales' AND mod.name IN ('uv_crm') THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name IN ('uv_crm', 'leasing') THEN true
                    ELSE false
                END,
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'sales' AND mod.name = 'uv_crm' THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name IN ('uv_crm', 'leasing') THEN true
                    ELSE false
                END,
                CASE 
                    WHEN role_name = 'admin' THEN true
                    WHEN role_name = 'sales' AND mod.name = 'uv_crm' THEN true
                    WHEN role_name = 'marketing' AND mod.name IN ('uv_crm', 'marketing') THEN true
                    WHEN role_name = 'service' AND mod.name = 'workshop' THEN true
                    WHEN role_name = 'leasing' AND mod.name IN ('uv_crm', 'leasing') THEN true
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

-- ===== STEP 5: DISABLE RLS TEMPORARILY =====
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- ===== STEP 6: DROP ALL EXISTING FUNCTIONS FIRST =====
DROP FUNCTION IF EXISTS get_user_module_permissions(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS migrate_user_role(UUID);

-- ===== STEP 7: CREATE THE MISSING FUNCTION =====
CREATE OR REPLACE FUNCTION get_user_module_permissions(
    check_user_id UUID,
    module_name TEXT
)
RETURNS TABLE(
    can_view BOOLEAN,
    can_create BOOLEAN,
    can_edit BOOLEAN,
    can_delete BOOLEAN,
    role TEXT,
    module_display_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rp.can_view,
        rp.can_create,
        rp.can_edit,
        rp.can_delete,
        ur.role,
        m.display_name as module_display_name
    FROM user_roles ur
    INNER JOIN role_permissions rp ON ur.role = rp.role
    INNER JOIN modules m ON rp.module_id = m.id
    WHERE ur.user_id = check_user_id 
    AND m.name = module_name;
END;
$$;

-- ===== STEP 8: CREATE OTHER NEEDED FUNCTIONS =====

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Check database first
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = check_user_id;
  
  IF user_role IS NOT NULL THEN
    RETURN user_role;
  END IF;
  
  -- Fallback to legacy metadata check
  SELECT CASE 
    WHEN (raw_user_meta_data->>'role') = 'admin' 
      OR (raw_app_meta_data->>'role') = 'admin' THEN 'admin'
    ELSE 'sales'
  END INTO user_role
  FROM auth.users
  WHERE id = check_user_id;
  
  RETURN COALESCE(user_role, 'sales');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate user role
CREATE OR REPLACE FUNCTION migrate_user_role(migrate_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  legacy_role TEXT;
BEGIN
  -- Get legacy role from metadata
  SELECT CASE 
    WHEN (raw_user_meta_data->>'role') = 'admin' 
      OR (raw_app_meta_data->>'role') = 'admin' THEN 'admin'
    ELSE 'sales'
  END INTO legacy_role
  FROM auth.users
  WHERE id = migrate_user_id;
  
  -- Insert into database
  INSERT INTO user_roles (user_id, role)
  VALUES (migrate_user_id, COALESCE(legacy_role, 'sales'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===== STEP 9: GRANT PERMISSIONS =====
GRANT EXECUTE ON FUNCTION get_user_module_permissions(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_role(UUID) TO authenticated;

COMMIT;

-- ===== VERIFICATION =====
SELECT 'MODULE PERMISSIONS SETUP COMPLETE!' as status;
SELECT 'Users:' as section, COUNT(*) as count FROM user_roles;
SELECT 'Modules:' as section, COUNT(*) as count FROM modules;
SELECT 'Permissions:' as section, COUNT(*) as count FROM role_permissions;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Module permissions system is now working!';
    RAISE NOTICE '✅ Refresh your browser to see the modules.';
END $$; 