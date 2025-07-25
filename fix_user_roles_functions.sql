-- ================================
-- FIX USER ROLES 500 ERRORS
-- ================================
-- Run this in Supabase SQL Editor to fix missing RPC functions

-- Drop existing functions first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS migrate_user_role(UUID);

-- Function: get_user_role (called by useUserRole hook)
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

-- Function: migrate_user_role (called by useUserRole hook)
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

-- Grant permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION migrate_user_role(UUID) TO authenticated;

-- Fix RLS policies if needed (ensure users can read their own role)
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Allow users to insert their own role during migration
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
CREATE POLICY "Users can insert own role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own role during migration
DROP POLICY IF EXISTS "Users can update own role" ON user_roles;
CREATE POLICY "Users can update own role" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Test the functions work
SELECT 'Functions created successfully!' as status; 