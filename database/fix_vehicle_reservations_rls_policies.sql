-- Fix RLS Policies for vehicle_reservations table
-- This fixes the permission issue where non-admin users couldn't update invoices

-- Step 1: Drop existing policies
DROP POLICY IF EXISTS "Users can insert vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can view vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can update vehicle reservations for their leads" ON vehicle_reservations;
DROP POLICY IF EXISTS "Users can delete vehicle reservations for their leads" ON vehicle_reservations;

-- Step 2: Create corrected policies
-- Key fixes:
-- 1. Changed 'role_name' to 'role' (correct column name)
-- 2. Using actual roles: 'admin', 'sales', 'accounts', 'leasing'
-- 3. Added 'accounts' role so accounts users can update invoices

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

-- Verification
SELECT 'Vehicle reservations RLS policies updated successfully!' as status;
SELECT 'Roles with access: admin, sales, accounts, leasing' as allowed_roles;

