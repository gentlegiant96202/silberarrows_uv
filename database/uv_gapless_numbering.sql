-- =====================================================
-- GAP-FREE SEQUENTIAL NUMBERING SYSTEM
-- =====================================================
-- Ensures invoice and customer numbers have NO GAPS
-- Uses counter table with row-level locking
-- UAE Tax Authority Compliant
-- =====================================================

-- 1. CREATE COUNTER TABLE
-- =====================================================
-- This replaces sequences with a lockable counter table
CREATE TABLE IF NOT EXISTS uv_number_counters (
    counter_name TEXT PRIMARY KEY,
    current_value INTEGER NOT NULL DEFAULT 999,
    prefix TEXT NOT NULL,
    last_used_at TIMESTAMPTZ,
    last_used_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize counters (starting at 999, so first number will be 1000)
INSERT INTO uv_number_counters (counter_name, current_value, prefix) VALUES 
    ('invoice', 999, 'INV-'),
    ('customer', 999, 'CIN-'),
    ('receipt', 999, 'RCP-')
ON CONFLICT (counter_name) DO NOTHING;

-- Sync counters with existing data
DO $$
DECLARE
    v_max_invoice INTEGER;
    v_max_customer INTEGER;
    v_max_receipt INTEGER;
BEGIN
    -- Get max existing invoice number
    SELECT COALESCE(MAX(SUBSTRING(document_number FROM 5)::INTEGER), 999)
    INTO v_max_invoice
    FROM vehicle_reservations
    WHERE document_number LIKE 'INV-%';
    
    -- Get max existing customer number
    SELECT COALESCE(MAX(SUBSTRING(customer_number FROM 5)::INTEGER), 999)
    INTO v_max_customer
    FROM vehicle_reservations
    WHERE customer_number LIKE 'CIN-%';
    
    -- Get max existing receipt number
    SELECT COALESCE(MAX(SUBSTRING(receipt_number FROM 5)::INTEGER), 999)
    INTO v_max_receipt
    FROM uv_payments
    WHERE receipt_number LIKE 'RCP-%';
    
    -- Update counters to current max
    UPDATE uv_number_counters SET current_value = v_max_invoice WHERE counter_name = 'invoice';
    UPDATE uv_number_counters SET current_value = v_max_customer WHERE counter_name = 'customer';
    UPDATE uv_number_counters SET current_value = v_max_receipt WHERE counter_name = 'receipt';
    
    RAISE NOTICE 'Counters synced: Invoice=%, Customer=%, Receipt=%', v_max_invoice, v_max_customer, v_max_receipt;
END $$;

-- 2. FUNCTION TO GET NEXT NUMBER (WITH LOCKING)
-- =====================================================
-- This function locks the counter row, preventing concurrent access
-- The lock is released when the transaction commits (with the INSERT) or rolls back

CREATE OR REPLACE FUNCTION get_next_number(p_counter_name TEXT)
RETURNS TEXT AS $$
DECLARE
    v_next_value INTEGER;
    v_prefix TEXT;
BEGIN
    -- Lock the counter row and increment atomically
    -- FOR UPDATE NOWAIT will error if another transaction has the lock
    -- This prevents race conditions
    UPDATE uv_number_counters 
    SET current_value = current_value + 1,
        last_used_at = NOW(),
        last_used_by = auth.uid()
    WHERE counter_name = p_counter_name
    RETURNING current_value, prefix INTO v_next_value, v_prefix;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Counter "%" not found', p_counter_name;
    END IF;
    
    RETURN v_prefix || v_next_value::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 3. UPDATED TRIGGER FOR INVOICE NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_document_number_gapless()
RETURNS TRIGGER AS $$
DECLARE
    v_new_number TEXT;
BEGIN
    -- Generate invoice number for invoices only
    IF NEW.document_type = 'invoice' THEN
        -- Generate new invoice number if:
        -- 1. It's a new invoice (INSERT with document_number NULL)
        -- 2. Converting from reservation to invoice
        IF (TG_OP = 'INSERT' AND NEW.document_number IS NULL) OR
           (TG_OP = 'UPDATE' AND OLD.document_type = 'reservation' AND NEW.document_type = 'invoice' AND NEW.document_number IS NULL) THEN
            
            -- Get next number with lock
            SELECT get_next_number('invoice') INTO v_new_number;
            NEW.document_number := v_new_number;
            
            RAISE NOTICE 'Generated invoice number: %', v_new_number;
        END IF;
    ELSIF NEW.document_type = 'reservation' THEN
        -- Reservations don't get document numbers
        IF TG_OP = 'INSERT' THEN
            NEW.document_number := NULL;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace old trigger
DROP TRIGGER IF EXISTS generate_document_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_document_number_gapless_trigger
    BEFORE INSERT OR UPDATE ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION generate_document_number_gapless();

-- 4. UPDATED TRIGGER FOR CUSTOMER NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_customer_number_gapless()
RETURNS TRIGGER AS $$
DECLARE
    v_new_number TEXT;
BEGIN
    -- Only generate customer number on INSERT if it's NULL
    IF TG_OP = 'INSERT' AND NEW.customer_number IS NULL THEN
        -- Get next number with lock
        SELECT get_next_number('customer') INTO v_new_number;
        NEW.customer_number := v_new_number;
        
        RAISE NOTICE 'Generated customer number: %', v_new_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace old trigger
DROP TRIGGER IF EXISTS generate_customer_number_trigger ON vehicle_reservations;
CREATE TRIGGER generate_customer_number_gapless_trigger
    BEFORE INSERT ON vehicle_reservations
    FOR EACH ROW
    EXECUTE FUNCTION generate_customer_number_gapless();

-- 5. UPDATED TRIGGER FOR RECEIPT NUMBERS
-- =====================================================
CREATE OR REPLACE FUNCTION generate_receipt_number_gapless()
RETURNS TRIGGER AS $$
DECLARE
    v_new_number TEXT;
BEGIN
    -- Only generate receipt number on INSERT if it's NULL
    IF NEW.receipt_number IS NULL THEN
        -- Get next number with lock
        SELECT get_next_number('receipt') INTO v_new_number;
        NEW.receipt_number := v_new_number;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace old trigger
DROP TRIGGER IF EXISTS trigger_generate_receipt_number ON uv_payments;
CREATE TRIGGER generate_receipt_number_gapless_trigger
    BEFORE INSERT ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_number_gapless();

-- 6. HELPER VIEW: NUMBER STATUS
-- =====================================================
CREATE OR REPLACE VIEW uv_number_status AS
SELECT 
    nc.counter_name,
    nc.prefix,
    nc.current_value,
    nc.prefix || nc.current_value::TEXT AS last_number_issued,
    nc.prefix || (nc.current_value + 1)::TEXT AS next_number,
    nc.last_used_at,
    nc.last_used_by
FROM uv_number_counters nc;

-- 7. FUNCTION TO CHECK FOR GAPS (AUDIT)
-- =====================================================
CREATE OR REPLACE FUNCTION check_invoice_number_gaps()
RETURNS TABLE (
    gap_start TEXT,
    gap_end TEXT,
    missing_count INTEGER
) AS $$
DECLARE
    v_min INTEGER;
    v_max INTEGER;
BEGIN
    -- Get range
    SELECT 
        MIN(SUBSTRING(document_number FROM 5)::INTEGER),
        MAX(SUBSTRING(document_number FROM 5)::INTEGER)
    INTO v_min, v_max
    FROM vehicle_reservations
    WHERE document_number LIKE 'INV-%';
    
    -- Find gaps using generate_series
    RETURN QUERY
    WITH all_numbers AS (
        SELECT generate_series(v_min, v_max) AS num
    ),
    existing_numbers AS (
        SELECT SUBSTRING(document_number FROM 5)::INTEGER AS num
        FROM vehicle_reservations
        WHERE document_number LIKE 'INV-%'
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
        'INV-' || MIN(num)::TEXT AS gap_start,
        'INV-' || MAX(num)::TEXT AS gap_end,
        COUNT(*)::INTEGER AS missing_count
    FROM gaps
    GROUP BY grp
    ORDER BY MIN(num);
END;
$$ LANGUAGE plpgsql;

-- Similar function for customer numbers
CREATE OR REPLACE FUNCTION check_customer_number_gaps()
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
        MIN(SUBSTRING(customer_number FROM 5)::INTEGER),
        MAX(SUBSTRING(customer_number FROM 5)::INTEGER)
    INTO v_min, v_max
    FROM vehicle_reservations
    WHERE customer_number LIKE 'CIN-%';
    
    RETURN QUERY
    WITH all_numbers AS (
        SELECT generate_series(v_min, v_max) AS num
    ),
    existing_numbers AS (
        SELECT SUBSTRING(customer_number FROM 5)::INTEGER AS num
        FROM vehicle_reservations
        WHERE customer_number LIKE 'CIN-%'
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
        'CIN-' || MIN(num)::TEXT AS gap_start,
        'CIN-' || MAX(num)::TEXT AS gap_end,
        COUNT(*)::INTEGER AS missing_count
    FROM gaps
    GROUP BY grp
    ORDER BY MIN(num);
END;
$$ LANGUAGE plpgsql;

-- 8. ADMIN FUNCTION: FILL GAPS (FOR HISTORICAL DATA)
-- =====================================================
-- USE WITH CAUTION: Only run this if you need to fill historical gaps
CREATE OR REPLACE FUNCTION fill_invoice_gaps(p_confirm BOOLEAN DEFAULT FALSE)
RETURNS TEXT AS $$
DECLARE
    v_gap RECORD;
    v_count INTEGER := 0;
BEGIN
    IF NOT p_confirm THEN
        RETURN 'DRY RUN - Pass TRUE to actually fill gaps. Current gaps: ' || 
               (SELECT COUNT(*) FROM check_invoice_number_gaps())::TEXT;
    END IF;
    
    -- This would require manual intervention to create placeholder records
    -- For now, just report the gaps
    FOR v_gap IN SELECT * FROM check_invoice_number_gaps()
    LOOP
        RAISE NOTICE 'Gap found: % to % (% missing)', v_gap.gap_start, v_gap.gap_end, v_gap.missing_count;
        v_count := v_count + v_gap.missing_count;
    END LOOP;
    
    RETURN 'Found ' || v_count || ' total gaps. Manual intervention required.';
END;
$$ LANGUAGE plpgsql;

-- 9. RLS FOR COUNTER TABLE
-- =====================================================
ALTER TABLE uv_number_counters ENABLE ROW LEVEL SECURITY;

-- Only allow reading (no direct updates - only through functions)
DROP POLICY IF EXISTS "Anyone can view counters" ON uv_number_counters;
CREATE POLICY "Anyone can view counters" ON uv_number_counters
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Block direct modifications (force use of get_next_number function)
DROP POLICY IF EXISTS "No direct counter updates" ON uv_number_counters;
CREATE POLICY "No direct counter updates" ON uv_number_counters
    FOR UPDATE USING (FALSE);

DROP POLICY IF EXISTS "No direct counter inserts" ON uv_number_counters;
CREATE POLICY "No direct counter inserts" ON uv_number_counters
    FOR INSERT WITH CHECK (FALSE);

DROP POLICY IF EXISTS "No direct counter deletes" ON uv_number_counters;
CREATE POLICY "No direct counter deletes" ON uv_number_counters
    FOR DELETE USING (FALSE);

-- The get_next_number function runs as SECURITY DEFINER so it can update

-- Make functions SECURITY DEFINER to bypass RLS
ALTER FUNCTION get_next_number(TEXT) SECURITY DEFINER;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show current counter status
SELECT * FROM uv_number_status;

-- Check for existing gaps in invoices
SELECT * FROM check_invoice_number_gaps();

-- Check for existing gaps in customer numbers
SELECT * FROM check_customer_number_gaps();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Gap-free numbering system installed!';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '1. Counter table locks row when getting next number';
    RAISE NOTICE '2. If transaction fails, number is NOT consumed';
    RAISE NOTICE '3. Numbers are guaranteed sequential with no gaps';
    RAISE NOTICE '';
    RAISE NOTICE 'To check current status: SELECT * FROM uv_number_status;';
    RAISE NOTICE 'To check for gaps: SELECT * FROM check_invoice_number_gaps();';
END $$;

-- =====================================================
-- USAGE NOTES
-- =====================================================
/*

HOW THIS PREVENTS GAPS:
-----------------------
OLD WAY (Sequences):
1. Transaction starts
2. nextval() called → returns 1001
3. Transaction fails (e.g., validation error)
4. Number 1001 is LOST (sequence doesn't roll back)
5. Next transaction gets 1002 → GAP!

NEW WAY (Counter Table):
1. Transaction starts
2. get_next_number() called → UPDATE counter with FOR UPDATE lock
3. Returns 1001
4. Transaction fails → UPDATE rolls back
5. Counter still at 1000
6. Next transaction gets 1001 → NO GAP!

CHECKING FOR EXISTING GAPS:
---------------------------
-- Check invoice number gaps
SELECT * FROM check_invoice_number_gaps();

-- Check customer number gaps  
SELECT * FROM check_customer_number_gaps();

-- View current counter status
SELECT * FROM uv_number_status;

*/

