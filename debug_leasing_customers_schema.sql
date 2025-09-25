-- =====================================================
-- DEBUG LEASING CUSTOMERS TABLE SCHEMA
-- =====================================================
-- Run this to see what fields actually exist in your database

-- Check all columns in leasing_customers table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
ORDER BY ordinal_position;

-- Check if buyout_price field exists specifically
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'leasing_customers'
  AND column_name = 'buyout_price';

-- Check if employment_type enum exists
SELECT enumlabel
FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'employment_type_enum')
ORDER BY enumsortorder;

-- Test a simple insert to see what fails
-- (Comment this out after checking the schema)
/*
INSERT INTO leasing_customers (
  customer_name,
  customer_email,
  customer_phone,
  lease_status
) VALUES (
  'TEST USER',
  'test@example.com',
  '+971501234567',
  'contracts_drafted'
) RETURNING id, customer_name;
*/

