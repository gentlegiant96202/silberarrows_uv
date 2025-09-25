-- =====================================================
-- ADD PROSPECTS COLUMN TO LEASING CUSTOMERS
-- =====================================================
-- This migration adds 'prospects' as the first status in the leasing workflow

-- Add 'prospects' to the lease_status_enum (as the first option)
ALTER TYPE lease_status_enum ADD VALUE IF NOT EXISTS 'prospects';

-- Update the default status to prospects (optional - can be reverted)
-- ALTER TABLE leasing_customers ALTER COLUMN lease_status SET DEFAULT 'prospects';

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*
To run this migration:
1. Execute this SQL file in your Supabase dashboard
2. Update your frontend code to include 'prospects' status
3. The prospects column will appear as the first column in the leasing kanban

To revert (if needed):
1. Create a new migration to remove 'prospects' from enum
2. Update frontend to remove prospects status
3. Change default back to 'appointments' if desired
*/
