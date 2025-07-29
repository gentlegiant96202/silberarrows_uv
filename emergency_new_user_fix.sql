-- ===================================================
-- EMERGENCY FIX: Make New Users Visible to Admins
-- ===================================================
-- Run this in Supabase SQL Editor to immediately fix the issue

BEGIN;

-- STEP 1: Diagnostic - Show current state
SELECT 'DIAGNOSTIC: Current State' as step;

-- Show users in auth.users but NOT in user_roles (these are the "invisible" users)
SELECT 
    'Missing user_roles entries:' as issue,
    u.id,
    u.email,
    u.created_at as signup_date
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL
ORDER BY u.created_at DESC;

-- Show current user_roles entries
SELECT 
    'Existing user_roles:' as current_state,
    ur.user_id,
    u.email,
    ur.role,
    ur.created_at
FROM user_roles ur
JOIN auth.users u ON ur.user_id = u.id
ORDER BY ur.created_at DESC;

-- STEP 2: Create missing user_roles entries for all users without them
SELECT 'STEP 2: Creating missing user_roles entries' as step;

-- Insert user_roles entries for any auth.users that don't have them
INSERT INTO user_roles (user_id, role, created_at, updated_at)
SELECT 
    u.id,
    'user' as role,  -- Default role for new users
    NOW(),
    NOW()
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.user_id IS NULL;

-- Show how many entries were created
SELECT 
    'Created entries for missing users:' as result,
    COUNT(*) as entries_created
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
WHERE ur.created_at >= NOW() - INTERVAL '1 minute';

-- STEP 3: Ensure current user is admin (so you can manage others)
SELECT 'STEP 3: Ensuring current user has admin access' as step;

-- Make sure the current user (you) is admin
INSERT INTO user_roles (user_id, role, created_at, updated_at)
VALUES (auth.uid(), 'admin', NOW(), NOW())
ON CONFLICT (user_id) 
DO UPDATE SET 
    role = 'admin',
    updated_at = NOW();

-- STEP 4: Temporarily simplify RLS policies for immediate access
SELECT 'STEP 4: Simplifying RLS policies for emergency access' as step;

-- Temporarily disable RLS to ensure immediate access
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop potentially problematic policies
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Users can update own role" ON user_roles; 
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
DROP POLICY IF EXISTS "Users can insert own role" ON user_roles;

-- Re-enable RLS with simple, working policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Create simple admin policy that works
CREATE POLICY "Emergency: Admins can do everything" ON user_roles
    FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            WHERE ur.user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Create policy for users to see their own role
CREATE POLICY "Emergency: Users can view own role" ON user_roles
    FOR SELECT 
    USING (user_id = auth.uid());

-- STEP 5: Final verification
SELECT 'STEP 5: Final Verification' as step;

-- Test the admin function that the UI uses
SELECT 'Testing get_all_users_with_roles function:' as test;

-- Call the actual function the admin UI uses
SELECT * FROM get_all_users_with_roles() ORDER BY created_at DESC;

-- Show current user's admin status
SELECT 
    'Current user admin status:' as verification,
    auth.uid() as current_user_id,
    is_user_admin(auth.uid()) as is_admin,
    (SELECT role FROM user_roles WHERE user_id = auth.uid()) as db_role;

-- Show total counts
SELECT 
    'Final counts:' as summary,
    COUNT(*) as total_users_in_auth,
    (SELECT COUNT(*) FROM user_roles) as total_users_with_roles,
    (SELECT COUNT(*) FROM user_roles WHERE role = 'admin') as admin_users,
    (SELECT COUNT(*) FROM user_roles WHERE role = 'user') as regular_users
FROM auth.users;

COMMIT;

-- Success message
SELECT 
    '✅ EMERGENCY FIX COMPLETE!' as status,
    'All users should now be visible in admin settings' as message,
    'You can now assign proper roles to new users' as next_action; 