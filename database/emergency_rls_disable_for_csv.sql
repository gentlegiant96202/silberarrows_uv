-- EMERGENCY: Disable RLS for CSV Import
-- This script temporarily disables RLS on service tables to allow CSV import
-- We'll re-enable with proper policies afterward

-- ================================
-- STEP 1: DISABLE RLS ON ALL RELATED TABLES
-- ================================

-- Disable RLS on the main problem table
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Disable RLS on service tables to break any chain
ALTER TABLE daily_service_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets DISABLE ROW LEVEL SECURITY;

-- Disable RLS on other related tables that might be in the chain
ALTER TABLE modules DISABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions DISABLE ROW LEVEL SECURITY;

-- ================================
-- STEP 2: DROP ALL PROBLEMATIC POLICIES
-- ================================

-- Drop ALL policies on user_roles (the source of recursion)
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON user_roles';
    END LOOP;
END $$;

-- Drop ALL policies on daily_service_metrics
DO $$ 
DECLARE 
    pol record;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'daily_service_metrics'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(pol.policyname) || ' ON daily_service_metrics';
    END LOOP;
END $$;

-- ================================
-- STEP 3: VERIFY NO POLICIES EXIST
-- ================================

-- Check that no policies remain on problematic tables
SELECT 
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('user_roles', 'daily_service_metrics', 'service_monthly_targets')
ORDER BY tablename, policyname;

-- ================================
-- STEP 4: TEST DATABASE ACCESS
-- ================================

-- Test that we can now access the tables without recursion
SELECT 'Testing user_roles access...' as test;
SELECT COUNT(*) as user_roles_count FROM user_roles;

SELECT 'Testing daily_service_metrics access...' as test;
SELECT COUNT(*) as daily_service_metrics_count FROM daily_service_metrics;

SELECT 'Emergency RLS disable completed successfully!' as message; 