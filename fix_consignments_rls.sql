-- Fix RLS for consignments table
-- This allows authenticated users to see consignments created by the extension

BEGIN;

-- Check current RLS status
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'consignments';

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable read access for all users" ON consignments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON consignments;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON consignments;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON consignments;
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON consignments;
DROP POLICY IF EXISTS "simple_consignments_access" ON consignments;

-- Create simple policy for consignments table
CREATE POLICY "simple_consignments_access" ON consignments
    FOR ALL USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Ensure RLS is enabled
ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verification
SELECT 'Consignments RLS policy created - extension data should now be visible' as status;
