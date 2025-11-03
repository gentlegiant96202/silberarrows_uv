-- Fix leasing_inventory table to allow public read access for showroom page
-- This will allow unauthenticated users to view vehicles in the public showroom

-- Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- Drop existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON leasing_inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON leasing_inventory;
DROP POLICY IF EXISTS "Public read access for showroom" ON leasing_inventory;

-- Create policy for authenticated users (full access)
CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL 
    USING (auth.uid() IS NOT NULL);

-- Create policy for public users (read-only access)
CREATE POLICY "Public read access for showroom" ON leasing_inventory
    FOR SELECT
    USING (true);

-- Ensure RLS is enabled
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

-- Verify policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- Test query (should work for both authenticated and unauthenticated users)
SELECT 
    stock_number,
    make,
    COALESCE(vehicle_model, model_family) as model,
    model_year,
    status,
    monthly_lease_rate
FROM leasing_inventory 
WHERE status = 'inventory'
LIMIT 5;

-- Success message
SELECT '✅ Public read access enabled for showroom! Vehicles should now be visible without login.' as result;

