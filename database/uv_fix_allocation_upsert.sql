-- =====================================================
-- FIX: Allow adding more amount to existing allocation
-- 
-- Problem: When a debit note is added after initial allocation,
-- user can't allocate more from the same payment to the same invoice
-- because of UNIQUE constraint on (payment_id, invoice_id)
--
-- Solution: Use UPSERT - update existing allocation if it exists
-- =====================================================

-- Drop and recreate the function with UPSERT logic
CREATE OR REPLACE FUNCTION allocate_payment_to_invoice(
    p_payment_id UUID,
    p_invoice_id UUID,
    p_amount NUMERIC(12,2),
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_payment RECORD;
    v_invoice RECORD;
    v_already_allocated_total NUMERIC(12,2);
    v_already_allocated_to_invoice NUMERIC(12,2);
    v_available NUMERIC(12,2);
    v_allocation_id UUID;
    v_existing_allocation_id UUID;
BEGIN
    -- Get payment details
    SELECT * INTO v_payment FROM uv_payments WHERE id = p_payment_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Payment not found';
    END IF;
    
    -- Get invoice details
    SELECT * INTO v_invoice FROM uv_invoices WHERE id = p_invoice_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invoice not found';
    END IF;
    
    -- Check invoice is not reversed
    IF v_invoice.status = 'reversed' THEN
        RAISE EXCEPTION 'Cannot allocate to a reversed invoice';
    END IF;
    
    -- Check payment and invoice belong to same customer
    IF v_payment.lead_id != (SELECT lead_id FROM uv_sales_orders WHERE id = v_invoice.sales_order_id) THEN
        RAISE EXCEPTION 'Payment and invoice must belong to the same customer';
    END IF;
    
    -- Calculate how much of this payment is already allocated (to ALL invoices)
    SELECT COALESCE(SUM(amount), 0) INTO v_already_allocated_total
    FROM uv_payment_allocations
    WHERE payment_id = p_payment_id;
    
    v_available := v_payment.amount - v_already_allocated_total;
    
    IF p_amount > v_available THEN
        RAISE EXCEPTION 'Insufficient unallocated amount. Available: %', v_available;
    END IF;
    
    -- Check if allocation would exceed invoice balance
    IF p_amount > v_invoice.balance_due THEN
        RAISE EXCEPTION 'Allocation amount exceeds invoice balance due. Balance: %', v_invoice.balance_due;
    END IF;
    
    -- Check if an allocation already exists for this payment-invoice pair
    SELECT id INTO v_existing_allocation_id
    FROM uv_payment_allocations
    WHERE payment_id = p_payment_id AND invoice_id = p_invoice_id;
    
    IF v_existing_allocation_id IS NOT NULL THEN
        -- UPDATE existing allocation by adding the new amount
        UPDATE uv_payment_allocations
        SET amount = amount + p_amount,
            updated_at = NOW()
        WHERE id = v_existing_allocation_id
        RETURNING id INTO v_allocation_id;
    ELSE
        -- INSERT new allocation
        INSERT INTO uv_payment_allocations (payment_id, invoice_id, amount, created_by)
        VALUES (p_payment_id, p_invoice_id, p_amount, p_created_by)
        RETURNING id INTO v_allocation_id;
    END IF;
    
    RETURN v_allocation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add updated_at column if it doesn't exist
ALTER TABLE uv_payment_allocations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

-- Add comment
COMMENT ON FUNCTION allocate_payment_to_invoice IS 
'Allocates payment to invoice. If allocation already exists for this payment-invoice pair, adds to existing amount (UPSERT).';

-- Verify
SELECT 'allocate_payment_to_invoice function updated with UPSERT logic' AS status;

