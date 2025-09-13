-- Fix function return type mismatch
-- The auth.users.email column is VARCHAR(255), not TEXT

DROP FUNCTION IF EXISTS get_all_users_with_roles();

CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
  id UUID,
  email VARCHAR(255),  -- Changed from TEXT to VARCHAR(255)
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated; 