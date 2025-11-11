-- ================================================
-- CLEAR AND UPDATE RECEIVABLES SYSTEM
-- Run this in Supabase SQL Editor
-- ================================================

-- Step 1: Clear all receivables data for fresh import
DELETE FROM service_receivables;
DELETE FROM service_receivables_imports;

-- Step 2: Update the view to use correct logic (latest balance per customer only)
DROP VIEW IF EXISTS service_receivables_summary;

CREATE VIEW service_receivables_summary AS
WITH latest_balances AS (
  SELECT DISTINCT ON (advisor_name, customer_id)
    advisor_name,
    customer_id,
    customer_name,
    balance,
    aging_bucket,
    age_days,
    transaction_date
  FROM service_receivables
  ORDER BY advisor_name, customer_id, transaction_date DESC
)
SELECT 
  advisor_name,
  customer_id,
  customer_name,
  1 as transaction_count,
  balance as total_balance,
  CASE WHEN aging_bucket = '0-30' THEN balance ELSE 0 END as balance_0_30,
  CASE WHEN aging_bucket = '31-60' THEN balance ELSE 0 END as balance_31_60,
  CASE WHEN aging_bucket = '61-90' THEN balance ELSE 0 END as balance_61_90,
  CASE WHEN aging_bucket = '91+' THEN balance ELSE 0 END as balance_91_plus,
  age_days as oldest_transaction_days,
  transaction_date as latest_transaction_date
FROM latest_balances
WHERE balance > 0;

-- Step 3: Verify deletion
SELECT COUNT(*) as receivables_count FROM service_receivables;
SELECT COUNT(*) as imports_count FROM service_receivables_imports;

-- Ready for upload!

