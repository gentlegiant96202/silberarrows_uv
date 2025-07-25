-- COMPREHENSIVE RLS DIAGNOSIS AND RESET
-- Run this in Supabase Dashboard SQL Editor

BEGIN;

-- ===== STEP 1: DIAGNOSIS =====
-- Check current RLS status
SELECT 'CURRENT RLS STATUS' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  hasrls as has_rls_policies
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'modules', 'role_permissions');

-- Check existing policies
SELECT 'EXISTING POLICIES' as section;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'modules', 'role_permissions')
ORDER BY tablename, policyname;

-- Check if our tables exist
SELECT 'TABLE EXISTENCE' as section;
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('user_roles', 'modules', 'role_permissions');

-- ===== STEP 2: CLEAN SLATE =====
-- Disable RLS temporarily to avoid recursion
ALTER TABLE IF EXISTS user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS role_permissions DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (be thorough)
DO $$ 
DECLARE 
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname, tablename 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('user_roles', 'modules', 'role_permissions')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ===== STEP 3: FRESH RLS SETUP =====
-- Enable RLS on tables
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY; 
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ===== USER_ROLES TABLE POLICIES =====
-- Strategy: Use service role for admin operations, avoid recursion

-- Policy 1: Users can see their own role only
CREATE POLICY "user_roles_own_select" ON user_roles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Policy 2: Service role can do everything (for admin operations via RPC)
CREATE POLICY "user_roles_service_all" ON user_roles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===== MODULES TABLE POLICIES =====
-- All authenticated users can read modules
CREATE POLICY "modules_read_all" ON modules
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can modify (admin operations via RPC)
CREATE POLICY "modules_service_all" ON modules
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===== ROLE_PERMISSIONS TABLE POLICIES =====
-- All authenticated users can read permissions
CREATE POLICY "role_permissions_read_all" ON role_permissions
    FOR SELECT
    TO authenticated
    USING (true);

-- Only service role can modify (admin operations via RPC)
CREATE POLICY "role_permissions_service_all" ON role_permissions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- ===== STEP 4: VERIFICATION =====
-- Check final state
SELECT 'FINAL RLS STATUS' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename AND p.schemaname = t.schemaname) as policy_count
FROM pg_tables t
WHERE schemaname = 'public' 
AND tablename IN ('user_roles', 'modules', 'role_permissions');

-- List final policies
SELECT 'FINAL POLICIES' as section;
SELECT 
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies 
WHERE schemaname = 'public'
AND tablename IN ('user_roles', 'modules', 'role_permissions')
ORDER BY tablename, policyname;

-- ===== STEP 5: CREATE ADMIN RPC FUNCTIONS =====
-- These use SECURITY DEFINER to bypass RLS for admin operations

-- Function to get all users with roles (for admin interface)
CREATE OR REPLACE FUNCTION get_all_users_with_roles_admin()
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin (using metadata for initial check)
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    ur.user_id as id,
    COALESCE(au.email, 'Unknown') as email,
    ur.role,
    ur.created_at
  FROM user_roles ur
  LEFT JOIN auth.users au ON ur.user_id = au.id
  WHERE au.email_confirmed_at IS NOT NULL
  ORDER BY ur.created_at DESC;
END;
$$;

-- Function to update user role (for admin interface)
CREATE OR REPLACE FUNCTION update_user_role_admin(target_user_id UUID, new_role TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Validate role
  IF new_role NOT IN ('admin', 'sales', 'marketing', 'service', 'leasing') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin, sales, marketing, service, or leasing.';
  END IF;

  -- Update or insert user role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = new_role,
    updated_at = NOW();

  RETURN TRUE;
END;
$$;

-- Function to get role permissions (for admin interface)
CREATE OR REPLACE FUNCTION get_role_permissions_admin()
RETURNS TABLE(
  role TEXT,
  module_name TEXT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

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

-- Function to update role permissions (for admin interface)
CREATE OR REPLACE FUNCTION update_role_permissions_admin(
  target_role TEXT,
  target_module TEXT,
  new_can_view BOOLEAN,
  new_can_create BOOLEAN,
  new_can_edit BOOLEAN,
  new_can_delete BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  module_id_var UUID;
BEGIN
  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE auth.users.id = auth.uid() 
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get module ID
  SELECT id INTO module_id_var FROM modules WHERE name = target_module;
  
  IF module_id_var IS NULL THEN
    RAISE EXCEPTION 'Module not found: %', target_module;
  END IF;

  -- Update permissions
  UPDATE role_permissions 
  SET 
    can_view = new_can_view,
    can_create = new_can_create,
    can_edit = new_can_edit,
    can_delete = new_can_delete,
    updated_at = NOW()
  WHERE role = target_role AND module_id = module_id_var;

  IF NOT FOUND THEN
    -- Insert if doesn't exist
    INSERT INTO role_permissions (role, module_id, can_view, can_create, can_edit, can_delete)
    VALUES (target_role, module_id_var, new_can_view, new_can_create, new_can_edit, new_can_delete);
  END IF;

  RETURN TRUE;
END;
$$;

COMMIT;

-- Test queries (should work now)
SELECT 'TEST QUERIES' as section;
SELECT COUNT(*) as user_count FROM user_roles;
SELECT COUNT(*) as module_count FROM modules;
SELECT COUNT(*) as permission_count FROM role_permissions; 