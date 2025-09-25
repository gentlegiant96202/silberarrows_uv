-- =====================================================
-- ADD CONTRACT FIELDS TO EXISTING LEASING CUSTOMERS TABLE
-- =====================================================
-- For databases that already have leasing_customers table but missing contract fields

-- Add missing contract-related fields (safe to run multiple times)
ALTER TABLE leasing_customers
ADD COLUMN IF NOT EXISTS selected_vehicle_id UUID,
ADD COLUMN IF NOT EXISTS monthly_payment DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS lease_term_months INTEGER,
ADD COLUMN IF NOT EXISTS lease_start_date DATE,
ADD COLUMN IF NOT EXISTS lease_end_date DATE,
ADD COLUMN IF NOT EXISTS lease_to_own_option BOOLEAN DEFAULT FALSE;

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
To run this migration on existing database:
1. Execute this SQL file in your Supabase dashboard
2. All missing contract fields will be added to existing table
3. Existing data will remain intact
4. New fields will be NULL by default

To check if fields exist:
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name IN ('selected_vehicle_id', 'monthly_payment', 'security_deposit', 'lease_term_months', 'lease_start_date', 'lease_end_date', 'lease_to_own_option')
ORDER BY ordinal_position;
*/
