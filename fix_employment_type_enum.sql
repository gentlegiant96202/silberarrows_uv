-- =====================================================
-- FIX EMPLOYMENT TYPE ENUM
-- =====================================================
-- This creates the employment_type_enum if it doesn't exist

-- Check if employment_type_enum exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type_enum') THEN
        -- Create the enum type
        CREATE TYPE employment_type_enum AS ENUM (
            'full_time',
            'part_time',
            'contract',
            'freelance',
            'self_employed',
            'unemployed'
        );
        
        RAISE NOTICE 'Created employment_type_enum';
    ELSE
        RAISE NOTICE 'employment_type_enum already exists';
    END IF;
END$$;

-- Check if the column uses the enum type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name = 'employment_type';

-- If employment_type column exists but is not using the enum, we might need to alter it
-- (Uncomment if needed)
/*
ALTER TABLE leasing_customers 
ALTER COLUMN employment_type TYPE employment_type_enum 
USING employment_type::employment_type_enum;
*/

