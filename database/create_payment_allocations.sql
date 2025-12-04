-- =====================================================
-- UV PAYMENT ALLOCATIONS TABLE
-- Links payments to specific reservations/invoices
-- =====================================================

CREATE TABLE IF NOT EXISTS uv_payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    payment_id UUID NOT NULL REFERENCES uv_payments(id) ON DELETE CASCADE,
    reservation_id UUID NOT NULL REFERENCES vehicle_reservations(id) ON DELETE CASCADE,
    
    -- Amount allocated to this reservation
    allocated_amount NUMERIC NOT NULL CHECK (allocated_amount > 0),
    allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Notes
    notes TEXT,
    
    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prevent duplicate allocations (one allocation per payment-reservation pair)
    UNIQUE(payment_id, reservation_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_uv_allocations_payment ON uv_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_uv_allocations_reservation ON uv_payment_allocations(reservation_id);

-- Enable RLS
ALTER TABLE uv_payment_allocations ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view allocations" ON uv_payment_allocations;
CREATE POLICY "Users can view allocations" ON uv_payment_allocations
    FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Admin/Accounts can manage allocations" ON uv_payment_allocations;
CREATE POLICY "Admin/Accounts can manage allocations" ON uv_payment_allocations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() 
            AND role IN ('admin', 'accounts')
        )
    );

-- Success
SELECT 'uv_payment_allocations table created successfully!' AS result;

