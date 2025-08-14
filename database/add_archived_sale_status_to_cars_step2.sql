-- STEP 2: Add archived_at column and indexes (run this AFTER Step 1 is committed)
-- Copy and paste this into Supabase SQL Editor and run it

-- =============================================
-- ADD ARCHIVED_AT TIMESTAMP COLUMN
-- =============================================
-- Add a timestamp field to track when cars were archived
ALTER TABLE cars ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;

-- =============================================
-- CREATE INDEX FOR ARCHIVED CARS
-- =============================================
-- Create index for performance when filtering archived cars
CREATE INDEX IF NOT EXISTS idx_cars_archived_sale_status ON cars(sale_status) WHERE sale_status = 'archived';
CREATE INDEX IF NOT EXISTS idx_cars_archived_at ON cars(archived_at) WHERE archived_at IS NOT NULL;

-- =============================================
-- VERIFICATION
-- =============================================
-- Verify the new enum value is available
SELECT unnest(enum_range(NULL::car_sale_status)) AS available_sale_statuses;

-- Show current sale_status distribution
SELECT 
    sale_status,
    COUNT(*) as count
FROM cars 
GROUP BY sale_status 
ORDER BY count DESC;

-- Show summary
SELECT 
    'SUCCESS: Archive sale_status added to cars table' as status,
    COUNT(*) as total_cars,
    COUNT(*) FILTER (WHERE sale_status = 'archived') as archived_cars
FROM cars; 