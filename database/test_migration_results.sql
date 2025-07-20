-- ================================
-- TEST MIGRATION RESULTS
-- ================================
-- Run this to verify everything is working correctly

-- 1. Check all users are migrated
SELECT 'USER MIGRATION STATUS:' as status;
SELECT 
  email,
  meta_user_role,
  meta_app_role,
  db_role,
  computed_role,
  is_admin_computed as is_admin
FROM user_role_status
ORDER BY is_admin_computed DESC, email;

-- 2. Count summary
SELECT 'MIGRATION SUMMARY:' as status;
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN db_role IS NOT NULL THEN 1 END) as migrated_users,
  COUNT(CASE WHEN is_admin_computed = true THEN 1 END) as admin_users,
  COUNT(CASE WHEN computed_role = 'user' THEN 1 END) as regular_users
FROM user_role_status;

-- 3. Test specific admin permissions
SELECT 'ADMIN PERMISSION TESTS:' as status;
SELECT * FROM test_user_permissions('marketing@silberarrows.com');

-- 4. Test RLS policies work
SELECT 'RLS POLICY TEST (admin can see all roles):' as status;
-- This should show all user roles if you're admin
SELECT user_id, role FROM user_roles LIMIT 5;

-- 5. Test helper functions
SELECT 'HELPER FUNCTION TESTS:' as status;
SELECT 
  'Current User' as test,
  get_user_role(auth.uid()) as my_role,
  is_user_admin(auth.uid()) as am_i_admin; 