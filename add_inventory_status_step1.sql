-- STEP 1: Add 'inventory' enum value
-- This must be run FIRST and SEPARATELY from other operations

-- Add the enum value (this must be in its own transaction)
ALTER TYPE leasing_vehicle_status_enum ADD VALUE IF NOT EXISTS 'inventory';

-- Verify the enum was added
SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as status_values;
