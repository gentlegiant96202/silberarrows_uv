-- Drop ALL policies on vehicle_reservations table
-- Run this first if you're getting "policy already exists" errors

DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'vehicle_reservations' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON vehicle_reservations', r.policyname);
        RAISE NOTICE 'Dropped policy: %', r.policyname;
    END LOOP;
END $$;

-- Show remaining policies (should be none)
SELECT 'Remaining policies:' as info;
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'vehicle_reservations' 
AND schemaname = 'public';

SELECT 'All policies dropped! Now run fix_vehicle_reservations_rls_complete.sql' as next_step;

