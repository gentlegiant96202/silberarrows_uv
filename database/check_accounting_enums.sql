-- Check all enum values for the lease_accounting table enums

-- 1. Check accounting_status_enum values (for status column)
SELECT 
    'accounting_status_enum values:' as info,
    unnest(enum_range(NULL::accounting_status_enum)) as enum_value
ORDER BY enum_value;

-- 2. Check charge_type_enum values (for charge_type column)  
SELECT 
    'charge_type_enum values:' as info,
    unnest(enum_range(NULL::charge_type_enum)) as enum_value
ORDER BY enum_value;

-- 3. Alternative method - check from pg_enum if the above doesn't work
SELECT 
    'Enum Types and Values:' as info,
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('accounting_status_enum', 'charge_type_enum')
ORDER BY t.typname, e.enumsortorder;
