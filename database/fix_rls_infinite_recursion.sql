-- Fix RLS Infinite Recursion Issue
-- This script diagnoses and fixes the infinite recursion in user_roles RLS policies

-- Step 1: Temporarily disable RLS on user_roles to break the recursion
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on user_roles to start fresh
DROP POLICY IF EXISTS "Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view own user_role" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all user_roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON user_roles;
DROP POLICY IF EXISTS "Users can read own role" ON user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON user_roles;

-- Step 3: Create simple, non-recursive policies
CREATE POLICY "Enable read for all users" ON user_roles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users" ON user_roles
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update for authenticated users" ON user_roles
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Step 4: Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Step 5: Check if daily_service_metrics table has proper RLS
-- Disable RLS temporarily on daily_service_metrics if it's causing issues
ALTER TABLE daily_service_metrics DISABLE ROW LEVEL SECURITY;

-- Create simple policies for daily_service_metrics
DROP POLICY IF EXISTS "Enable read for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON daily_service_metrics;

CREATE POLICY "Enable all operations for authenticated users" ON daily_service_metrics
    FOR ALL USING (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE daily_service_metrics ENABLE ROW LEVEL SECURITY;

-- Step 6: Check service_monthly_targets table
ALTER TABLE service_monthly_targets DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON service_monthly_targets;

CREATE POLICY "Enable all operations for authenticated users" ON service_monthly_targets
    FOR ALL USING (auth.role() = 'authenticated');

ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;

-- Step 7: Verify the fix
SELECT 'RLS policies have been reset and simplified' as status;

-- Optional: List current policies to verify
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('user_roles', 'daily_service_metrics', 'service_monthly_targets')
ORDER BY tablename, policyname; 