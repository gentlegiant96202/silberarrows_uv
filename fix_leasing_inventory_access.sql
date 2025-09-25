-- Fix leasing_inventory table access issues
-- This should resolve the "Error loading inventory" issue

-- Step 1: Check if table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_name = 'leasing_inventory'
) as table_exists;

-- Step 2: Check current RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'leasing_inventory';

-- Step 3: Fix RLS policies
-- Drop any problematic existing policies
DROP POLICY IF EXISTS "Enable all operations for authenticated users" ON leasing_inventory;
DROP POLICY IF EXISTS "Enable read access for all users" ON leasing_inventory;
DROP POLICY IF EXISTS "Users can view all leasing inventory" ON leasing_inventory;

-- Step 4: Create a working RLS policy
CREATE POLICY "Enable all operations for authenticated users" ON leasing_inventory
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Step 5: Ensure RLS is enabled
ALTER TABLE leasing_inventory ENABLE ROW LEVEL SECURITY;

-- Step 6: Test basic access
SELECT COUNT(*) as total_vehicles FROM leasing_inventory;

-- Step 7: Show sample data to verify structure
SELECT 
    stock_number,
    make,
    COALESCE(vehicle_model, model_family, 'Unknown Model') as model,
    model_year,
    status
FROM leasing_inventory 
LIMIT 3;

-- Step 8: Check auth context
SELECT 
    current_user as current_user,
    session_user as session_user,
    auth.uid() as auth_uid,
    auth.role() as auth_role;

-- Success message
SELECT 'Leasing inventory access should now be fixed!' as result;
