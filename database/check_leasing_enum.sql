-- =====================================================
-- CHECK LEASING CUSTOMERS ENUM VALUES
-- =====================================================
-- Run this to verify your database enum matches frontend

-- Check current enum values
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
ORDER BY enumsortorder;

-- Check if prospects exists
SELECT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'lease_status_enum')
    AND enumlabel = 'prospects'
) as prospects_exists;

-- Check sample data with prospects
SELECT id, customer_name, lease_status
FROM leasing_customers
WHERE lease_status = 'prospects'
LIMIT 5;

-- =====================================================
-- IF PROSPECTS IS MISSING FROM ENUM
-- =====================================================
-- Run this only if prospects is missing:
-- ALTER TYPE lease_status_enum ADD VALUE IF NOT EXISTS 'prospects';
