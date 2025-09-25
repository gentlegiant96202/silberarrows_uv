-- STEP 2: Verify inventory enum was added
-- Run this AFTER step 1 completes (wait 30 seconds)

SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as available_statuses;
