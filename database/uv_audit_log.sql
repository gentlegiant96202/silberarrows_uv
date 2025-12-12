-- =====================================================
-- UV AUDIT LOG SYSTEM
-- 
-- Comprehensive audit trail for all accounting actions
-- =====================================================

-- 1. Create the audit log table
CREATE TABLE IF NOT EXISTS uv_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- WHO performed the action
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    
    -- WHAT action was performed
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    entity_number TEXT,
    
    -- CUSTOMER context
    lead_id UUID,
    customer_number TEXT,
    customer_name TEXT,
    
    -- CHANGE details
    old_values JSONB,
    new_values JSONB,
    metadata JSONB,
    
    -- WHEN
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure action is not empty
    CONSTRAINT valid_action CHECK (action IS NOT NULL AND action != '')
);

-- 2. Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON uv_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON uv_audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_lead ON uv_audit_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON uv_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON uv_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_number ON uv_audit_log(entity_number);

-- 3. Enable RLS
ALTER TABLE uv_audit_log ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies - Only admins can view audit log
DROP POLICY IF EXISTS "Admins can view audit log" ON uv_audit_log;
CREATE POLICY "Admins can view audit log" ON uv_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    );

-- Allow system to insert (triggers run as SECURITY DEFINER)
DROP POLICY IF EXISTS "System can insert audit log" ON uv_audit_log;
CREATE POLICY "System can insert audit log" ON uv_audit_log
    FOR INSERT WITH CHECK (true);

-- 5. Helper function to get user email
CREATE OR REPLACE FUNCTION get_user_email(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_email TEXT;
BEGIN
    SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;
    RETURN v_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function to log audit entry
CREATE OR REPLACE FUNCTION log_audit_entry(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id UUID,
    p_entity_number TEXT,
    p_lead_id UUID,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
    v_user_id UUID;
    v_user_email TEXT;
    v_customer_number TEXT;
    v_customer_name TEXT;
BEGIN
    -- Get user ID (from parameter or current session)
    v_user_id := COALESCE(p_user_id, auth.uid());
    
    -- Get user email
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    END IF;
    
    -- Get customer info if lead_id provided
    IF p_lead_id IS NOT NULL THEN
        SELECT customer_number, full_name 
        INTO v_customer_number, v_customer_name
        FROM leads WHERE id = p_lead_id;
    END IF;
    
    -- Insert audit entry
    INSERT INTO uv_audit_log (
        user_id, user_email, action, entity_type, entity_id, entity_number,
        lead_id, customer_number, customer_name,
        old_values, new_values, metadata
    ) VALUES (
        v_user_id, v_user_email, p_action, p_entity_type, p_entity_id, p_entity_number,
        p_lead_id, v_customer_number, v_customer_name,
        p_old_values, p_new_values, p_metadata
    )
    RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- AUDIT TRIGGERS FOR EACH ENTITY
-- =====================================================

-- 7. SALES ORDERS AUDIT
CREATE OR REPLACE FUNCTION audit_sales_order_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_entry(
            'sales_order_created',
            'sales_order',
            NEW.id,
            NEW.so_number,
            NEW.lead_id,
            NULL,
            jsonb_build_object(
                'so_number', NEW.so_number,
                'status', NEW.status,
                'total_amount', NEW.total_amount,
                'payment_method', NEW.payment_method
            ),
            NULL,
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM log_audit_entry(
                'sales_order_status_changed',
                'sales_order',
                NEW.id,
                NEW.so_number,
                NEW.lead_id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                NULL,
                NEW.updated_by
            );
        -- Log other updates
        ELSIF OLD.total_amount IS DISTINCT FROM NEW.total_amount 
           OR OLD.customer_name IS DISTINCT FROM NEW.customer_name THEN
            PERFORM log_audit_entry(
                'sales_order_updated',
                'sales_order',
                NEW.id,
                NEW.so_number,
                NEW.lead_id,
                jsonb_build_object(
                    'total_amount', OLD.total_amount,
                    'customer_name', OLD.customer_name
                ),
                jsonb_build_object(
                    'total_amount', NEW.total_amount,
                    'customer_name', NEW.customer_name
                ),
                NULL,
                NEW.updated_by
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_sales_order ON uv_sales_orders;
CREATE TRIGGER trg_audit_sales_order
    AFTER INSERT OR UPDATE ON uv_sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION audit_sales_order_changes();

-- 8. INVOICES AUDIT
CREATE OR REPLACE FUNCTION audit_invoice_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_lead_id UUID;
BEGIN
    -- Get lead_id from sales order
    SELECT lead_id INTO v_lead_id FROM uv_sales_orders WHERE id = NEW.sales_order_id;
    
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_entry(
            'invoice_created',
            'invoice',
            NEW.id,
            NEW.invoice_number,
            v_lead_id,
            NULL,
            jsonb_build_object(
                'invoice_number', NEW.invoice_number,
                'total_amount', NEW.total_amount,
                'status', NEW.status
            ),
            NULL,
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log reversals
        IF NEW.status = 'reversed' AND OLD.status != 'reversed' THEN
            PERFORM log_audit_entry(
                'invoice_reversed',
                'invoice',
                NEW.id,
                NEW.invoice_number,
                v_lead_id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status, 'reversal_reason', NEW.reversal_reason),
                NULL,
                NEW.reversed_by
            );
        -- Log status changes
        ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM log_audit_entry(
                'invoice_status_changed',
                'invoice',
                NEW.id,
                NEW.invoice_number,
                v_lead_id,
                jsonb_build_object('status', OLD.status, 'paid_amount', OLD.paid_amount),
                jsonb_build_object('status', NEW.status, 'paid_amount', NEW.paid_amount),
                NULL,
                NULL
            );
        -- Log PDF generation
        ELSIF NEW.pdf_url IS NOT NULL AND OLD.pdf_url IS NULL THEN
            PERFORM log_audit_entry(
                'invoice_pdf_generated',
                'invoice',
                NEW.id,
                NEW.invoice_number,
                v_lead_id,
                NULL,
                jsonb_build_object('pdf_url', NEW.pdf_url),
                NULL,
                NULL
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_invoice ON uv_invoices;
CREATE TRIGGER trg_audit_invoice
    AFTER INSERT OR UPDATE ON uv_invoices
    FOR EACH ROW
    EXECUTE FUNCTION audit_invoice_changes();

-- 9. PAYMENTS AUDIT
CREATE OR REPLACE FUNCTION audit_payment_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_entry(
            'payment_created',
            'payment',
            NEW.id,
            NEW.payment_number,
            NEW.lead_id,
            NULL,
            jsonb_build_object(
                'payment_number', NEW.payment_number,
                'amount', NEW.amount,
                'payment_method', NEW.payment_method,
                'reference', NEW.reference
            ),
            NULL,
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM log_audit_entry(
                'payment_status_changed',
                'payment',
                NEW.id,
                NEW.payment_number,
                NEW.lead_id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                NULL,
                NULL
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_payment ON uv_payments;
CREATE TRIGGER trg_audit_payment
    AFTER INSERT OR UPDATE ON uv_payments
    FOR EACH ROW
    EXECUTE FUNCTION audit_payment_changes();

-- 10. PAYMENT ALLOCATIONS AUDIT
CREATE OR REPLACE FUNCTION audit_payment_allocation_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_number TEXT;
    v_invoice_number TEXT;
    v_lead_id UUID;
BEGIN
    IF TG_OP = 'INSERT' THEN
        SELECT payment_number, lead_id INTO v_payment_number, v_lead_id 
        FROM uv_payments WHERE id = NEW.payment_id;
        SELECT invoice_number INTO v_invoice_number 
        FROM uv_invoices WHERE id = NEW.invoice_id;
        
        PERFORM log_audit_entry(
            'payment_allocated',
            'payment_allocation',
            NEW.id,
            v_payment_number,
            v_lead_id,
            NULL,
            jsonb_build_object(
                'payment_number', v_payment_number,
                'invoice_number', v_invoice_number,
                'amount', NEW.amount
            ),
            NULL,
            NEW.created_by
        );
    ELSIF TG_OP = 'DELETE' THEN
        SELECT payment_number, lead_id INTO v_payment_number, v_lead_id 
        FROM uv_payments WHERE id = OLD.payment_id;
        SELECT invoice_number INTO v_invoice_number 
        FROM uv_invoices WHERE id = OLD.invoice_id;
        
        PERFORM log_audit_entry(
            'payment_unallocated',
            'payment_allocation',
            OLD.id,
            v_payment_number,
            v_lead_id,
            jsonb_build_object(
                'payment_number', v_payment_number,
                'invoice_number', v_invoice_number,
                'amount', OLD.amount
            ),
            NULL,
            NULL,
            NULL
        );
    ELSIF TG_OP = 'UPDATE' THEN
        SELECT payment_number, lead_id INTO v_payment_number, v_lead_id 
        FROM uv_payments WHERE id = NEW.payment_id;
        SELECT invoice_number INTO v_invoice_number 
        FROM uv_invoices WHERE id = NEW.invoice_id;
        
        PERFORM log_audit_entry(
            'payment_allocation_updated',
            'payment_allocation',
            NEW.id,
            v_payment_number,
            v_lead_id,
            jsonb_build_object('amount', OLD.amount),
            jsonb_build_object('amount', NEW.amount),
            jsonb_build_object('invoice_number', v_invoice_number),
            NULL
        );
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_payment_allocation ON uv_payment_allocations;
CREATE TRIGGER trg_audit_payment_allocation
    AFTER INSERT OR UPDATE OR DELETE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION audit_payment_allocation_changes();

-- 11. ADJUSTMENTS AUDIT (Credit Notes, Debit Notes, Refunds)
CREATE OR REPLACE FUNCTION audit_adjustment_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Determine action based on type
        v_action := NEW.adjustment_type || '_created';
        
        PERFORM log_audit_entry(
            v_action,
            NEW.adjustment_type,
            NEW.id,
            NEW.adjustment_number,
            NEW.lead_id,
            NULL,
            jsonb_build_object(
                'adjustment_number', NEW.adjustment_number,
                'adjustment_type', NEW.adjustment_type,
                'amount', NEW.amount,
                'reason', NEW.reason,
                'invoice_id', NEW.invoice_id,
                'refund_method', NEW.refund_method
            ),
            NULL,
            NEW.created_by
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_adjustment ON uv_adjustments;
CREATE TRIGGER trg_audit_adjustment
    AFTER INSERT ON uv_adjustments
    FOR EACH ROW
    EXECUTE FUNCTION audit_adjustment_changes();

-- 12. BANK FINANCE AUDIT
CREATE OR REPLACE FUNCTION audit_bank_finance_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM log_audit_entry(
            'bank_finance_created',
            'bank_finance',
            NEW.id,
            'BF-' || NEW.application_number,
            NEW.lead_id,
            NULL,
            jsonb_build_object(
                'bank_name', NEW.bank_name,
                'status', NEW.status,
                'bank_finance_amount', NEW.bank_finance_amount
            ),
            NULL,
            NEW.created_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            PERFORM log_audit_entry(
                'bank_finance_status_changed',
                'bank_finance',
                NEW.id,
                'BF-' || NEW.application_number,
                NEW.lead_id,
                jsonb_build_object('status', OLD.status),
                jsonb_build_object('status', NEW.status),
                NULL,
                NULL
            );
        END IF;
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_audit_bank_finance ON uv_bank_finance_applications;
CREATE TRIGGER trg_audit_bank_finance
    AFTER INSERT OR UPDATE ON uv_bank_finance_applications
    FOR EACH ROW
    EXECUTE FUNCTION audit_bank_finance_changes();

-- 13. Comments
COMMENT ON TABLE uv_audit_log IS 'Comprehensive audit trail for all UV accounting actions';
COMMENT ON FUNCTION log_audit_entry IS 'Helper function to create audit log entries';

-- 14. Verify creation
SELECT 'uv_audit_log table created' AS status;
SELECT 'All audit triggers created' AS status;

