-- =====================================================
-- INVESTIGATE AND FIX NUMBER GAPS
-- =====================================================

-- 1. INVESTIGATE: What customer numbers exist around the gap?
-- =====================================================
SELECT 
    customer_number,
    customer_name,
    document_type,
    document_status,
    created_at
FROM vehicle_reservations
WHERE customer_number LIKE 'CIN-106%' 
   OR customer_number LIKE 'CIN-107%'
ORDER BY SUBSTRING(customer_number FROM 5)::INTEGER;

-- 2. CHECK: Were there any deleted reservations?
-- =====================================================
-- Look at the audit log (if it exists) for deleted records
SELECT 
    table_name,
    record_id,
    action,
    old_values->>'customer_number' AS deleted_customer_number,
    old_values->>'customer_name' AS deleted_customer_name,
    changed_at
FROM uv_accounting_audit_log
WHERE table_name = 'vehicle_reservations'
AND action = 'DELETE'
AND old_values->>'customer_number' LIKE 'CIN-106%'
   OR old_values->>'customer_number' LIKE 'CIN-107%'
ORDER BY changed_at DESC;

-- 3. SHOW EXACT GAPS
-- =====================================================
WITH number_range AS (
    SELECT generate_series(1062, 1072) AS num
),
existing AS (
    SELECT SUBSTRING(customer_number FROM 5)::INTEGER AS num
    FROM vehicle_reservations
    WHERE customer_number LIKE 'CIN-%'
)
SELECT 
    'CIN-' || nr.num AS missing_number,
    CASE 
        WHEN e.num IS NULL THEN '❌ MISSING'
        ELSE '✅ EXISTS'
    END AS status
FROM number_range nr
LEFT JOIN existing e ON nr.num = e.num
ORDER BY nr.num;

-- =====================================================
-- OPTIONS TO FIX THE GAPS:
-- =====================================================

/*
OPTION A: DOCUMENT AND IGNORE (Simplest)
----------------------------------------
- Keep a record of the gaps
- Document reason: "System migration / Failed transactions"
- New system prevents future gaps

OPTION B: CREATE VOID RECORDS (Recommended for UAE Compliance)
--------------------------------------------------------------
- Create placeholder "VOID" reservations for missing numbers
- These show the numbers were intentionally voided
- Better for audit trail

OPTION C: RENUMBER (NOT RECOMMENDED)
------------------------------------
- Would require updating all references
- Could break existing invoices/receipts
- Very risky
*/

-- =====================================================
-- OPTION B: CREATE VOID RECORDS TO FILL GAPS
-- =====================================================
-- Run this to create void placeholder records

DO $$
DECLARE
    v_missing_num INTEGER;
    v_customer_number TEXT;
    v_count INTEGER := 0;
BEGIN
    -- Loop through missing numbers 1062 to 1072
    FOR v_missing_num IN 1062..1072
    LOOP
        v_customer_number := 'CIN-' || v_missing_num;
        
        -- Check if this number exists
        IF NOT EXISTS (
            SELECT 1 FROM vehicle_reservations 
            WHERE customer_number = v_customer_number
        ) THEN
            -- Insert a VOID placeholder record
            INSERT INTO vehicle_reservations (
                lead_id,
                customer_number,
                customer_name,
                contact_no,
                document_type,
                document_status,
                sales_executive,
                additional_notes,
                created_at
            ) VALUES (
                -- Use a system UUID for void records (or NULL if allowed)
                gen_random_uuid(),
                v_customer_number,
                '[VOID - Number Reserved]',
                'N/A',
                'reservation',
                'cancelled',
                'System',
                'VOID: Gap in customer number sequence. Created to maintain sequential integrity.',
                NOW()
            );
            
            v_count := v_count + 1;
            RAISE NOTICE 'Created VOID record for %', v_customer_number;
        ELSE
            RAISE NOTICE '% already exists, skipping', v_customer_number;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Created % VOID records to fill gaps', v_count;
END $$;

-- =====================================================
-- VERIFY: Check gaps are filled
-- =====================================================
SELECT * FROM check_customer_number_gaps();

-- Show the VOID records
SELECT 
    customer_number,
    customer_name,
    document_status,
    additional_notes,
    created_at
FROM vehicle_reservations
WHERE customer_name LIKE '[VOID%'
ORDER BY customer_number;

-- =====================================================
-- ALSO CHECK INVOICE NUMBER GAPS
-- =====================================================
SELECT * FROM check_invoice_number_gaps();



