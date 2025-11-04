-- DIAGNOSTIC QUERY: Find why DENNIS shows "Missed Invoice" status
-- This will show all charges without invoices in past billing periods

-- 1. Show all accounting records for DENNIS
SELECT 
    la.id,
    la.billing_period,
    la.charge_type,
    la.total_amount,
    la.invoice_id,
    la.invoice_number,
    la.status,
    la.comment,
    la.created_at,
    CASE 
        WHEN la.billing_period < CURRENT_DATE THEN 'PAST PERIOD'
        ELSE 'CURRENT/FUTURE'
    END as period_status
FROM ifrs_lease_accounting la
JOIN leasing_customers lc ON la.lease_id = lc.id
WHERE lc.customer_name ILIKE '%DENNIS%'
  AND la.deleted_at IS NULL
ORDER BY la.billing_period DESC, la.created_at;

-- 2. Show charges that would trigger "Missed Invoice" status
-- (past periods with charges but no invoice)
SELECT 
    la.billing_period,
    la.charge_type,
    la.total_amount,
    la.invoice_id,
    la.status,
    la.comment,
    DATE_PART('day', CURRENT_DATE - (la.billing_period + INTERVAL '1 month'))::INTEGER as days_past_period_end
FROM ifrs_lease_accounting la
JOIN leasing_customers lc ON la.lease_id = lc.id
WHERE lc.customer_name ILIKE '%DENNIS%'
  AND la.deleted_at IS NULL
  AND (la.billing_period + INTERVAL '1 month') < CURRENT_DATE  -- Past period
  AND la.charge_type != 'credit_note'  -- Not a credit note
  AND la.total_amount > 0  -- Positive amount
  AND la.invoice_id IS NULL  -- No invoice
ORDER BY la.billing_period;

-- 3. Show lease start date for DENNIS to understand billing periods
SELECT 
    id as lease_id,
    customer_name,
    lease_start_date,
    lease_end_date,
    monthly_payment,
    -- Calculate expected billing periods
    DATE_TRUNC('month', lease_start_date)::DATE as first_period_start,
    DATE_TRUNC('month', CURRENT_DATE)::DATE as current_period_start,
    EXTRACT(YEAR FROM AGE(CURRENT_DATE, lease_start_date)) * 12 + 
    EXTRACT(MONTH FROM AGE(CURRENT_DATE, lease_start_date)) as months_since_start
FROM leasing_customers
WHERE customer_name ILIKE '%DENNIS%';

-- 4. Show all invoices for DENNIS
SELECT DISTINCT
    la.invoice_number,
    la.invoice_id,
    la.billing_period,
    SUM(la.total_amount) as invoice_total,
    MAX(la.status) as invoice_status,
    STRING_AGG(DISTINCT la.charge_type::TEXT, ', ' ORDER BY la.charge_type::TEXT) as charge_types,
    COUNT(*) as line_count
FROM ifrs_lease_accounting la
JOIN leasing_customers lc ON la.lease_id = lc.id
WHERE lc.customer_name ILIKE '%DENNIS%'
  AND la.invoice_id IS NOT NULL
  AND la.deleted_at IS NULL
GROUP BY la.invoice_number, la.invoice_id, la.billing_period
ORDER BY la.billing_period DESC;





