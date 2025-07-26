-- COMPLETE FUNNEL CLEANUP SCRIPT
-- This removes ALL funnel-related database elements to start fresh

-- ======================================
-- 1. DROP ALL TRIGGERS
-- ======================================
DROP TRIGGER IF EXISTS trg_track_lead_status_change ON leads;
DROP TRIGGER IF EXISTS lead_status_change_trigger ON leads;

-- ======================================
-- 2. DROP ALL FUNCTIONS
-- ======================================
DROP FUNCTION IF EXISTS track_lead_status_change();
DROP FUNCTION IF EXISTS get_funnel_metrics(DATE, DATE);
DROP FUNCTION IF EXISTS get_funnel_metrics();

-- ======================================
-- 3. DROP ALL VIEWS
-- ======================================
DROP VIEW IF EXISTS lead_conversion_funnel;

-- ======================================
-- 4. DROP ALL TABLES
-- ======================================
DROP TABLE IF EXISTS lead_status_history CASCADE;

-- ======================================
-- 5. CLEAN UP ANY REMAINING REFERENCES
-- ======================================
-- Remove any columns that might have been added for funnel tracking
-- (Uncomment if these columns exist and you want to remove them)
-- ALTER TABLE leads DROP COLUMN IF EXISTS funnel_stage;
-- ALTER TABLE leads DROP COLUMN IF EXISTS stage_entered_at;

-- ======================================
-- 6. VERIFICATION QUERIES
-- ======================================
-- Check that everything is cleaned up
SELECT 'CLEANUP VERIFICATION' as info;

-- Check for remaining triggers
SELECT 'Remaining Triggers' as check_type, trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE '%lead%' OR trigger_name LIKE '%funnel%' OR trigger_name LIKE '%status%';

-- Check for remaining functions
SELECT 'Remaining Functions' as check_type, routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%lead%' OR routine_name LIKE '%funnel%' OR routine_name LIKE '%status%';

-- Check for remaining views
SELECT 'Remaining Views' as check_type, table_name
FROM information_schema.views 
WHERE table_name LIKE '%lead%' OR table_name LIKE '%funnel%' OR table_name LIKE '%conversion%';

-- Check for remaining tables
SELECT 'Remaining Tables' as check_type, table_name
FROM information_schema.tables 
WHERE table_name LIKE '%lead_status%' OR table_name LIKE '%funnel%' OR table_name LIKE '%conversion%';

SELECT 'FUNNEL CLEANUP COMPLETE - All funnel elements removed' as final_status; 