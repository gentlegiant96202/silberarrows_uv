-- STEP 2: Verify and test the inventory status
-- Run this AFTER step 1 has been completed

-- Show current distribution of statuses
SELECT 
    status,
    COUNT(*) as count
FROM leasing_inventory 
GROUP BY status 
ORDER BY count DESC;

-- Test that we can now use the inventory status
-- (This is just a test - don't actually update data unless intended)
-- UPDATE leasing_inventory SET status = 'inventory' WHERE stock_number = 'TEST001';

-- Verify all enum values are available
SELECT 
    'All enum values:' as info,
    unnest(enum_range(NULL::leasing_vehicle_status_enum)) as available_statuses;

-- Success message
SELECT 'Inventory status is now available for use!' as result;
