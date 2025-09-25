-- =====================================================
-- DEBUG LEASING UPDATE ISSUE
-- =====================================================
-- This script helps diagnose the 400 error when updating lease_status

-- Step 1: Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'leasing_customers';

-- Step 2: Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, forcerowsecurity
FROM pg_tables 
WHERE tablename = 'leasing_customers';

-- Step 3: Check current user context
SELECT 
    current_user as current_user,
    session_user as session_user,
    auth.uid() as auth_uid,
    auth.role() as auth_role;

-- Step 4: Test a simple select to see if RLS allows access
SELECT id, customer_name, lease_status 
FROM leasing_customers 
LIMIT 3;

-- Step 5: Try a test update (replace with actual ID from your data)
-- UPDATE leasing_customers 
-- SET lease_status = 'appointments', updated_at = NOW()
-- WHERE id = 'YOUR_ACTUAL_CUSTOMER_ID_HERE';

-- Step 6: Check for any triggers that might be interfering
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'leasing_customers';

-- =====================================================
-- POTENTIAL FIXES
-- =====================================================

-- Fix 1: Update RLS policy to use proper Supabase auth check
-- DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON leasing_customers;
-- CREATE POLICY "Enable all operations for authenticated users" ON leasing_customers
--     FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix 2: Temporarily disable RLS for testing
-- ALTER TABLE leasing_customers DISABLE ROW LEVEL SECURITY;

-- Fix 3: Check if the issue is with the enum constraint
-- SELECT constraint_name, constraint_type 
-- FROM information_schema.table_constraints 
-- WHERE table_name = 'leasing_customers';
