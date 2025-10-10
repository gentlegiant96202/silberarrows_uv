-- Fix Admin UI to Show ALL Users (Including New Users Without Roles)
-- This ensures admins can see and assign roles to newly signed up users

-- Update get_all_users_with_roles to show ALL users from auth.users
-- Users without assigned roles will show role as NULL
CREATE OR REPLACE FUNCTION get_all_users_with_roles()
RETURNS TABLE(
  id UUID,
  email TEXT,
  role TEXT,
  created_at TIMESTAMPTZ
) SECURITY DEFINER AS $$
BEGIN
  -- Return ALL users from auth.users (not just those with roles)
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    ur.role,  -- Will be NULL if user has no role assigned
    u.created_at
  FROM auth.users u
  LEFT JOIN user_roles ur ON u.id = ur.user_id
  WHERE u.email_confirmed_at IS NOT NULL  -- Only show confirmed users
  ORDER BY u.created_at DESC;  -- Newest users first
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_all_users_with_roles() TO authenticated;

-- Verification
SELECT 'Admin function updated - all users (including unassigned) will now appear in admin UI!' as status;

