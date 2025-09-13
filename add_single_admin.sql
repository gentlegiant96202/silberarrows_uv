-- Script to add a user as admin in your app's role system
-- Replace 'user@example.com' with the actual email address

-- Insert or update user role in the user_roles table (your app's primary role system)
INSERT INTO user_roles (user_id, role) 
SELECT id, 'admin'
FROM auth.users 
WHERE email = 'user@example.com'
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin',
    updated_at = NOW();

-- Also update the auth metadata for legacy compatibility
UPDATE auth.users 
SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'),
    '{role}',
    '"admin"'
)
WHERE email = 'user@example.com';

-- Verify the changes
SELECT 
    u.email,
    ur.role as database_role,
    u.raw_user_meta_data->>'role' as metadata_role,
    ur.created_at as role_created_at,
    ur.updated_at as role_updated_at,
    'Admin role assigned successfully' as status
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'user@example.com';
