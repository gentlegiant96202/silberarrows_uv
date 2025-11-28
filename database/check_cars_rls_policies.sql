-- Check current RLS policies on cars and car_media tables
-- Run this FIRST before making any changes

-- 1. Check if RLS is enabled on these tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('cars', 'car_media')
ORDER BY tablename;

-- 2. List all existing policies on cars table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'cars'
ORDER BY policyname;

-- 3. List all existing policies on car_media table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual as using_expression,
  with_check
FROM pg_policies 
WHERE tablename = 'car_media'
ORDER BY policyname;

-- 4. Test: Can anon role see any cars?
-- (This shows what an anonymous user would see)
SELECT COUNT(*) as total_cars,
       COUNT(CASE WHEN status = 'inventory' AND sale_status = 'available' THEN 1 END) as available_inventory
FROM cars;

-- 5. Test: Can we see car_media for available cars?
SELECT COUNT(*) as total_media
FROM car_media
WHERE car_id IN (
  SELECT id FROM cars 
  WHERE status = 'inventory' 
  AND sale_status = 'available'
);

