-- =====================================================
-- PREVENT OVER-ALLOCATION OF PAYMENTS
-- =====================================================
-- This trigger ensures total allocations never exceed payment amount

-- Function to validate allocation doesn't exceed payment amount
CREATE OR REPLACE FUNCTION check_allocation_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_amount NUMERIC;
    v_current_allocated NUMERIC;
    v_new_total NUMERIC;
BEGIN
    -- Get the payment amount
    SELECT amount INTO v_payment_amount
    FROM uv_payments
    WHERE id = NEW.payment_id;
    
    -- Get current total allocated (excluding this record if updating)
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_current_allocated
    FROM uv_payment_allocations
    WHERE payment_id = NEW.payment_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    
    -- Calculate new total
    v_new_total := v_current_allocated + NEW.allocated_amount;
    
    -- Check if exceeds payment amount
    IF v_new_total > v_payment_amount THEN
        RAISE EXCEPTION 'Cannot allocate more than payment amount. Payment: %, Already allocated: %, Trying to add: %, Would exceed by: %',
            v_payment_amount,
            v_current_allocated,
            NEW.allocated_amount,
            v_new_total - v_payment_amount;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_check_allocation_limit ON uv_payment_allocations;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trg_check_allocation_limit
    BEFORE INSERT OR UPDATE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION check_allocation_limit();

-- =====================================================
-- AUTO-UPDATE uv_payments.allocated_amount
-- =====================================================
-- This trigger keeps the allocated_amount in sync

CREATE OR REPLACE FUNCTION sync_payment_allocated_amount()
RETURNS TRIGGER AS $$
DECLARE
    v_payment_id UUID;
    v_total_allocated NUMERIC;
    v_payment_amount NUMERIC;
BEGIN
    -- Get the payment_id (handle INSERT, UPDATE, DELETE)
    IF TG_OP = 'DELETE' THEN
        v_payment_id := OLD.payment_id;
    ELSE
        v_payment_id := NEW.payment_id;
    END IF;
    
    -- Also handle OLD payment_id if it changed during UPDATE
    IF TG_OP = 'UPDATE' AND OLD.payment_id != NEW.payment_id THEN
        -- Update old payment's allocated amount
        SELECT COALESCE(SUM(allocated_amount), 0) INTO v_total_allocated
        FROM uv_payment_allocations
        WHERE payment_id = OLD.payment_id;
        
        SELECT amount INTO v_payment_amount
        FROM uv_payments WHERE id = OLD.payment_id;
        
        UPDATE uv_payments
        SET allocated_amount = v_total_allocated,
            status = CASE 
                WHEN v_total_allocated >= v_payment_amount THEN 'allocated'::uv_payment_status_enum
                WHEN v_total_allocated > 0 THEN 'partially_allocated'::uv_payment_status_enum
                ELSE 'received'::uv_payment_status_enum
            END,
            updated_at = NOW()
        WHERE id = OLD.payment_id;
    END IF;
    
    -- Calculate new total for the current payment
    SELECT COALESCE(SUM(allocated_amount), 0) INTO v_total_allocated
    FROM uv_payment_allocations
    WHERE payment_id = v_payment_id;
    
    -- Get payment amount
    SELECT amount INTO v_payment_amount
    FROM uv_payments WHERE id = v_payment_id;
    
    -- Update payment record
    UPDATE uv_payments
    SET allocated_amount = v_total_allocated,
        status = CASE 
            WHEN v_total_allocated >= v_payment_amount THEN 'allocated'::uv_payment_status_enum
            WHEN v_total_allocated > 0 THEN 'partially_allocated'::uv_payment_status_enum
            ELSE 'received'::uv_payment_status_enum
        END,
        updated_at = NOW()
    WHERE id = v_payment_id;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_sync_payment_allocated ON uv_payment_allocations;

-- Create trigger for INSERT, UPDATE, DELETE
CREATE TRIGGER trg_sync_payment_allocated
    AFTER INSERT OR UPDATE OR DELETE ON uv_payment_allocations
    FOR EACH ROW
    EXECUTE FUNCTION sync_payment_allocated_amount();

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Allocation constraint and sync triggers added successfully!' AS result;

