-- Add 'inventory' status to leasing_vehicle_status_enum
-- This adds the inventory column to the leasing inventory Kanban board

-- Check if the enum value already exists
DO $$ 
BEGIN
    -- Try to add the enum value
    ALTER TYPE leasing_vehicle_status_enum ADD VALUE IF NOT EXISTS 'inventory';
    
    -- If the enum type doesn't exist, create it with all values
EXCEPTION
    WHEN undefined_object THEN
        -- Create the enum type if it doesn't exist
        CREATE TYPE leasing_vehicle_status_enum AS ENUM (
            'marketing',      -- Vehicle preparation stage
            'inventory',      -- Vehicle ready for leasing
            'reserved',       -- Reserved for specific customer
            'leased',         -- Currently out on lease
            'returned',       -- Returned from lease, needs processing
            'maintenance',    -- In for service/repairs
            'archived'        -- End of life
        );
END $$;

-- Verify the enum values
SELECT unnest(enum_range(NULL::leasing_vehicle_status_enum)) as status_values;

-- Show current distribution of statuses
SELECT 
    status,
    COUNT(*) as count
FROM leasing_inventory 
GROUP BY status 
ORDER BY count DESC;

-- Success message
SELECT 'Inventory status added to leasing_vehicle_status_enum successfully!' as result;
