-- Fix RLS policy for leasing_inventory table
-- This should resolve the 400 error when fetching inventory

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- Drop any existing policies that might be causing issues
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON leasing_inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON leasing_inventory;
DROP POLICY IF EXISTS "Users can view all leasing inventory" ON leasing_inventory;

-- Create a simple policy that allows authenticated users to read all records
CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: If the above doesn't work, try this more permissive policy
-- CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
--     FOR ALL USING (true);

-- Check that RLS is enabled
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

-- Test the policy by checking if we can read data
SELECT COUNT(*) as total_cars FROM leasing_inventory;

-- Show current user context
SELECT 
    current_user as current_user,
    session_user as session_user,
    auth.uid() as auth_uid,
    auth.role() as auth_role;

-- Show the cars in the table (using flexible column selection)
SELECT stock_number FROM leasing_inventory LIMIT 5;
