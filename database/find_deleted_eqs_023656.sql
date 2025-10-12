-- =====================================================
-- FIND DELETED EQS - STOCK NUMBER 023656
-- =====================================================
-- This car was hard deleted (not archived)
-- Let's search for any remaining traces

-- =====================================================
-- 1. CHECK FOR ORPHANED MEDIA (PHOTOS/DOCUMENTS)
-- =====================================================
-- This is the most likely place to find traces of deleted cars

SELECT 
    cm.id,
    cm.car_id,
    cm.url,
    cm.kind,
    cm.filename,
    cm.is_primary,
    cm.sort_order,
    cm.created_at,
    -- Try to extract stock number from URL if possible
    CASE 
        WHEN cm.url ILIKE '%023656%' THEN 'MATCH: Contains 023656 in URL'
        ELSE 'Check manually'
    END as url_match
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Media with no associated car (deleted cars)
   OR cm.url ILIKE '%023656%'  -- Direct match in URL
ORDER BY cm.created_at DESC
LIMIT 100;


-- =====================================================
-- 2. CHECK UV CATALOG FOR ORPHANED ENTRIES
-- =====================================================
-- UV catalog might still have a reference

SELECT 
    uc.id,
    uc.car_id,
    uc.title,
    uc.make,
    uc.model,
    uc.year,
    uc.price_aed,
    uc.status,
    uc.created_at,
    uc.updated_at
FROM uv_catalog uc
LEFT JOIN cars c ON uc.car_id = c.id
WHERE c.id IS NULL  -- Catalog entries with deleted cars
   AND (uc.title ILIKE '%023656%' OR uc.model ILIKE '%EQS%')
ORDER BY uc.updated_at DESC
LIMIT 20;


-- =====================================================
-- 3. CHECK LEADS TABLE FOR CUSTOMER ASSOCIATIONS
-- =====================================================
-- Maybe a customer was interested in this specific EQS

SELECT 
    id,
    full_name,
    phone_number,
    model_of_interest,
    status,
    notes,
    created_at,
    updated_at
FROM leads
WHERE model_of_interest ILIKE '%023656%'
   OR model_of_interest ILIKE '%EQS%'
   OR notes::text ILIKE '%023656%'  -- Cast JSONB to text for search
ORDER BY updated_at DESC
LIMIT 20;


-- =====================================================
-- 4. SEARCH ALL ORPHANED MEDIA FOR EQS MODELS
-- =====================================================
-- Look for any EQS media from deleted cars

SELECT 
    cm.id,
    cm.car_id,
    cm.url,
    cm.kind,
    cm.filename,
    cm.created_at,
    SUBSTRING(cm.url FROM 1 FOR 100) as url_preview
FROM car_media cm
LEFT JOIN cars c ON cm.car_id = c.id
WHERE c.id IS NULL  -- Orphaned media
  AND (
    cm.url ILIKE '%eqs%' 
    OR cm.url ILIKE '%023656%'
    OR cm.filename ILIKE '%eqs%'
    OR cm.filename ILIKE '%023656%'
  )
ORDER BY cm.created_at DESC;


-- =====================================================
-- 5. CHECK IF VEHICLE STILL EXISTS (JUST IN CASE)
-- =====================================================
-- Double check it's not still in the database

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
WHERE stock_number = '023656'
   OR stock_number ILIKE '%023656%';


-- =====================================================
-- 6. SEARCH FOR SIMILAR EQS VEHICLES
-- =====================================================
-- Find other EQS vehicles for reference

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
WHERE vehicle_model ILIKE '%EQS%'
ORDER BY created_at DESC
LIMIT 10;


-- =====================================================
-- RESULTS INTERPRETATION
-- =====================================================

/*
IF QUERY 1 RETURNS RESULTS (Orphaned Media):
- You found traces! The car_id will show you the deleted vehicle's UUID
- The URLs will show you the photos that were attached to this car
- You can use the car_id to search other tables

IF QUERY 2 RETURNS RESULTS (UV Catalog):
- The catalog entry still exists
- You can see the car details that were in the catalog
- The car_id will identify the deleted vehicle

IF NO RESULTS FOUND:
- The car was deleted completely with all references
- Check Supabase logs (see instructions below)
- Check if PITR (Point-in-Time Recovery) is enabled

NEXT STEPS:
1. If you find the car_id from queries above, search for it in all tables
2. Check Supabase Dashboard logs
3. If PITR is enabled, you can restore the database to before deletion
*/


-- =====================================================
-- HOW TO CHECK SUPABASE LOGS
-- =====================================================

/*
OPTION 1: SUPABASE DASHBOARD (Easiest)
======================================
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate to: Logs > Database
4. Set filters:
   - Table: cars
   - Operation: DELETE
   - Time range: Adjust to when deletion occurred
5. Look for: DELETE operations on cars table
6. The log will show:
   - Who deleted it (user ID)
   - When it was deleted (timestamp)
   - The full row data before deletion (if logging level is high enough)

OPTION 2: CHECK IF PITR (POINT-IN-TIME RECOVERY) IS ENABLED
============================================================
1. Go to: https://app.supabase.com
2. Select your project
3. Navigate to: Database > Backups
4. Check if PITR is enabled
5. If YES, you can restore database to any point in time:
   - Click "Restore to point in time"
   - Select date/time before deletion
   - Create a new database instance with that backup

OPTION 3: QUERY SUPABASE LOGS VIA API (Advanced)
=================================================
You can query logs programmatically, but this requires:
- Supabase API access
- Log retention must be enabled
- May require Pro plan

OPTION 4: CHECK WEBHOOK LOGS (If Webhooks Enabled)
===================================================
If you have database webhooks enabled, check:
- Webhook delivery logs
- External systems that might have received the delete event
*/


-- =====================================================
-- RECOMMENDATION: IMPLEMENT SOFT DELETE
-- =====================================================

/*
To prevent this in the future, I recommend implementing soft delete:

1. Add deleted_at column to cars table
2. Modify delete operations to set timestamp instead of deleting
3. Filter queries to exclude deleted records
4. Keep audit trail of who deleted what

Would you like me to implement this protective measure?
*/

