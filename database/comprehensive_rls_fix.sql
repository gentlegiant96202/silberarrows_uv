-- Comprehensive RLS Fix for Infinite Recursion Issue
-- This script completely resets all RLS policies to simple, non-recursive ones

-- ================================
-- STEP 1: DISABLE ALL RLS TEMPORARILY
-- ================================
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE daily_service_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 2: DROP ALL EXISTING POLICIES
-- ================================

-- Drop user_roles policies
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

-- Drop daily_service_metrics policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON daily_service_metrics;

-- Drop service_monthly_targets policies
DROP POLICY IF EXISTS "Enable read for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON service_monthly_targets;

-- Drop other table policies
DROP POLICY IF EXISTS "Enable read access for all users" ON modules;
DROP POLICY IF EXISTS "Enable read access for all users" ON role_permissions;

-- ================================
-- STEP 3: CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ================================

-- User roles - Allow all authenticated users to read/write
CREATE POLICY "user_roles_read_all" ON user_roles
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_insert_all" ON user_roles
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_update_all" ON user_roles
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "user_roles_delete_all" ON user_roles
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Daily service metrics - Allow all authenticated users
CREATE POLICY "service_metrics_read_all" ON daily_service_metrics
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_metrics_insert_all" ON daily_service_metrics
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_metrics_update_all" ON daily_service_metrics
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_metrics_delete_all" ON daily_service_metrics
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Service monthly targets - Allow all authenticated users
CREATE POLICY "service_targets_read_all" ON service_monthly_targets
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_targets_insert_all" ON service_monthly_targets
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "service_targets_update_all" ON service_monthly_targets
    FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "service_targets_delete_all" ON service_monthly_targets
    FOR DELETE USING (auth.uid() IS NOT NULL);

-- Modules table - Read only for authenticated users
CREATE POLICY "modules_read_all" ON modules
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Role permissions table - Read only for authenticated users
CREATE POLICY "role_permissions_read_all" ON role_permissions
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- ================================
-- STEP 4: RE-ENABLE RLS WITH NEW POLICIES
-- ================================
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_service_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 5: VERIFICATION
-- ================================
SELECT 'RLS policies have been completely reset with simple, non-recursive policies' as status;

-- List all policies to verify they are clean
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'daily_service_metrics', 'service_monthly_targets', 'modules', 'role_permissions')
ORDER BY tablename, policyname; 