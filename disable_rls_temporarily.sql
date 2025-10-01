-- Temporarily disable RLS to test real-time
-- This will help us determine if RLS is blocking real-time events

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'consignments';

-- 2. Temporarily disable RLS
ALTER TABLE consignments DISABLE ROW LEVEL SECURITY;

-- 3. Verify RLS is disabled
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'consignments';

-- 4. Test insert with RLS disabled
INSERT INTO consignments (vehicle_model, asking_price, phone_number, listing_url, notes, status)
VALUES ('RLS Disabled Test', 88888, '6666666666', 'https://rls-disabled-test.com', 'RLS disabled test', 'new_lead');

-- 5. Re-enable RLS after testing
-- ALTER TABLE consignments ENABLE ROW LEVEL SECURITY;
