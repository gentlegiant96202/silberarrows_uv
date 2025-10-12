-- =====================================================
-- INVESTIGATE MISSING VEHICLE INVENTORY CARD
-- =====================================================
-- This script helps investigate if a vehicle was deleted or archived
-- Run these queries to find traces of the missing vehicle

-- =====================================================
-- STEP 1: CHECK IF CAR WAS ARCHIVED INSTEAD OF DELETED
-- =====================================================
-- Check if the car was moved to "archived" status instead of being deleted
-- Replace 'STOCK_NUMBER' with the actual stock number

SELECT 
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    archived_at,
    customer_name,
    created_at,
    updated_at
FROM cars
WHERE stock_number = 'STOCK_NUMBER'  -- Replace with actual stock number
   OR sale_status = 'archived';

-- If you don't know the stock number, search by other criteria:
-- SELECT * FROM cars WHERE vehicle_model ILIKE '%SEARCH_TERM%' AND sale_status = 'archived';


-- =====================================================
-- STEP 2: CHECK UV CATALOG FOR TRACES
-- =====================================================
-- The uv_catalog table might still have a reference if the car was in the catalog

SELECT 
    uc.id,
    uc.car_id,
    uc.title,
    uc.status,
    uc.created_at,
    uc.updated_at
FROM uv_catalog uc
LEFT JOIN cars c ON uc.car_id = c.id
WHERE c.id IS NULL  -- Cars that no longer exist
ORDER BY uc.updated_at DESC
LIMIT 20;


-- =====================================================
-- STEP 3: CHECK CAR_MEDIA TABLE FOR ORPHANED MEDIA
-- =====================================================
-- If the car was deleted, media files might still exist (orphaned)

SELECT 
    cm.id,
    cm.car_id,
    cm.url,
    cm.kind,
    cm.filename,
    cm.created_at
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Media with no associated car (deleted cars)
ORDER BY cm.created_at DESC
LIMIT 50;


-- =====================================================
-- STEP 4: CHECK LEADS TABLE FOR CUSTOMER REFERENCES
-- =====================================================
-- If a customer was associated with the car, leads table might have traces

SELECT 
    id,
    full_name,
    phone_number,
    model_of_interest,
    status,
    created_at,
    updated_at
FROM leads
WHERE model_of_interest ILIKE '%STOCK_NUMBER%'  -- Replace with stock number
   OR model_of_interest ILIKE '%MODEL_NAME%'     -- Or search by model
ORDER BY updated_at DESC
LIMIT 20;


-- =====================================================
-- STEP 5: CHECK RECENT CARS BY UPDATED_AT
-- =====================================================
-- See recently modified/deleted cars (this shows recent activity)

SELECT 
    id,
    stock_number,
    vehicle_model,
    model_year,
    status,
    sale_status,
    customer_name,
    created_at,
    updated_at
FROM cars
ORDER BY updated_at DESC
LIMIT 30;


-- =====================================================
-- STEP 6: CHECK SUPABASE REALTIME LOGS (If Available)
-- =====================================================
-- Note: This requires Supabase logging to be enabled
-- You can check in Supabase Dashboard > Logs > Database

-- Look for DELETE operations on the cars table in the Supabase Dashboard


-- =====================================================
-- STEP 7: CHECK FOR RECENTLY ARCHIVED CARS
-- =====================================================
-- Show all archived cars from the last 30 days

SELECT 
    id,
    stock_number,
    vehicle_model,
    model_year,
    sale_status,
    archived_at,
    customer_name,
    updated_at
FROM cars
WHERE sale_status = 'archived'
  AND archived_at >= NOW() - INTERVAL '30 days'
ORDER BY archived_at DESC;


-- =====================================================
-- STEP 8: SEARCH BY PARTIAL INFORMATION
-- =====================================================
-- If you remember partial details about the car

-- By model:
-- SELECT * FROM cars WHERE vehicle_model ILIKE '%MODEL_NAME%';

-- By color:
-- SELECT * FROM cars WHERE colour ILIKE '%COLOR%';

-- By customer name:
-- SELECT * FROM cars WHERE customer_name ILIKE '%CUSTOMER_NAME%';

-- By year and model:
-- SELECT * FROM cars WHERE model_year = 2024 AND vehicle_model ILIKE '%MODEL%';


-- =====================================================
-- RECOMMENDATIONS FOR FUTURE PROTECTION
-- =====================================================

/*
CURRENT SITUATION:
- Your system uses HARD DELETE (permanent deletion)
- No audit trail or deleted_at timestamp for cars
- No automatic backup of deleted records

RECOMMENDATIONS:

1. **Enable Supabase Point-in-Time Recovery (PITR)**
   - Go to Supabase Dashboard > Database > Backups
   - Enable PITR (available on Pro plan)
   - This allows you to restore the database to any point in time

2. **Add Soft Delete (Recommended)**
   - Add a `deleted_at` timestamp column
   - Modify delete operations to set timestamp instead of deleting
   - Filter queries to exclude deleted records

3. **Create an Audit Log Table**
   - Track all deletions with: who, when, what
   - Automatically log before deletion

4. **Enable Database Triggers for Deletion Logging**
   - Create a trigger that logs deletions to an audit table

Would you like me to implement any of these protective measures?
*/


-- =====================================================
-- ALTERNATIVE: CHECK SUPABASE DASHBOARD
-- =====================================================

/*
TO CHECK IN SUPABASE DASHBOARD:

1. Go to: https://app.supabase.com
2. Select your project
3. Go to: Database > Logs
4. Filter by:
   - Table: cars
   - Operation: DELETE
   - Time range: Last 24 hours (or appropriate range)

This will show you DELETE operations if logging is enabled.
*/

