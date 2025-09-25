-- =====================================================
-- TEST CONTRACT INSERT - MINIMAL DATA
-- =====================================================
-- This will help identify what's causing the 400 error

-- First, let's try inserting just the minimum required fields
INSERT INTO leasing_customers (
  customer_name,
  customer_email,
  customer_phone,
  lease_status
) VALUES (
  'TEST CONTRACT USER',
  'test@example.com',
  '+971501234567',
  'contracts_drafted'
) RETURNING id, customer_name, lease_status;

-- If that works, try with more fields
INSERT INTO leasing_customers (
  customer_name,
  customer_email,
  customer_phone,
  date_of_birth,
  emirates_id_number,
  passport_number,
  visa_number,
  address_line_1,
  city,
  emirate,
  employer_name,
  employment_type,
  monthly_salary,
  years_in_uae,
  monthly_payment,
  security_deposit,
  lease_term_months,
  lease_start_date,
  lease_end_date,
  lease_to_own_option,
  lease_status
) VALUES (
  'FULL TEST USER',
  'fulltest@example.com',
  '+971501234568',
  '1990-01-01',
  '784-1234-1234567-1',
  'AB1234567',
  'V123456789',
  '123 Test Street',
  'Dubai',
  'Dubai',
  'Test Company',
  'full_time',
  15000.00,
  5,
  2500.00,
  5000.00,
  36,
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '36 months',
  FALSE,
  'contracts_drafted'
) RETURNING id, customer_name;

-- Clean up test data
DELETE FROM leasing_customers WHERE customer_name LIKE 'TEST%' OR customer_name LIKE 'FULL TEST%';

