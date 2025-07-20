-- ================================
-- ADMIN FUNCTIONS FOR USER MANAGEMENT
-- ================================
-- RPC functions for the admin UI to safely manage users

-- Function to get all users with their roles (admin only)
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
  id UUID,
  email TEXT,
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

-- Function to update user role (admin only)
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
    updated_at = timezone('utc'::text, now());
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to get admin stats (admin only)
CREATE OR REPLACE FUNCTION get_admin_stats()
RETURNS JSON SECURITY DEFINER AS $$
DECLARE
  result JSON;
BEGIN
  -- Check if current user is admin
  IF NOT is_user_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;
  
  SELECT json_build_object(
    'total_users', COUNT(*),
    'admin_users', COUNT(*) FILTER (WHERE COALESCE(ur.role, 'user') = 'admin'),
    'regular_users', COUNT(*) FILTER (WHERE COALESCE(ur.role, 'user') = 'user'),
    'migrated_users', COUNT(*) FILTER (WHERE ur.role IS NOT NULL)
  )
  INTO result
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions to authenticated users (RLS handles admin check)
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_role_admin(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_admin_stats() TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_all_users_with_roles() IS 'Admin-only function to get all users with their roles';
COMMENT ON FUNCTION update_user_role_admin(UUID, TEXT) IS 'Admin-only function to update user roles';
COMMENT ON FUNCTION get_admin_stats() IS 'Admin-only function to get user statistics'; 