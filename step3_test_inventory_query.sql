-- STEP 3: Test that inventory status can be queried
-- Run this AFTER step 2 shows 'inventory' in the enum list

SELECT COUNT(*) as inventory_count 
FROM leasing_inventory 
WHERE status = 'inventory';

-- This should return 0 (not an error)
-- If you get an error, the enum addition didn't work properly
