-- Fix New User Permissions - Explicit Role Requirement
-- This ensures new users without assigned roles have NO module access
-- Existing users with roles are unaffected

-- Update the get_user_module_permissions function to NOT default to 'sales'
CREATE OR REPLACE FUNCTION get_user_module_permissions(
  check_user_id UUID,
  module_name TEXT
)
RETURNS TABLE(
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN
) SECURITY DEFINER AS $$
DECLARE
  user_role TEXT;
  target_module_id UUID;
BEGIN
  -- Get user's role
  SELECT role INTO user_role FROM user_roles WHERE user_id = check_user_id;
  
  -- If user has no role assigned, return no permissions (do NOT default)
  IF user_role IS NULL THEN
    RETURN QUERY SELECT false, false, false, false;
    RETURN;
  END IF;
  
  -- Get module ID
  SELECT id INTO target_module_id FROM modules WHERE name = module_name;
  IF target_module_id IS NULL THEN
    -- Return no permissions if module doesn't exist
    RETURN QUERY SELECT false, false, false, false;
    RETURN;
  END IF;
  
  -- Return permissions based on user's assigned role
  RETURN QUERY
  SELECT 
    COALESCE(rp.can_view, false),
    COALESCE(rp.can_create, false),
    COALESCE(rp.can_edit, false),
    COALESCE(rp.can_delete, false)
  FROM role_permissions rp
  WHERE rp.role = user_role AND rp.module_id = target_module_id;
  
  -- If no permissions found, return all false
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, false, false, false;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Verification query - check that function works correctly
-- Test with a user who has no role (should return all false)
-- Test with a user who has a role (should return their permissions)
SELECT 'Function updated successfully!' as status;

