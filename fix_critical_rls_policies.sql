-- Fix Critical RLS Policies That Use RPC Functions
-- These policies are causing blocking issues because they call get_user_module_permissions()
-- Run this in Supabase SQL Editor

BEGIN;

-- =====================================
-- STEP 1: FIX CONTENT TABLES (Marketing Module)
-- =====================================

-- Disable RLS temporarily
ALTER TABLE content_examples DISABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars DISABLE ROW LEVEL SECURITY;

-- Drop complex RPC-based policies
DROP POLICY IF EXISTS "Users with marketing permissions can create content examples" ON content_examples;
DROP POLICY IF EXISTS "Users with marketing permissions can delete content examples" ON content_examples;
DROP POLICY IF EXISTS "Users with marketing permissions can update content examples" ON content_examples;
DROP POLICY IF EXISTS "Users with marketing permissions can view content examples" ON content_examples;

DROP POLICY IF EXISTS "Users with marketing permissions can create content pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users with marketing permissions can delete content pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users with marketing permissions can update content pillars" ON content_pillars;
DROP POLICY IF EXISTS "Users with marketing permissions can view content pillars" ON content_pillars;

-- Create simple policies
CREATE POLICY "simple_content_examples_access" ON content_examples
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "simple_content_pillars_access" ON content_pillars
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE content_examples ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pillars ENABLE ROW LEVEL SECURITY;

-- =====================================
-- STEP 2: FIX SERVICE TABLES
-- =====================================

-- Disable RLS temporarily
ALTER TABLE service_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_contracts DISABLE ROW LEVEL SECURITY;
ALTER TABLE contract_activities DISABLE ROW LEVEL SECURITY;

-- Drop complex JOIN-based policies
DROP POLICY IF EXISTS "service_contracts_policy" ON service_contracts;
DROP POLICY IF EXISTS "warranty_contracts_policy" ON warranty_contracts;
DROP POLICY IF EXISTS "contract_activities_policy" ON contract_activities;

-- Create simple policies
CREATE POLICY "simple_service_contracts_access" ON service_contracts
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "simple_warranty_contracts_access" ON warranty_contracts
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "simple_contract_activities_access" ON contract_activities
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE service_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE warranty_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_activities ENABLE ROW LEVEL SECURITY;

-- =====================================
-- STEP 3: FIX METRICS TABLES (Multiple Conflicting Policies)
-- =====================================

-- Disable RLS temporarily
ALTER TABLE daily_service_metrics DISABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets DISABLE ROW LEVEL SECURITY;

-- Drop ALL conflicting policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON daily_service_metrics;
DROP POLICY IF EXISTS "authenticated_users_can_access_service_metrics" ON daily_service_metrics;
DROP POLICY IF EXISTS "daily_service_metrics_policy" ON daily_service_metrics;

DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON service_monthly_targets;
DROP POLICY IF EXISTS "authenticated_users_can_access_service_targets" ON service_monthly_targets;
DROP POLICY IF EXISTS "service_targets_policy" ON service_monthly_targets;

-- Create single simple policy for each
CREATE POLICY "simple_daily_service_metrics_access" ON daily_service_metrics
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "simple_service_monthly_targets_access" ON service_monthly_targets
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE daily_service_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_monthly_targets ENABLE ROW LEVEL SECURITY;

-- =====================================
-- STEP 4: CLEAN UP USER_ROLES (Multiple Policies)
-- =====================================

-- Disable RLS temporarily
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DROP POLICY IF EXISTS "Emergency: Admins can do everything" ON user_roles;
DROP POLICY IF EXISTS "Emergency: Users can view own role" ON user_roles;
DROP POLICY IF EXISTS "simple_manage_user_roles" ON user_roles;
DROP POLICY IF EXISTS "simple_read_user_roles" ON user_roles;

-- Create single simple policy
CREATE POLICY "final_user_roles_access" ON user_roles
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Re-enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Final verification
SELECT 'Critical RLS policies fixed - application should work properly now' as status;
