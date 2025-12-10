-- =====================================================
-- UV SALES ACCOUNTING - REFUND ALLOCATIONS
-- =====================================================
-- Links refunds to specific payments they are returning
-- Allows tracking of how much of each payment has been refunded
-- =====================================================

-- 1. Create the Refund Allocations table
CREATE TABLE IF NOT EXISTS uv_refund_allocations (
    -- Primary identification
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Links
    refund_id UUID NOT NULL REFERENCES uv_adjustments(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES uv_payments(id) ON DELETE CASCADE,
    
    -- Allocation amount (portion of payment being refunded)
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    
    -- Audit fields
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate allocations
    UNIQUE(refund_id, payment_id)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_uv_refund_allocations_refund_id ON uv_refund_allocations(refund_id);
CREATE INDEX IF NOT EXISTS idx_uv_refund_allocations_payment_id ON uv_refund_allocations(payment_id);

-- 3. Enable RLS
ALTER TABLE uv_refund_allocations ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies
DROP POLICY IF EXISTS "Users can view refund allocations" ON uv_refund_allocations;
CREATE POLICY "Users can view refund allocations" ON uv_refund_allocations
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can manage refund allocations" ON uv_refund_allocations;
CREATE POLICY "Users can manage refund allocations" ON uv_refund_allocations
    FOR ALL USING (auth.uid() IS NOT NULL);

-- 5. Create function to allocate refund to payment
CREATE OR REPLACE FUNCTION allocate_refund_to_payment(
    p_refund_id UUID,
    p_payment_id UUID,
    p_amount NUMERIC(12,2),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_refund RECORD;
    v_payment RECORD;
    v_already_allocated_refund NUMERIC(12,2);
    v_already_refunded_payment NUMERIC(12,2);
    v_payment_available NUMERIC(12,2);
    v_refund_available NUMERIC(12,2);
    v_allocation_id UUID;
BEGIN
    -- Get refund details
    SELECT * INTO v_refund FROM uv_adjustments 
    WHERE id = p_refund_id AND adjustment_type = 'refund';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Refund not found';
    END IF;
    
    -- Get payment details
    SELECT * INTO v_payment FROM uv_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Check payment and refund belong to same customer
    IF v_payment.lead_id != v_refund.lead_id THEN
        RAISE EXCEPTION 'Payment and refund must belong to the same customer';
    END IF;
    
    -- Calculate how much of this refund is already allocated
    SELECT COALESCE(SUM(amount), 0) INTO v_already_allocated_refund
    FROM uv_refund_allocations
    WHERE refund_id = p_refund_id;
    
    v_refund_available := v_refund.amount - v_already_allocated_refund;
    
    IF p_amount > v_refund_available THEN
        RAISE EXCEPTION 'Insufficient unallocated refund amount. Available: %', v_refund_available;
    END IF;
    
    -- Calculate how much of this payment is already refunded
    SELECT COALESCE(SUM(amount), 0) INTO v_already_refunded_payment
    FROM uv_refund_allocations
    WHERE payment_id = p_payment_id;
    
    -- Calculate payment available for refund (total - allocated to invoices - already refunded)
    v_payment_available := v_payment.amount - COALESCE((
        SELECT SUM(amount) FROM uv_payment_allocations WHERE payment_id = p_payment_id
    ), 0) - v_already_refunded_payment;
    
    IF p_amount > v_payment_available THEN
        RAISE EXCEPTION 'Refund amount exceeds available payment amount. Available: %', v_payment_available;
    END IF;
    
    -- Create the allocation
    INSERT INTO uv_refund_allocations (refund_id, payment_id, amount, created_by)
    VALUES (p_refund_id, p_payment_id, p_amount, p_created_by)
    RETURNING id INTO v_allocation_id;
    
    RETURN v_allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create view for payment summary (includes refunded amounts)
DROP VIEW IF EXISTS uv_payment_summary;
CREATE OR REPLACE VIEW uv_payment_summary AS
SELECT 
    p.id,
    p.payment_number,
    p.lead_id,
    p.amount AS total_amount,
    p.payment_method,
    p.payment_date,
    p.reference,
    p.status,
    COALESCE(SUM(pa.amount), 0) AS allocated_amount,
    COALESCE(SUM(ra.amount), 0) AS refunded_amount,
    p.amount - COALESCE(SUM(pa.amount), 0) - COALESCE(SUM(ra.amount), 0) AS available_amount,
    p.created_at
FROM uv_payments p
LEFT JOIN uv_payment_allocations pa ON p.id = pa.payment_id
LEFT JOIN uv_refund_allocations ra ON p.id = ra.payment_id
GROUP BY p.id;

-- 7. Add comments
COMMENT ON TABLE uv_refund_allocations IS 'Links refunds to specific payments they are returning';
COMMENT ON COLUMN uv_refund_allocations.amount IS 'Portion of the payment being refunded';
COMMENT ON VIEW uv_payment_summary IS 'Payment totals with allocated, refunded, and available amounts';
COMMENT ON FUNCTION allocate_refund_to_payment IS 'Allocates a refund to a specific payment with validation';

-- 8. Verify creation
SELECT 'uv_refund_allocations table created successfully' AS status;
SELECT 'uv_payment_summary view updated successfully' AS status;
SELECT 'allocate_refund_to_payment function created successfully' AS status;

