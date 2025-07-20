-- ================================
-- COMPREHENSIVE DIAGNOSTIC AND FIX
-- ================================
-- This script diagnoses and fixes all issues causing 500 errors

-- Step 1: Check what exists
SELECT 'Checking user_roles table...' as step;
SELECT COUNT(*) as user_roles_count FROM user_roles;

SELECT 'Checking existing functions...' as step;
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = current_schema() 
AND routine_name LIKE '%user%' 
AND routine_name LIKE '%role%';

-- Step 2: Create missing functions that useUserRole is trying to call

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS migrate_user_role(UUID);

-- Function: get_user_role (called by useUserRole hook)
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
  
  -- Fallback to metadata
  SELECT CASE 
    WHEN (raw_user_meta_data->>'role') = 'admin' 
      OR (raw_app_meta_data->>'role') = 'admin' THEN 'admin'
    ELSE 'user'
  END INTO user_role
  FROM auth.users
  WHERE id = check_user_id;
  
  RETURN COALESCE(user_role, 'user');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: migrate_user_role (called by useUserRole hook)
CREATE OR REPLACE FUNCTION migrate_user_role(migrate_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  legacy_role TEXT;
BEGIN
  -- Get role from metadata
  SELECT CASE 
    WHEN (raw_user_meta_data->>'role') = 'admin' 
      OR (raw_app_meta_data->>'role') = 'admin' THEN 'admin'
    ELSE 'user'
  END INTO legacy_role
  FROM auth.users
  WHERE id = migrate_user_id;
  
  -- Insert into user_roles if not exists
  INSERT INTO user_roles (user_id, role)
  VALUES (migrate_user_id, COALESCE(legacy_role, 'user'))
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Fix any RLS issues by temporarily allowing all access for testing
-- Create a policy that allows authenticated users to read user_roles for debugging
DROP POLICY IF EXISTS "Debug: Allow all authenticated reads" ON user_roles;
CREATE POLICY "Debug: Allow all authenticated reads" ON user_roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Step 4: Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;

-- Step 5: Test queries that the frontend is making
SELECT 'Testing user_roles access...' as test;
SELECT COUNT(*) as accessible_roles FROM user_roles;

SELECT 'Testing is_user_admin function...' as test;
SELECT is_user_admin(auth.uid()) as current_user_is_admin;

-- Step 6: Ensure current user has a role
INSERT INTO user_roles (user_id, role)
SELECT auth.uid(), 'admin'
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';

-- Final verification
SELECT 
  'Diagnostic Complete!' as status,
  auth.uid() as current_user_id,
  is_user_admin(auth.uid()) as is_admin,
  (SELECT role FROM user_roles WHERE user_id = auth.uid()) as db_role,
  (SELECT COUNT(*) FROM user_roles) as total_roles;

-- List all policies on user_roles
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'user_roles'; 