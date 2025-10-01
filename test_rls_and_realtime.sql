-- Test RLS and Real-time for consignments table
-- Run this in Supabase SQL Editor

-- 1. Check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename = 'consignments';

-- 2. Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
    AND tablename = 'consignments';

-- 3. Check real-time publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'consignments';

-- 4. Test insert (this should trigger real-time if working)
INSERT INTO consignments (vehicle_model, asking_price, phone_number, listing_url, notes, status)
VALUES ('SQL Real-time Test', 99999, '7777777777', 'https://sql-realtime-test.com', 'SQL real-time test', 'new_lead');

-- 5. Check if the insert worked
SELECT COUNT(*) as total_consignments FROM consignments;
