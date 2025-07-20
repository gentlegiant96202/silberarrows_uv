-- ================================
-- COMPLETE ROLE SYSTEM FIX
-- ================================
-- Run this directly in Supabase SQL Editor
-- This will fix all RLS issues and set up the role system properly

-- Step 1: Create user_roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Step 2: Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 3: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Step 4: Create new RLS policies
-- Policy: Users can read their own role
CREATE POLICY "Users can view own role" ON user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own role (for migration)
CREATE POLICY "Users can update own role" ON user_roles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Admins can read all roles (check both database and metadata)
CREATE POLICY "Admins can view all roles" ON user_roles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Policy: Admins can update all roles
CREATE POLICY "Admins can update all roles" ON user_roles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Policy: Admins can insert new roles
CREATE POLICY "Admins can insert roles" ON user_roles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin'
    )
    OR 
    (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role' = 'admin'
    OR
    (auth.jwt() ->> 'app_metadata')::jsonb ->> 'role' = 'admin'
  );

-- Policy: Allow users to insert their own role during migration
CREATE POLICY "Users can insert own role" ON user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Step 5: Create helper functions
-- Drop dependent objects first, then the function
DROP VIEW IF EXISTS user_role_status CASCADE;
DROP FUNCTION IF EXISTS is_user_admin(UUID) CASCADE;

CREATE OR REPLACE FUNCTION is_user_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check database role first
  IF EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = check_user_id 
    AND role = 'admin'
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Fallback to metadata check
  IF EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = check_user_id 
    AND (
      (raw_user_meta_data->>'role') = 'admin' 
      OR (raw_app_meta_data->>'role') = 'admin'
    )
  ) THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Create admin RPC functions
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),
  role TEXT,
  created_at TIMESTAMPTZ
) SECURITY DEFINER AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Return users with roles
  RETURN QUERY
  SELECT 
    u.id,
    u.email,
    COALESCE(ur.role, 'user') as role,
    u.created_at
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  ORDER BY u.email;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_user_role_admin(
  target_user_id UUID,
  new_role TEXT
)
RETURNS BOOLEAN SECURITY DEFINER AS $$
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  -- Validate role
  IF new_role NOT IN ('admin', 'user') THEN
    RAISE EXCEPTION 'Invalid role. Must be admin or user.';
  END IF;
  
  -- Update or insert role
  INSERT INTO user_roles (user_id, role)
  VALUES (target_user_id, new_role)
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    role = EXCLUDED.role,
    updated_at = NOW();
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_roles_updated_at ON user_roles;
CREATE TRIGGER update_user_roles_updated_at 
  BEFORE UPDATE ON user_roles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 8: Grant permissions
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_admin(UUID, TEXT) TO authenticated;

-- Step 9: Migrate existing admin users from metadata to database
DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- Loop through users with admin role in metadata
  FOR user_record IN 
    SELECT id, email 
    FROM auth.users 
    WHERE (raw_user_meta_data->>'role') = 'admin' 
       OR (raw_app_meta_data->>'role') = 'admin'
  LOOP
    -- Insert into user_roles if not exists
    INSERT INTO user_roles (user_id, role)
    VALUES (user_record.id, 'admin')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE 'Migrated admin user: %', user_record.email;
  END LOOP;
END $$;

-- Step 10: Add helpful comments
COMMENT ON TABLE user_roles IS 'User role management table with RLS';
COMMENT ON FUNCTION is_user_admin(UUID) IS 'Check if user has admin privileges (database or metadata)';
COMMENT ON FUNCTION get_all_users_with_roles() IS 'Admin-only function to get all users with roles';
COMMENT ON FUNCTION update_user_role_admin(UUID, TEXT) IS 'Admin-only function to update user roles';

-- Final verification query
SELECT 
  'Setup Complete!' as status,
  COUNT(*) as total_users,
  COUNT(*) FILTER (WHERE ur.role = 'admin') as admin_users,
  COUNT(*) FILTER (WHERE ur.role = 'user') as regular_users
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id; 