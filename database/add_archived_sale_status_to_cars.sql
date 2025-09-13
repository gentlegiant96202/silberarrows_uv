-- ⚠️  IMPORTANT: This migration must be run in TWO separate steps
-- due to PostgreSQL enum transaction requirements

-- ==================================================
-- STEP 1: Add enum value (run this first, then commit)
-- ==================================================

-- Migration: Add 'archived' sale_status to cars table for inventory kanban archive functionality
-- Cars use sale_status enum field for sold/returned/archived states

ALTER TYPE car_sale_status ADD VALUE 'archived';

-- ⚠️  CLICK "RUN" BUTTON NOW TO COMMIT THIS STEP
-- Then proceed to Step 2 below

-- ==================================================
-- STEP 2: Update everything else (run after Step 1)
-- ==================================================

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