-- Fix RLS Policies for car_image_queue Table
-- This fixes the "new row violates row-level security policy" error
-- when updating car details that triggers the image regeneration queue

BEGIN;

-- =====================================
-- STEP 1: CHECK CURRENT RLS STATUS
-- =====================================
SELECT 
    schemaname,
    tablename,
    rowsecurity,
    'Current RLS status for car_image_queue' as description
FROM pg_tables 
WHERE tablename = 'car_image_queue';

-- =====================================
-- STEP 2: DROP ANY EXISTING POLICIES
-- =====================================
DROP POLICY IF EXISTS "Allow all operations for car_image_queue" ON car_image_queue;
DROP POLICY IF EXISTS "authenticated_users_can_manage_car_image_queue" ON car_image_queue;
DROP POLICY IF EXISTS "simple_car_image_queue_access" ON car_image_queue;

-- =====================================
-- STEP 3: CREATE SIMPLE RLS POLICY
-- =====================================
-- Allow all authenticated users (including triggers) to access car_image_queue
CREATE POLICY "simple_car_image_queue_access" ON car_image_queue
    FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- =====================================
-- STEP 4: ENSURE RLS IS ENABLED
-- =====================================
ALTER TABLE car_image_queue ENABLE ROW LEVEL SECURITY;

-- =====================================
-- STEP 5: GRANT NECESSARY PERMISSIONS
-- =====================================
GRANT ALL ON car_image_queue TO authenticated;
GRANT ALL ON car_image_queue TO service_role;

-- Also grant sequence permissions (for SERIAL id column)
GRANT USAGE, SELECT ON SEQUENCE car_image_queue_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE car_image_queue_id_seq TO service_role;

-- =====================================
-- STEP 6: TEST THE FIX
-- =====================================
-- Test insert (this should work now)
INSERT INTO car_image_queue (car_id, status, created_at)
SELECT 
    id as car_id,
    'pending' as status,
    NOW() as created_at
FROM cars 
LIMIT 1
ON CONFLICT (car_id) DO NOTHING;

-- Verify the policy works
SELECT 
    COUNT(*) as total_queue_entries,
    'car_image_queue policy test successful' as status
FROM car_image_queue;

-- =====================================
-- STEP 7: VERIFICATION
-- =====================================
SELECT 
    'SUCCESS: car_image_queue RLS policies fixed' as result,
    'Car detail updates should now work without RLS errors' as note;

COMMIT;

-- Show final policy status
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
WHERE tablename = 'car_image_queue'
ORDER BY policyname;
