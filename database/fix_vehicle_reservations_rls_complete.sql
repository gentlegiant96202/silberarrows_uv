-- Complete Fix for Vehicle Reservations RLS Policies
-- This drops ALL existing policies and creates new simplified ones

-- Step 1: Drop ALL existing policies on vehicle_reservations
DROP POLICY IF EXISTS "Users can insert vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can view vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can update vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can delete vehicle reservations for their leads" ON vehicle_reservations;

-- Drop any policies that might have different names
DROP POLICY IF EXISTS "simple_vehicle_reservations_access" ON vehicle_reservations;
DROP POLICY IF EXISTS "authenticated_users_vehicle_reservations" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can insert reservations" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can view reservations" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can update reservations" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can delete reservations" ON vehicle_reservations;

-- Step 2: List all remaining policies (for debugging)
SELECT 'Remaining policies before recreation:' as debug;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'vehicle_reservations' 
AND schemaname = 'public';

-- Step 3: Create new simplified policies
-- These policies use the same pattern as other tables in your app (leads, consignments, etc.)

-- Policy: Allow authenticated users to insert reservations for valid leads
CREATE POLICY "Users can insert vehicle reservations for their leads" ON vehicle_reservations
    FOR INSERT 
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
        )
    );

-- Policy: Allow authenticated users to view reservations for valid leads
CREATE POLICY "Users can view vehicle reservations for their leads" ON vehicle_reservations
    FOR SELECT 
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
        )
    );

-- Policy: Allow authenticated users to update reservations for valid leads
CREATE POLICY "Users can update vehicle reservations for their leads" ON vehicle_reservations
    FOR UPDATE 
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
        )
    )
    WITH CHECK (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
        )
    );

-- Policy: Allow authenticated users to delete reservations for valid leads
CREATE POLICY "Users can delete vehicle reservations for their leads" ON vehicle_reservations
    FOR DELETE 
    USING (
        auth.role() = 'authenticated'
        AND EXISTS (
            SELECT 1 FROM leads 
            WHERE leads.id = vehicle_reservations.lead_id
        )
    );

-- Step 4: Verification
SELECT 'Vehicle reservations RLS policies updated successfully!' as status;
SELECT 'Access: All authenticated users can manage reservations for valid leads' as info;

-- Show final policies
SELECT 'Final policies created:' as debug;
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'vehicle_reservations' 
AND schemaname = 'public';

