-- Fix the inventory enum issue
-- The error shows that 'inventory' is not a valid enum value

-- Step 1: Check current enum values
SELECT 'Current enum values:' as info;
SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as current_values;

-- Step 2: Check if enum type exists at all
SELECT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'leasing_vehicle_status_enum'
) as enum_exists;

-- Step 3: Add the inventory value (this might fail if enum doesn't exist)
DO $$ 
BEGIN
    -- Try to add the enum value
    ALTER TYPE leasing_vehicle_status_enum ADD VALUE IF NOT EXISTS 'inventory';
    RAISE NOTICE 'Successfully added inventory to existing enum';
EXCEPTION
    WHEN undefined_object THEN
        -- If enum doesn't exist, create it
        RAISE NOTICE 'Enum does not exist, creating new enum with all values';
        CREATE TYPE leasing_vehicle_status_enum AS ENUM (
            'marketing',
            'inventory', 
            'reserved',
            'leased',
            'returned',
            'maintenance',
            'archived'
        );
    WHEN duplicate_object THEN
        RAISE NOTICE 'Inventory value already exists in enum';
END $$;

-- Step 4: Verify the enum now includes inventory
SELECT 'Updated enum values:' as info;
SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as updated_values;

-- Step 5: Test that we can now query with inventory status
-- This should not error if the enum is properly set up
SELECT COUNT(*) as inventory_test 
FROM leasing_inventory 
WHERE status = 'inventory';

-- Success message
SELECT 'Inventory enum value should now be available!' as result;
