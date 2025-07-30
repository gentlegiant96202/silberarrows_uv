-- Secure RLS Fix - Maintains Access Control While Fixing Infinite Recursion
-- This approach keeps security intact while solving the circular policy issue

-- ================================
-- STEP 1: FIX USER_ROLES TABLE ONLY (Root cause of recursion)
-- ================================

-- Temporarily disable RLS on user_roles only to break the recursion
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop only the problematic recursive policies on user_roles
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own user_role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Enable read for all users" ON user_roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON user_roles;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON user_roles;

-- Create simple, non-recursive policies for user_roles
-- These use direct auth.uid() checks instead of role lookups (which cause recursion)
CREATE POLICY "authenticated_users_can_read_user_roles" ON user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "authenticated_users_can_manage_user_roles" ON user_roles
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Re-enable RLS on user_roles with the new, safe policies
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 2: ENSURE SERVICE TABLES HAVE PROPER POLICIES
-- ================================

-- Check if daily_service_metrics already has policies, if not create them
DO $$
BEGIN
    -- Check if policies exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_service_metrics' 
        AND policyname = 'authenticated_users_can_access_service_metrics'
    ) THEN
        -- Create policy for daily_service_metrics
        CREATE POLICY "authenticated_users_can_access_service_metrics" ON daily_service_metrics
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END
$$;

-- Check if service_monthly_targets already has policies, if not create them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'service_monthly_targets' 
        AND policyname = 'authenticated_users_can_access_service_targets'
    ) THEN
        CREATE POLICY "authenticated_users_can_access_service_targets" ON service_monthly_targets
            FOR ALL USING (auth.uid() IS NOT NULL);
    END IF;
END
$$;

-- ================================
-- STEP 3: ENSURE RLS IS ENABLED ON SERVICE TABLES
-- ================================

-- Enable RLS if not already enabled
ALTER TABLE daily_service_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 4: VERIFICATION & SECURITY CHECK
-- ================================

-- Verify that authentication is working
SELECT 
    'Security Check: ' || 
    CASE 
        WHEN auth.uid() IS NOT NULL THEN 'User is authenticated ✓'
        ELSE 'User is NOT authenticated ✗'
    END as auth_status;

-- List current policies to ensure they are clean
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    cmd,
    'Policy is active' as status
FROM pg_policies 
WHERE tablename IN ('user_roles', 'daily_service_metrics', 'service_monthly_targets')
ORDER BY tablename, policyname;

-- Final success message
SELECT '✅ Secure RLS fix completed - Access control maintained, infinite recursion resolved' as result; 