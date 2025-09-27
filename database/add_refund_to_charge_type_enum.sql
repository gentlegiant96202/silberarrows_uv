-- Add 'refund' to the charge_type_enum
-- This allows us to properly categorize refunds/credits as their own charge type

ALTER TYPE charge_type_enum ADD VALUE 'refund';

-- Verify the enum values
SELECT 
    'Updated charge_type_enum values:' as info,
    unnest(enum_range(NULL::charge_type_enum)) as enum_value
ORDER BY enum_value;
