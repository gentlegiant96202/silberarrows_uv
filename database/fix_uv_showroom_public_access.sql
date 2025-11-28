-- Fix UV Showroom Public Access
-- Allow anonymous users to view available inventory cars and their media

-- 1. Add policy for public SELECT on cars table (only available inventory)
DROP POLICY IF EXISTS "Public can view available inventory cars" ON cars;
CREATE POLICY "Public can view available inventory cars"
ON cars
FOR SELECT
TO anon, authenticated
USING (
  status = 'inventory' 
  AND sale_status = 'available'
);

-- 2. Add policy for public SELECT on car_media table (for available inventory cars)
DROP POLICY IF EXISTS "Public can view media for available cars" ON car_media;
CREATE POLICY "Public can view media for available cars"
ON car_media
FOR SELECT
TO anon, authenticated
USING (
  car_id IN (
    SELECT id FROM cars 
    WHERE status = 'inventory' 
    AND sale_status = 'available'
  )
);

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('cars', 'car_media')
ORDER BY tablename, policyname;

