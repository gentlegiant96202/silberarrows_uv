-- =====================================================
-- UV ACCOUNTING AUDIT TRAIL SYSTEM
-- =====================================================
-- Comprehensive audit logging for compliance
-- Tracks all changes to accounting-related tables
-- =====================================================

-- 1. AUDIT LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS uv_accounting_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- What was changed
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
    
    -- The data
    old_values JSONB,  -- NULL for INSERT
    new_values JSONB,  -- NULL for DELETE
    changed_fields TEXT[], -- List of fields that changed (for UPDATE)
    
    -- Who changed it
    changed_by UUID REFERENCES auth.users(id),
    changed_by_email TEXT,
    changed_by_name TEXT,
    
    -- When and where
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    ip_address TEXT,
    user_agent TEXT,
    
    -- Context
    session_id TEXT,
    request_id TEXT,
    notes TEXT
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON uv_accounting_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record_id ON uv_accounting_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_changed_at ON uv_accounting_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_changed_by ON uv_accounting_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_action ON uv_accounting_audit_log(action);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON uv_accounting_audit_log(table_name, record_id, changed_at DESC);

-- 2. GENERIC AUDIT TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION uv_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_fields TEXT[];
    v_user_id UUID;
    v_user_email TEXT;
    v_user_name TEXT;
    v_record_id UUID;
    key_name TEXT;
BEGIN
    -- Get current user info
    v_user_id := auth.uid();
    
    -- Try to get user details
    IF v_user_id IS NOT NULL THEN
        SELECT 
            email,
            COALESCE(raw_user_meta_data->>'full_name', email)
        INTO v_user_email, v_user_name
        FROM auth.users
        WHERE id = v_user_id;
    END IF;
    
    -- Determine record ID and prepare data based on operation
    IF TG_OP = 'INSERT' THEN
        v_record_id := NEW.id;
        v_new_data := to_jsonb(NEW);
        v_old_data := NULL;
        v_changed_fields := NULL;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_record_id := NEW.id;
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
        
        -- Find which fields changed
        v_changed_fields := ARRAY[]::TEXT[];
        FOR key_name IN SELECT jsonb_object_keys(v_new_data)
        LOOP
            IF v_old_data->key_name IS DISTINCT FROM v_new_data->key_name THEN
                v_changed_fields := array_append(v_changed_fields, key_name);
            END IF;
        END LOOP;
        
        -- Skip if nothing actually changed (except updated_at)
        IF array_length(v_changed_fields, 1) = 1 AND v_changed_fields[1] = 'updated_at' THEN
            RETURN NEW;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_record_id := OLD.id;
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
        v_changed_fields := NULL;
    END IF;
    
    -- Insert audit record
    INSERT INTO uv_accounting_audit_log (
        table_name,
        record_id,
        action,
        old_values,
        new_values,
        changed_fields,
        changed_by,
        changed_by_email,
        changed_by_name,
        changed_at
    ) VALUES (
        TG_TABLE_NAME,
        v_record_id,
        TG_OP,
        v_old_data,
        v_new_data,
        v_changed_fields,
        v_user_id,
        v_user_email,
        v_user_name,
        NOW()
    );
    
    -- Return appropriate record
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. APPLY TRIGGERS TO ACCOUNTING TABLES
-- =====================================================

-- uv_charges audit
DROP TRIGGER IF EXISTS trg_audit_uv_charges ON uv_charges;
CREATE TRIGGER trg_audit_uv_charges
    AFTER INSERT OR UPDATE OR DELETE ON uv_charges
    FOR EACH ROW EXECUTE FUNCTION uv_audit_trigger_func();

-- uv_payments audit
DROP TRIGGER IF EXISTS trg_audit_uv_payments ON uv_payments;
CREATE TRIGGER trg_audit_uv_payments
    AFTER INSERT OR UPDATE OR DELETE ON uv_payments
    FOR EACH ROW EXECUTE FUNCTION uv_audit_trigger_func();

-- uv_payment_allocations audit
DROP TRIGGER IF EXISTS trg_audit_uv_payment_allocations ON uv_payment_allocations;
CREATE TRIGGER trg_audit_uv_payment_allocations
    AFTER INSERT OR UPDATE OR DELETE ON uv_payment_allocations
    FOR EACH ROW EXECUTE FUNCTION uv_audit_trigger_func();

-- vehicle_reservations audit (for invoice/reservation changes)
DROP TRIGGER IF EXISTS trg_audit_vehicle_reservations ON vehicle_reservations;
CREATE TRIGGER trg_audit_vehicle_reservations
    AFTER INSERT OR UPDATE OR DELETE ON vehicle_reservations
    FOR EACH ROW EXECUTE FUNCTION uv_audit_trigger_func();

-- 4. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE uv_accounting_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admin and accounts can view audit logs
DROP POLICY IF EXISTS "Admin/Accounts can view audit logs" ON uv_accounting_audit_log;
CREATE POLICY "Admin/Accounts can view audit logs" ON uv_accounting_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accounts')
        )
    );

-- Nobody can modify audit logs (immutable)
DROP POLICY IF EXISTS "Audit logs are immutable" ON uv_accounting_audit_log;
CREATE POLICY "Audit logs are immutable" ON uv_accounting_audit_log
    FOR ALL USING (false)
    WITH CHECK (false);

-- Allow INSERT only from triggers (SECURITY DEFINER bypasses RLS)
-- The trigger function runs as SECURITY DEFINER so it can insert

-- 5. HELPER VIEWS
-- =====================================================

-- View: Recent changes (last 7 days)
CREATE OR REPLACE VIEW uv_audit_recent AS
SELECT 
    al.id,
    al.table_name,
    al.record_id,
    al.action,
    al.changed_fields,
    al.changed_by_name,
    al.changed_by_email,
    al.changed_at,
    -- For charges, show description
    CASE 
        WHEN al.table_name = 'uv_charges' THEN 
            COALESCE(al.new_values->>'description', al.old_values->>'description')
        WHEN al.table_name = 'uv_payments' THEN 
            'Payment: ' || COALESCE(al.new_values->>'amount', al.old_values->>'amount')
        WHEN al.table_name = 'vehicle_reservations' THEN 
            COALESCE(al.new_values->>'customer_name', al.old_values->>'customer_name')
        ELSE NULL
    END AS summary,
    al.old_values,
    al.new_values
FROM uv_accounting_audit_log al
WHERE al.changed_at > NOW() - INTERVAL '7 days'
ORDER BY al.changed_at DESC;

-- View: Audit trail for a specific record
CREATE OR REPLACE VIEW uv_audit_by_record AS
SELECT 
    al.table_name,
    al.record_id,
    al.action,
    al.changed_fields,
    al.changed_by_name,
    al.changed_at,
    al.old_values,
    al.new_values
FROM uv_accounting_audit_log al
ORDER BY al.record_id, al.changed_at;

-- 6. HELPER FUNCTIONS
-- =====================================================

-- Function: Get audit history for a specific record
CREATE OR REPLACE FUNCTION get_audit_history(
    p_table_name TEXT,
    p_record_id UUID
)
RETURNS TABLE (
    action TEXT,
    changed_fields TEXT[],
    changed_by TEXT,
    changed_at TIMESTAMPTZ,
    old_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.action,
        al.changed_fields,
        COALESCE(al.changed_by_name, al.changed_by_email, 'System') AS changed_by,
        al.changed_at,
        al.old_values,
        al.new_values
    FROM uv_accounting_audit_log al
    WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
    ORDER BY al.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get all changes by a user
CREATE OR REPLACE FUNCTION get_user_audit_history(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changed_at TIMESTAMPTZ,
    summary TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.table_name,
        al.record_id,
        al.action,
        al.changed_at,
        CASE 
            WHEN al.table_name = 'uv_charges' THEN 
                al.action || ': ' || COALESCE(al.new_values->>'description', al.old_values->>'description', 'Charge')
            WHEN al.table_name = 'uv_payments' THEN 
                al.action || ': Payment AED ' || COALESCE(al.new_values->>'amount', al.old_values->>'amount', '0')
            WHEN al.table_name = 'vehicle_reservations' THEN 
                al.action || ': ' || COALESCE(al.new_values->>'document_number', al.old_values->>'document_number', 'Reservation')
            ELSE al.action || ' on ' || al.table_name
        END AS summary
    FROM uv_accounting_audit_log al
    WHERE al.changed_by = p_user_id
    ORDER BY al.changed_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get changes in date range (for compliance reports)
CREATE OR REPLACE FUNCTION get_audit_report(
    p_from_date TIMESTAMPTZ,
    p_to_date TIMESTAMPTZ,
    p_table_name TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    table_name TEXT,
    record_id UUID,
    action TEXT,
    changed_by_name TEXT,
    changed_at TIMESTAMPTZ,
    old_values JSONB,
    new_values JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        al.id,
        al.table_name,
        al.record_id,
        al.action,
        COALESCE(al.changed_by_name, al.changed_by_email, 'System'),
        al.changed_at,
        al.old_values,
        al.new_values
    FROM uv_accounting_audit_log al
    WHERE al.changed_at BETWEEN p_from_date AND p_to_date
    AND (p_table_name IS NULL OR al.table_name = p_table_name)
    ORDER BY al.changed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'UV Accounting Audit Trail system created successfully!' AS result;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================
/*

-- Get audit history for a specific charge
SELECT * FROM get_audit_history('uv_charges', 'your-charge-uuid-here');

-- Get all changes by a specific user
SELECT * FROM get_user_audit_history('user-uuid-here', 50);

-- Get compliance report for a date range
SELECT * FROM get_audit_report('2025-01-01', '2025-01-31');

-- Get recent changes (view)
SELECT * FROM uv_audit_recent LIMIT 20;

-- Query audit log directly
SELECT 
    changed_at,
    action,
    table_name,
    changed_by_name,
    changed_fields,
    old_values->>'amount' as old_amount,
    new_values->>'amount' as new_amount
FROM uv_accounting_audit_log
WHERE table_name = 'uv_payments'
AND action = 'UPDATE'
ORDER BY changed_at DESC;

*/

