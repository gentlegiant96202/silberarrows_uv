-- =====================================================
-- FIX LEASING RLS POLICY
-- =====================================================
-- This fixes the 400 error by updating the RLS policy to use proper Supabase auth

-- Step 1: Drop the existing policy
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON leasing_customers;

-- Step 2: Create a proper Supabase RLS policy
CREATE POLICY "Enable all operations for authenticated users" ON leasing_customers
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 3: Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'leasing_customers';

-- =====================================================
-- ALTERNATIVE: TEMPORARILY DISABLE RLS FOR TESTING
-- =====================================================
-- If the above doesn't work, you can temporarily disable RLS:
-- ALTER TABLE leasing_customers DISABLE ROW LEVEL SECURITY;

-- To re-enable later:
-- ALTER TABLE leasing_customers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================
/*
1. Run this SQL in your Supabase SQL Editor
2. This should fix the 400 error when moving cards
3. The policy now properly checks for authenticated users using auth.uid()
4. Test drag & drop after running this
*/
