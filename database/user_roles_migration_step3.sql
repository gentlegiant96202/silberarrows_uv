-- ================================
-- STEP 3: Migrate Existing Users
-- ================================
-- Safely migrate all existing users from metadata to database table

-- First, let's see what we're working with
SELECT 'BEFORE MIGRATION - Current user role status:' as status;
SELECT * FROM user_role_status;

-- Migrate all existing users
DO $$ 
DECLARE
  user_record RECORD;
  migration_result TEXT;
BEGIN
  RAISE NOTICE 'Starting migration of existing users...';
  
  FOR user_record IN 
    SELECT id, email FROM auth.users 
    ORDER BY created_at
  LOOP
    -- Migrate each user
    SELECT migrate_user_role(user_record.id) INTO migration_result;
    RAISE NOTICE 'User %: %', user_record.email, migration_result;
  END LOOP;
  
  RAISE NOTICE 'Migration completed!';
END $$;

-- Check results after migration
SELECT 'AFTER MIGRATION - Updated user role status:' as status;
SELECT * FROM user_role_status;

-- Verify migration worked correctly
SELECT 'MIGRATION VERIFICATION:' as status;
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN db_role IS NOT NULL THEN 1 END) as migrated_users,
  COUNT(CASE WHEN is_admin_computed = true THEN 1 END) as admin_users,
  COUNT(CASE WHEN computed_role = 'admin' THEN 1 END) as computed_admin_users
FROM user_role_status;

-- Show any discrepancies (should be none)
SELECT 'DISCREPANCY CHECK (should be empty):' as status;
SELECT 
  email,
  meta_user_role,
  meta_app_role,
  db_role,
  computed_role,
  is_admin_computed
FROM user_role_status
WHERE 
  -- Check if database role doesn't match computed role
  (db_role IS NOT NULL AND db_role != computed_role)
  -- Or if admin status is inconsistent
  OR (
    (meta_user_role = 'admin' OR meta_app_role = 'admin' OR meta_user_has_admin OR meta_app_has_admin)
    AND db_role != 'admin'
  );

-- Create a function to verify a specific user's permissions still work
CREATE OR REPLACE FUNCTION test_user_permissions(test_email TEXT)
RETURNS TABLE(
  test_name TEXT,
  old_method BOOLEAN,
  new_method BOOLEAN,
  helper_function BOOLEAN,
  status TEXT
) AS $$
DECLARE
  test_user_id UUID;
  user_meta JSONB;
  app_meta JSONB;
BEGIN
  -- Get user info
  SELECT id, raw_user_meta_data, raw_app_meta_data 
  INTO test_user_id, user_meta, app_meta
  FROM auth.users 
  WHERE email = test_email;
  
  IF test_user_id IS NULL THEN
    RETURN QUERY SELECT 'User not found'::TEXT, false, false, false, 'ERROR'::TEXT;
    RETURN;
  END IF;
  
  -- Test old metadata method (your existing logic)
  RETURN QUERY SELECT 
    'Old metadata method'::TEXT,
    (
      (user_meta->>'role' = 'admin') OR 
      (app_meta->>'role' = 'admin') OR
      (user_meta ? 'roles' AND user_meta->'roles' ? 'admin') OR 
      (app_meta ? 'roles' AND app_meta->'roles' ? 'admin')
    ),
    false,
    false,
    'Original logic'::TEXT;
    
  -- Test new database method
  RETURN QUERY SELECT 
    'New database method'::TEXT,
    false,
    EXISTS(SELECT 1 FROM user_roles WHERE user_id = test_user_id AND role = 'admin'),
    false,
    'Database table'::TEXT;
    
  -- Test helper function (should match one of the above)
  RETURN QUERY SELECT 
    'Helper function'::TEXT,
    false,
    false,
    is_user_admin(test_user_id),
    'Dual-check function'::TEXT;
    
END;
$$ LANGUAGE plpgsql;

-- Test specific admin users
SELECT 'TESTING ADMIN PERMISSIONS:' as status;
SELECT * FROM test_user_permissions('marketing@silberarrows.com');
SELECT * FROM test_user_permissions('philip.smith@silberarrows.com');

COMMENT ON FUNCTION test_user_permissions(TEXT) IS 'Test function to verify user permissions work with both old and new methods'; 