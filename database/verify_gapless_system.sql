-- =====================================================
-- VERIFY GAP-FREE NUMBERING SYSTEM IS ACTIVE
-- =====================================================

-- 1. CHECK COUNTER TABLE EXISTS AND HAS VALUES
-- =====================================================
SELECT '1. COUNTER TABLE STATUS' AS check_name;
SELECT 
    counter_name,
    prefix,
    current_value,
    prefix || current_value::TEXT AS last_issued,
    prefix || (current_value + 1)::TEXT AS next_will_be,
    last_used_at
FROM uv_number_counters
ORDER BY counter_name;

-- 2. CHECK TRIGGERS ARE INSTALLED
-- =====================================================
SELECT '2. TRIGGERS INSTALLED' AS check_name;
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('vehicle_reservations', 'uv_payments')
AND trigger_name LIKE '%gapless%' OR trigger_name LIKE '%number%'
ORDER BY event_object_table, trigger_name;

-- 3. CHECK FOR OLD SEQUENCE-BASED TRIGGERS (should be removed)
-- =====================================================
SELECT '3. OLD TRIGGERS (should NOT exist)' AS check_name;
SELECT 
    trigger_name,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('vehicle_reservations', 'uv_payments')
AND trigger_name NOT LIKE '%gapless%'
AND trigger_name LIKE '%number%';

-- 4. CHECK ALL GAP TYPES
-- =====================================================
SELECT '4. INVOICE NUMBER GAPS' AS check_name;
SELECT * FROM check_invoice_number_gaps();

SELECT '5. CUSTOMER NUMBER GAPS' AS check_name;
SELECT * FROM check_customer_number_gaps();

-- 6. CHECK RECEIPT NUMBER GAPS (create function if not exists)
-- =====================================================
CREATE OR REPLACE FUNCTION check_receipt_number_gaps()
RETURNS TABLE (
    gap_start TEXT,
    gap_end TEXT,
    missing_count INTEGER
) AS $$
DECLARE
    v_min INTEGER;
    v_max INTEGER;
BEGIN
    SELECT 
        MIN(SUBSTRING(receipt_number FROM 5)::INTEGER),
        MAX(SUBSTRING(receipt_number FROM 5)::INTEGER)
    INTO v_min, v_max
    FROM uv_payments
    WHERE receipt_number LIKE 'RCP-%';
    
    IF v_min IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    WITH all_numbers AS (
        SELECT generate_series(v_min, v_max) AS num
    ),
    existing_numbers AS (
        SELECT SUBSTRING(receipt_number FROM 5)::INTEGER AS num
        FROM uv_payments
        WHERE receipt_number LIKE 'RCP-%'
    ),
    missing AS (
        SELECT a.num
        FROM all_numbers a
        LEFT JOIN existing_numbers e ON a.num = e.num
        WHERE e.num IS NULL
        ORDER BY a.num
    ),
    gaps AS (
        SELECT 
            num,
            num - ROW_NUMBER() OVER (ORDER BY num) AS grp
        FROM missing
    )
    SELECT 
        'RCP-' || MIN(num)::TEXT AS gap_start,
        'RCP-' || MAX(num)::TEXT AS gap_end,
        COUNT(*)::INTEGER AS missing_count
    FROM gaps
    GROUP BY grp
    ORDER BY MIN(num);
END;
$$ LANGUAGE plpgsql;

SELECT '6. RECEIPT NUMBER GAPS' AS check_name;
SELECT * FROM check_receipt_number_gaps();

-- 7. SUMMARY
-- =====================================================
SELECT '7. SUMMARY' AS check_name;
SELECT 
    'Invoices' AS type,
    COUNT(*) AS total_records,
    MIN(SUBSTRING(document_number FROM 5)::INTEGER) AS first_num,
    MAX(SUBSTRING(document_number FROM 5)::INTEGER) AS last_num,
    (SELECT COUNT(*) FROM check_invoice_number_gaps()) AS gaps_count
FROM vehicle_reservations
WHERE document_number LIKE 'INV-%'

UNION ALL

SELECT 
    'Customers' AS type,
    COUNT(*) AS total_records,
    MIN(SUBSTRING(customer_number FROM 5)::INTEGER) AS first_num,
    MAX(SUBSTRING(customer_number FROM 5)::INTEGER) AS last_num,
    (SELECT COUNT(*) FROM check_customer_number_gaps()) AS gaps_count
FROM vehicle_reservations
WHERE customer_number LIKE 'CIN-%'

UNION ALL

SELECT 
    'Receipts' AS type,
    COUNT(*) AS total_records,
    MIN(SUBSTRING(receipt_number FROM 5)::INTEGER) AS first_num,
    MAX(SUBSTRING(receipt_number FROM 5)::INTEGER) AS last_num,
    (SELECT COUNT(*) FROM check_receipt_number_gaps()) AS gaps_count
FROM uv_payments
WHERE receipt_number LIKE 'RCP-%';

-- =====================================================
-- NOTE ABOUT RESERVATIONS
-- =====================================================
/*
RESERVATION NUMBERS (RES-XXXX):
-------------------------------
Based on your current system, reservations do NOT get document numbers.
Only INVOICES get INV-XXXX numbers.

When a reservation converts to invoice, it gets an INV- number.
The reservation itself has document_number = NULL.

If you WANT reservation numbers, let me know and I'll add that.
*/


