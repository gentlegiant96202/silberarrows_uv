-- ================================
-- STEP 2: Dual-Check Helper Functions  
-- ================================
-- These functions check BOTH metadata AND database during migration

-- Function to check if a user is admin (checks both sources)
CREATE OR REPLACE FUNCTION is_user_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_meta JSONB;
  app_meta JSONB;
  db_role TEXT;
BEGIN
  -- Get metadata from auth.users
  SELECT raw_user_meta_data, raw_app_meta_data 
  INTO user_meta, app_meta
  FROM auth.users 
  WHERE id = check_user_id;
  
  -- Get role from user_roles table
  SELECT role INTO db_role
  FROM user_roles
  WHERE user_id = check_user_id;
  
  -- Check if admin in database table first (new system)
  IF db_role = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback to metadata checks (existing system)
  -- Check single role fields
  IF (user_meta->>'role' = 'admin') OR (app_meta->>'role' = 'admin') THEN
    RETURN TRUE;
  END IF;
  
  -- Check roles arrays
  IF (user_meta ? 'roles' AND user_meta->'roles' ? 'admin') OR (app_meta ? 'roles' AND app_meta->'roles' ? 'admin') THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role (checks both sources)
CREATE OR REPLACE FUNCTION get_user_role(check_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_meta JSONB;
  app_meta JSONB;
  db_role TEXT;
BEGIN
  -- Get role from user_roles table first (new system)
  SELECT role INTO db_role
  FROM user_roles
  WHERE user_id = check_user_id;
  
  IF db_role IS NOT NULL THEN
    RETURN db_role;
  END IF;
  
  -- Fallback to metadata (existing system)
  SELECT raw_user_meta_data, raw_app_meta_data 
  INTO user_meta, app_meta
  FROM auth.users 
  WHERE id = check_user_id;
  
  -- Check for admin in metadata
  IF (user_meta->>'role' = 'admin') OR (app_meta->>'role' = 'admin') THEN
    RETURN 'admin';
  END IF;
  
  IF (user_meta ? 'roles' AND user_meta->'roles' ? 'admin') OR (app_meta ? 'roles' AND app_meta->'roles' ? 'admin') THEN
    RETURN 'admin';
  END IF;
  
  -- Default to user
  RETURN 'user';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to migrate a user from metadata to database table
CREATE OR REPLACE FUNCTION migrate_user_role(migrate_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role_value TEXT;
  existing_db_role TEXT;
BEGIN
  -- Check if already in database
  SELECT role INTO existing_db_role
  FROM user_roles
  WHERE user_id = migrate_user_id;
  
  IF existing_db_role IS NOT NULL THEN
    RETURN 'Already migrated: ' || existing_db_role;
  END IF;
  
  -- Get role from metadata
  user_role_value := get_user_role(migrate_user_id);
  
  -- Insert into user_roles table
  INSERT INTO user_roles (user_id, role)
  VALUES (migrate_user_id, user_role_value)
  ON CONFLICT (user_id) DO UPDATE SET
    role = EXCLUDED.role,
    updated_at = timezone('utc'::text, now());
  
  RETURN 'Migrated: ' || user_role_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- View to see current role status for all users (for debugging)
CREATE OR REPLACE VIEW user_role_status AS
SELECT 
  u.id,
  u.email,
  u.created_at as user_created,
  
  -- Metadata roles
  u.raw_user_meta_data->>'role' as meta_user_role,
  u.raw_app_meta_data->>'role' as meta_app_role,
  (u.raw_user_meta_data ? 'roles' AND u.raw_user_meta_data->'roles' ? 'admin') as meta_user_has_admin,
  (u.raw_app_meta_data ? 'roles' AND u.raw_app_meta_data->'roles' ? 'admin') as meta_app_has_admin,
  
  -- Database role
  ur.role as db_role,
  ur.created_at as role_created,
  
  -- Helper function results
  is_user_admin(u.id) as is_admin_computed,
  get_user_role(u.id) as computed_role
  
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
ORDER BY u.created_at DESC;

-- Grant permissions to see the view
GRANT SELECT ON user_role_status TO authenticated;

-- Add comments
COMMENT ON FUNCTION is_user_admin(UUID) IS 'Checks if user is admin in BOTH metadata and database table';
COMMENT ON FUNCTION get_user_role(UUID) IS 'Gets user role from database first, falls back to metadata';
COMMENT ON FUNCTION migrate_user_role(UUID) IS 'Migrates a single user from metadata to database table';
COMMENT ON VIEW user_role_status IS 'Debug view showing role status from all sources'; 