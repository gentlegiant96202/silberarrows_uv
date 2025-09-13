-- ================================
-- DEBUG USER ROLES 500 ERRORS
-- ================================
-- Run this in Supabase SQL Editor to diagnose the exact issue

-- Step 1: Check if user_roles table exists and its structure
SELECT 'Step 1: Checking user_roles table...' as debug_step;
SELECT 
  table_name,
  table_schema
FROM information_schema.tables 
WHERE table_name = 'user_roles';

-- Step 2: Check table structure
SELECT 'Step 2: Checking table columns...' as debug_step;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- Step 3: Check RLS status
SELECT 'Step 3: Checking RLS status...' as debug_step;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'user_roles';

-- Step 4: Check current policies
SELECT 'Step 4: Checking RLS policies...' as debug_step;
SELECT 
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_roles';

-- Step 5: Check if functions exist
SELECT 'Step 5: Checking functions...' as debug_step;
SELECT 
  proname as function_name,
  prorettype::regtype as return_type
FROM pg_proc 
WHERE proname IN ('get_user_role', 'migrate_user_role');

-- Step 6: Test basic access to user_roles (this might fail)
SELECT 'Step 6: Testing table access...' as debug_step;
BEGIN;
  -- Try to select from user_roles
  SELECT COUNT(*) as total_rows FROM user_roles;
EXCEPTION WHEN OTHERS THEN
  SELECT 'ERROR: ' || SQLERRM as error_message;
END;

-- Step 7: Check current user context
SELECT 'Step 7: Checking current user context...' as debug_step;
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() as current_jwt;

-- Step 8: Emergency fix - temporarily disable RLS for testing
SELECT 'Step 8: Temporarily disabling RLS for diagnosis...' as debug_step;
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Test access now
SELECT 'Testing access without RLS...' as debug_step;
SELECT COUNT(*) as total_rows_without_rls FROM user_roles;

-- Show sample data
SELECT 'Sample data:' as debug_step;
SELECT user_id, role, created_at FROM user_roles LIMIT 3;

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

SELECT 'Diagnosis complete!' as final_step; 